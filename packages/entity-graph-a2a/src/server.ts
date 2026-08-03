import {
  A2A_PROTOCOL_VERSION,
  A2A_VERSION_HEADER,
  AGENT_CARD_PATH,
  AgentCard as AgentCardCodec,
  Extensions,
  HTTP_EXTENSION_HEADER,
  SSE_HEADERS,
  SendMessageRequest,
  formatSSEErrorEvent,
  formatSSEEvent,
  type AgentCard,
  type Message,
} from "@a2a-js/sdk";
import {
  JsonRpcTransportHandler,
  DefaultRequestHandler,
  InMemoryTaskStore,
  ServerCallContext,
  validateVersion,
  type AgentExecutor,
  type TaskStore,
  type User,
} from "@a2a-js/sdk/server";
import {
  JsonRpcContentTypeNotSupportedError,
  toJsonRpcError,
} from "@a2a-js/sdk/errors";
import { createDeterministicEntityGraphExecutor, A2A_CALLER_STATE_KEY } from "./handler.js";
import { ANONYMOUS_A2A_CALLER, createDefaultDenyA2APolicy } from "./policy.js";
import type {
  A2AApplicationPolicy,
  A2AAuthenticator,
  A2ACaller,
  A2AJsonRpcResponse,
  A2AServerCallOptions,
  DeterministicExecutorOptions,
} from "./types.js";

const DEFAULT_MAX_BODY_BYTES = 1024 * 1024;

function weakEtag(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return `W/"${value.length.toString(16)}-${(hash >>> 0).toString(16)}"`;
}

export class A2AAccessDeniedError extends Error {
  readonly status: 401 | 403;

  constructor(status: 401 | 403) {
    super(status === 401 ? "Authentication required." : "Request is not accessible.");
    this.name = "A2AAccessDeniedError";
    this.status = status;
  }
}

class CallerUser implements User {
  constructor(private readonly caller: A2ACaller) {}

  get isAuthenticated(): boolean {
    return this.caller.isAuthenticated;
  }

  get userName(): string {
    return this.caller.id;
  }
}

export interface A2AServerOptions {
  card: AgentCard;
  executor?: AgentExecutor;
  taskStore?: TaskStore;
  authenticator?: A2AAuthenticator;
  policy?: A2AApplicationPolicy;
  deterministicExecutor?: Omit<DeterministicExecutorOptions, "policy">;
  maxBodyBytes?: number;
}

interface DispatchResult {
  response: A2AJsonRpcResponse | AsyncGenerator<A2AJsonRpcResponse, void, undefined>;
  context: ServerCallContext;
}

interface RequestMetadata {
  id: string | number | null;
  method: string;
  tenantId?: string;
  metadata?: Readonly<Record<string, unknown>>;
  message?: Message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAsyncGenerator(
  value: A2AJsonRpcResponse | AsyncGenerator<A2AJsonRpcResponse, void, undefined>,
): value is AsyncGenerator<A2AJsonRpcResponse, void, undefined> {
  return typeof (value as AsyncGenerator<A2AJsonRpcResponse>)[Symbol.asyncIterator] === "function";
}

function normalizeHeaders(
  headers: Readonly<Record<string, string>> | undefined,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers ?? {})) {
    result[key.toLowerCase()] = value;
  }
  return result;
}

function requestMetadata(raw: unknown): RequestMetadata | null {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!isRecord(parsed) || typeof parsed.method !== "string") return null;
  const params = isRecord(parsed.params) ? parsed.params : undefined;
  let message: Message | undefined;
  if (
    (parsed.method === "SendMessage" || parsed.method === "SendStreamingMessage") &&
    params
  ) {
    try {
      message = SendMessageRequest.fromJSON(params).message;
    } catch {
      message = undefined;
    }
  }
  const id = parsed.id;
  return {
    id:
      typeof id === "string" || (typeof id === "number" && Number.isInteger(id)) || id === null
        ? id
        : null,
    method: parsed.method,
    tenantId: typeof params?.tenant === "string" && params.tenant
      ? params.tenant
      : undefined,
    metadata: isRecord(params?.metadata) ? params.metadata : undefined,
    message,
  };
}

/** Fetch-compatible official A2A v1 JSON-RPC server. */
export class A2AServer {
  private readonly card: AgentCard;
  private readonly policy: A2AApplicationPolicy;
  private readonly authenticator?: A2AAuthenticator;
  private readonly transport: JsonRpcTransportHandler;
  private readonly maxBodyBytes: number;
  private readonly endpointPath: string;
  private readonly cardJson: string;
  private readonly cardEtag: string;
  private readonly cardLastModified: string;

