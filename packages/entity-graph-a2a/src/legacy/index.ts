import { Role, SendMessageRequest, type Message, type Part } from "@a2a-js/sdk";
import {
  PROMETHEUS_GRAPH_EXTENSION_URI,
  type EntityGraphA2ARequest,
  type GraphMutation,
} from "../types.js";
import type { A2AServer } from "../server.js";
import type { A2AJsonRpcResponse, A2AServerCallOptions } from "../types.js";

export interface LegacyJsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Readonly<Record<string, unknown>>;
}

export interface LegacyA2AAdapterOptions {
  server: A2AServer;
  idFactory?: () => string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function graphRequestFromLegacyPart(part: Record<string, unknown>): EntityGraphA2ARequest | null {
  if (part.type === "graph/mutation" && Array.isArray(part.mutations)) {
    return {
      kind: "prometheus.entity-graph.request",
      version: "1.0",
      operation: "mutate",
      mutations: part.mutations as GraphMutation[],
    };
  }
  if (part.type === "graph/query" && typeof part.entityType === "string") {
    return {
      kind: "prometheus.entity-graph.request",
      version: "1.0",
      operation: "query",
      entityType: part.entityType,
      ...(typeof part.id === "string" ? { id: part.id } : {}),
      ...(typeof part.listKey === "string" ? { listKey: part.listKey } : {}),
      ...(typeof part.limit === "number" ? { limit: part.limit } : {}),
    };
  }
  if (part.type === "graph/snapshot") {
    return {
      kind: "prometheus.entity-graph.request",
      version: "1.0",
      operation: "snapshot",
      ...(Array.isArray(part.entityTypes)
        ? { entityTypes: part.entityTypes.filter((item): item is string => typeof item === "string") }
        : {}),
    };
  }
  return null;
}

function legacyParts(parts: unknown): { parts: Part[]; extensions: string[] } {
  const converted: Part[] = [];
  let graphExtension = false;
  for (const candidate of Array.isArray(parts) ? parts : []) {
    if (!isRecord(candidate)) continue;
    const graphRequest = graphRequestFromLegacyPart(candidate);
    if (graphRequest) {
      graphExtension = true;
      converted.push({
        content: { $case: "data", value: graphRequest },
        mediaType: "application/json",
        filename: "",
        metadata: { extensionUri: PROMETHEUS_GRAPH_EXTENSION_URI },
      });
      continue;
    }
    if (candidate.type === "text" && typeof candidate.text === "string") {
      converted.push({
        content: { $case: "text", value: candidate.text },
        mediaType: "text/plain",
        filename: "",
        metadata: {},
      });
      continue;
    }
    if (candidate.type === "data" && isRecord(candidate.data)) {
      converted.push({
        content: { $case: "data", value: candidate.data },
        mediaType: typeof candidate.mediaType === "string" ? candidate.mediaType : "application/json",
        filename: "",
        metadata: {},
      });
    }
  }
  return {
    parts: converted,
    extensions: graphExtension ? [PROMETHEUS_GRAPH_EXTENSION_URI] : [],
  };
}

/**
 * Explicit migration adapter for the pre-v3 slash-method JSON-RPC surface.
 * It is intentionally available only from `@prometheus-ags/entity-graph-a2a/legacy`.
 */
export class LegacyA2AAdapter {
  private readonly server: A2AServer;
  private readonly idFactory: () => string;
  private readonly taskIds = new Map<string, string>();
  private fallbackId = 0;

  constructor(options: LegacyA2AAdapterOptions) {
    this.server = options.server;
    this.idFactory = options.idFactory ?? (() => {
      if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
      this.fallbackId += 1;
      return `legacy-a2a-${this.fallbackId}`;
    });
  }

  async handleRequest(
    request: LegacyJsonRpcRequest,
    callOptions: A2AServerCallOptions = {},
  ): Promise<A2AJsonRpcResponse> {
    const translated = this.translate(request);
    if (!("request" in translated)) return translated;
    const response = await this.server.handleRequest(translated.request, callOptions);
    if (typeof (response as AsyncGenerator<unknown>)[Symbol.asyncIterator] === "function") {
      return this.error(request.id, -32601, "Legacy streaming is not supported; migrate to SendStreamingMessage.");
    }
    const envelope = response as A2AJsonRpcResponse;
    const task = isRecord(envelope.result) && isRecord(envelope.result.task)
      ? envelope.result.task
      : undefined;
    if (translated.legacyTaskId && task && typeof task.id === "string") {
      this.taskIds.set(translated.legacyTaskId, task.id);
    }
    return envelope;
  }

  private translate(request: LegacyJsonRpcRequest):
    | { request: Record<string, unknown>; legacyTaskId?: string }
    | A2AJsonRpcResponse {
    const params = request.params ?? {};
    if (request.method === "tasks/sendSubscribe") {
      return this.error(request.id, -32601, "Migrate to the official SendStreamingMessage method and SSE transport.");
    }
    if (request.method === "tasks/get" || request.method === "tasks/cancel") {
      if (typeof params.id !== "string" || params.id.length === 0) {
        return this.error(request.id, -32602, "params.id is required.");
      }
      return {
        request: {
          jsonrpc: "2.0",
          id: request.id,
          method: request.method === "tasks/get" ? "GetTask" : "CancelTask",
          params: {
            tenant: "",
            id: this.taskIds.get(params.id) ?? params.id,
            ...(request.method === "tasks/get" && typeof params.historyLength === "number"
              ? { historyLength: params.historyLength }
              : {}),
          },
        },
      };
    }
    if (request.method !== "tasks/send") {
      return this.error(request.id, -32601, `Unsupported legacy method: ${request.method}.`);
    }
    if (typeof params.id !== "string" || !isRecord(params.message)) {
      return this.error(request.id, -32602, "params.id and params.message are required.");
    }
    const converted = legacyParts(params.message.parts);
    if (converted.parts.length === 0) {
      return this.error(request.id, -32602, "params.message.parts must contain supported content.");
    }
    const existingTaskId = this.taskIds.get(params.id) ?? "";
    const message: Message = {
      role: Role.ROLE_USER,
      messageId: this.idFactory(),
      taskId: existingTaskId,
      contextId: "",
      parts: converted.parts,
      metadata: {},
      extensions: converted.extensions,
      referenceTaskIds: [],
    };
    return {
      request: {
        jsonrpc: "2.0",
        id: request.id,
        method: "SendMessage",
        params: SendMessageRequest.toJSON({
          tenant: "",
          message,
          configuration: undefined,
          metadata: {},
        }),
      },
      legacyTaskId: params.id,
    };
  }

  private error(id: string | number | null, code: number, message: string): A2AJsonRpcResponse {
    return { jsonrpc: "2.0", id, error: { code, message } };
  }
}

export function createLegacyA2AAdapter(options: LegacyA2AAdapterOptions): LegacyA2AAdapter {
  return new LegacyA2AAdapter(options);
}