  constructor(options: A2AServerOptions) {
    this.card = structuredClone(options.card);
    this.cardJson = JSON.stringify(AgentCardCodec.toJSON(this.card), null, 2);
    this.cardEtag = weakEtag(this.cardJson);
    this.cardLastModified = new Date().toUTCString();
    this.policy = options.policy ?? createDefaultDenyA2APolicy();
    this.authenticator = options.authenticator;
    this.maxBodyBytes = options.maxBodyBytes ?? DEFAULT_MAX_BODY_BYTES;
    if (!Number.isInteger(this.maxBodyBytes) || this.maxBodyBytes < 1) {
      throw new Error("maxBodyBytes must be a positive integer.");
    }

    const jsonRpcInterface = this.card.supportedInterfaces.find(
      (entry) => entry.protocolBinding.toUpperCase() === "JSONRPC",
    );
    if (!jsonRpcInterface || jsonRpcInterface.protocolVersion !== A2A_PROTOCOL_VERSION) {
      throw new Error("The server card must declare a JSONRPC interface at A2A protocol 1.0.");
    }
    this.endpointPath = new URL(jsonRpcInterface.url).pathname || "/";
    if (this.card.securityRequirements.length > 0 && !this.authenticator) {
      throw new Error("AgentCard security requirements need an A2AAuthenticator.");
    }

    const executor = options.executor ?? createDeterministicEntityGraphExecutor({
      ...options.deterministicExecutor,
      policy: this.policy,
    });
    const requestHandler = new DefaultRequestHandler(
      this.card,
      options.taskStore ?? new InMemoryTaskStore(),
      executor,
    );
    this.transport = new JsonRpcTransportHandler(requestHandler);
  }

  getCard(): AgentCard {
    return structuredClone(this.card);
  }

  async handleRequest(
    raw: string | Record<string, unknown>,
    options: A2AServerCallOptions = {},
  ): Promise<A2AJsonRpcResponse | AsyncGenerator<A2AJsonRpcResponse, void, undefined>> {
    return (await this.dispatch(raw, options)).response;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === `/${AGENT_CARD_PATH}`) {
      if (request.headers.get("if-none-match") === this.cardEtag) {
        return new Response(null, {
          status: 304,
          headers: {
            ETag: this.cardEtag,
            "Cache-Control": "public, max-age=300",
          },
        });
      }
      return new Response(this.cardJson, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=300",
          ETag: this.cardEtag,
          "Last-Modified": this.cardLastModified,
          [A2A_VERSION_HEADER]: A2A_PROTOCOL_VERSION,
        },
      });
    }

    if (request.method !== "POST" || url.pathname !== this.endpointPath) {
      return new Response("Not Found", { status: 404 });
    }
    const contentType = request.headers.get("content-type")?.split(";", 1)[0].trim();
    if (contentType !== "application/json") {
      return Response.json({
        jsonrpc: "2.0",
        id: null,
        error: toJsonRpcError(
          new JsonRpcContentTypeNotSupportedError({
            message: "Content-Type must be application/json.",
          }),
        ),
      }, { status: 415 });
    }
    const contentLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(contentLength) && contentLength > this.maxBodyBytes) {
      return Response.json({ error: "request-too-large" }, { status: 413 });
    }

    let caller = ANONYMOUS_A2A_CALLER;
    if (this.authenticator) {
      caller = (await this.authenticator.authenticate({ request })) ?? ANONYMOUS_A2A_CALLER;
      if (!caller.isAuthenticated) {
        return Response.json(
          { error: "authentication-required" },
          {
            status: 401,
            headers: { "WWW-Authenticate": "Bearer" },
          },
        );
      }
    }

    const body = await request.text();
    if (new TextEncoder().encode(body).byteLength > this.maxBodyBytes) {
      return Response.json({ error: "request-too-large" }, { status: 413 });
    }

    const headers = Object.fromEntries(request.headers.entries());
    try {
      const requestedExtensions = Extensions.parseServiceParameter(
        request.headers.get(HTTP_EXTENSION_HEADER) ?? undefined,
      );
      const dispatched = await this.dispatch(body, {
        caller,
        headers,
        requestedVersion: request.headers.get(A2A_VERSION_HEADER) ?? "0.3",
        requestedExtensions,
      });
      if (isAsyncGenerator(dispatched.response)) {
        const generator = dispatched.response;
        const metadata = requestMetadata(body);
        let first;
        try {
          first = await generator.next();
        } catch (error) {
          return Response.json({
            jsonrpc: "2.0",
            id: metadata?.id ?? null,
            error: JsonRpcTransportHandler.mapToJSONRPCError(error),
          }, {
            status: 200,
            headers: { [A2A_VERSION_HEADER]: A2A_PROTOCOL_VERSION },
          });
        }
        const streamExtensions = dispatched.context.activatedExtensions ?? [];
        const extensionHeader = streamExtensions.length
          ? Extensions.toServiceParameter(streamExtensions)
          : undefined;
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const encoder = new TextEncoder();
            try {
              if (!first.done) {
                controller.enqueue(encoder.encode(formatSSEEvent(first.value)));
              }
              for await (const response of generator) {
                controller.enqueue(encoder.encode(formatSSEEvent(response)));
              }
            } catch (error) {
              controller.enqueue(encoder.encode(formatSSEErrorEvent({
                jsonrpc: "2.0",
                id: metadata?.id ?? null,
                error: JsonRpcTransportHandler.mapToJSONRPCError(error),
              })));
            } finally {
              controller.close();
            }
          },
          async cancel() {
            await generator.return(undefined);
          },
        });
        return new Response(stream, {
          status: 200,
          headers: {
            ...SSE_HEADERS,
            [A2A_VERSION_HEADER]: A2A_PROTOCOL_VERSION,
            ...(extensionHeader ? { [HTTP_EXTENSION_HEADER]: extensionHeader } : {}),
          },
        });
      }

      const responseExtensions = dispatched.context.activatedExtensions ?? [];
      const extensionHeader = responseExtensions.length
        ? Extensions.toServiceParameter(responseExtensions)
        : undefined;
      return new Response(JSON.stringify(dispatched.response), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          [A2A_VERSION_HEADER]: A2A_PROTOCOL_VERSION,
          ...(extensionHeader ? { [HTTP_EXTENSION_HEADER]: extensionHeader } : {}),
        },
      });
    } catch (error) {
      if (error instanceof A2AAccessDeniedError) {
        return Response.json(
          { error: error.status === 401 ? "authentication-required" : "forbidden" },
          { status: error.status },
        );
      }
      throw error;
    }
  }

  private async dispatch(
    raw: string | Record<string, unknown>,
    options: A2AServerCallOptions,
  ): Promise<DispatchResult> {
    if (typeof raw === "string") {
      try {
        JSON.parse(raw);
      } catch {
        return {
          response: {
            jsonrpc: "2.0",
            id: null,
            error: { code: -32700, message: "Parse error" },
          },
          context: new ServerCallContext({
            requestedVersion: options.requestedVersion ?? A2A_PROTOCOL_VERSION,
          }),
        };
      }
    }
    const metadata = requestMetadata(raw);
    const requestedVersion = options.requestedVersion ?? A2A_PROTOCOL_VERSION;
    try {
      validateVersion(requestedVersion, this.card, "JSONRPC");
    } catch (error) {
      return {
        response: {
          jsonrpc: "2.0",
          id: metadata?.id ?? null,
          error: JsonRpcTransportHandler.mapToJSONRPCError(error),
        },
        context: new ServerCallContext({ requestedVersion }),
      };
    }

    const caller = options.caller ?? ANONYMOUS_A2A_CALLER;
    if (metadata) {
      const decision = await this.policy.authorizeRequest({
        caller,
        method: metadata.method,
        tenantId: options.tenantId ?? metadata.tenantId,
        message: metadata.message,
        metadata: metadata.metadata,
      });
      if (!decision.allowed) {
        throw new A2AAccessDeniedError(caller.isAuthenticated ? 403 : 401);
      }
    }

    const state = new Map<string, unknown>([
      [A2A_CALLER_STATE_KEY, caller],
      ["headers", normalizeHeaders(options.headers)],
    ]);
    const context = new ServerCallContext({
      requestedExtensions: [...(options.requestedExtensions ?? [])],
      requestedVersion,
      tenant: options.tenantId ?? metadata?.tenantId,
      user: new CallerUser(caller),
      state,
    });
    const response = await this.transport.handle(raw, context);
    return {
      response: response as A2AJsonRpcResponse | AsyncGenerator<A2AJsonRpcResponse, void, undefined>,
      context,
    };
  }
}

export function createA2AServer(options: A2AServerOptions): A2AServer {
  return new A2AServer(options);
}
