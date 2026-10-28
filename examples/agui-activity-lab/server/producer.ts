/**
 * AG-UI activity producer for the lab: a plain `node:http` server that streams
 * AG-UI 1.0 events over SSE and records the action envelopes the consumer posts
 * back.
 *
 * The producer holds no scenario of its own. A scenario (a Playwright flow, a
 * Cucumber step, a person with curl) pushes events through `POST /control/emit`
 * and observes what the consumer sent through `GET /control/envelopes`. Every
 * emitted event is checked against the AG-UI 1.0 schemas first, so the stream
 * the runtime sees is a valid AG-UI stream, not a hand-shaped approximation.
 *
 *   GET  /events?stream=<name>   SSE stream (default stream: "default")
 *   POST /control/emit           { stream?, event, copies? } -> delivers `event`
 *   GET  /control/envelopes      action envelopes received, in order
 *   POST /actions                a consumer's action envelope (idempotent by actionId)
 *   POST /control/reject-next    { rejection } -> the next /actions reply carries it as a stale-action rejection
 *   POST /control/reset          forget envelopes and drop open streams
 *   GET  /health
 */

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { EventSchemas } from "@ag-ui/core/schemas";

const DEFAULT_PORT = 5176;
const DEFAULT_STREAM = "default";
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const MAX_COPIES = 10;

interface ProducerOptions {
  readonly port?: number;
}

interface RecordedEnvelope {
  readonly receivedAt: string;
  readonly actionId: string | undefined;
  readonly duplicate: boolean;
  readonly body: unknown;
}

export interface RunningProducer {
  readonly url: string;
  close(): Promise<void>;
}

class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

function setCors(response: ServerResponse): void {
  // The lab is driven from another local origin (the Vite dev/preview port).
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-headers", "content-type");
  response.setHeader("access-control-allow-methods", "GET,POST,OPTIONS");
}

function sendJson(response: ServerResponse, status: number, payload: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(payload));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new HttpError(413, "Request body is too large.");
    chunks.push(buffer);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new HttpError(400, "Request body is not valid JSON.");
  }
}

function actionIdOf(body: unknown): string | undefined {
  if (!body || typeof body !== "object") return undefined;
  const props = (body as { forwardedProps?: unknown }).forwardedProps;
  const action = props && typeof props === "object" ? (props as { a2uiAction?: unknown }).a2uiAction : undefined;
  const id = action && typeof action === "object" ? (action as { actionId?: unknown }).actionId : undefined;
  return typeof id === "string" ? id : undefined;
}

export function startProducer(options: ProducerOptions = {}): Promise<RunningProducer> {
  const streams = new Map<string, Set<ServerResponse>>();
  const envelopes: RecordedEnvelope[] = [];
  const seenActionIds = new Set<string>();
  const pendingRejections: Record<string, unknown>[] = [];

  function deliver(stream: string, event: unknown, copies: number): number {
    const subscribers = streams.get(stream);
    if (!subscribers) return 0;
    const frame = `data: ${JSON.stringify(event)}\n\n`;
    for (let copy = 0; copy < copies; copy += 1) {
      for (const subscriber of subscribers) subscriber.write(frame);
    }
    return subscribers.size;
  }

  function subscribe(request: IncomingMessage, response: ServerResponse, stream: string): void {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive",
    });
    response.write(": connected\n\n");
    const subscribers = streams.get(stream) ?? new Set<ServerResponse>();
    subscribers.add(response);
    streams.set(stream, subscribers);
    request.on("close", () => subscribers.delete(response));
  }

  async function emit(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const body = (await readJson(request)) as { stream?: unknown; event?: unknown; copies?: unknown };
    const parsed = EventSchemas.safeParse(body.event);
    if (!parsed.success) {
      throw new HttpError(422, `Event is not a valid AG-UI event: ${parsed.error.message}`);
    }
    const copies = typeof body.copies === "number" ? Math.floor(body.copies) : 1;
    if (copies < 1 || copies > MAX_COPIES) throw new HttpError(400, `copies must be 1..${MAX_COPIES}.`);
    const stream = typeof body.stream === "string" ? body.stream : DEFAULT_STREAM;
    // Send the caller's event, not the parsed one: loose schemas may drop fields
    // the lab deliberately carries (surfaceVersions lives in `content`).
    const subscribers = deliver(stream, body.event, copies);
    sendJson(response, 200, { delivered: subscribers, copies });
  }

  async function recordAction(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const body = await readJson(request);
    const actionId = actionIdOf(body);
    const duplicate = actionId !== undefined && seenActionIds.has(actionId);
    if (actionId !== undefined) seenActionIds.add(actionId);
    envelopes.push({ receivedAt: new Date().toISOString(), actionId, duplicate, body });
    const queued = pendingRejections.shift();
    // The rejection answers this action, so it names this action's id.
    const rejection = queued && actionId !== undefined ? { ...queued, actionId } : undefined;
    sendJson(response, 200, { accepted: true, duplicate, ...(rejection ? { rejection } : {}) });
  }

  async function queueRejection(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const body = (await readJson(request)) as { rejection?: unknown };
    if (!body.rejection || typeof body.rejection !== "object") {
      throw new HttpError(400, "rejection must be an object.");
    }
    pendingRejections.push(body.rejection as Record<string, unknown>);
    sendJson(response, 200, { queued: pendingRejections.length });
  }

  function reset(response: ServerResponse): void {
    envelopes.length = 0;
    seenActionIds.clear();
    pendingRejections.length = 0;
    for (const subscribers of streams.values()) {
      for (const subscriber of subscribers) subscriber.end();
    }
    streams.clear();
    sendJson(response, 200, { reset: true });
  }

  async function route(request: IncomingMessage, response: ServerResponse): Promise<void> {
    const url = new URL(request.url ?? "/", "http://localhost");
    const key = `${request.method} ${url.pathname}`;
    switch (key) {
      case "GET /events":
        return subscribe(request, response, url.searchParams.get("stream") ?? DEFAULT_STREAM);
      case "POST /control/emit":
        return emit(request, response);
      case "POST /actions":
        return recordAction(request, response);
      case "GET /control/envelopes":
        return sendJson(response, 200, { envelopes });
      case "POST /control/reject-next":
        return queueRejection(request, response);
      case "POST /control/reset":
        return reset(response);
      case "GET /health":
        return sendJson(response, 200, { ok: true });
      default:
        throw new HttpError(404, `No route for ${key}.`);
    }
  }

  const server: Server = createServer((request, response) => {
    setCors(response);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    route(request, response).catch((error: unknown) => {
      const status = error instanceof HttpError ? error.status : 500;
      const message = error instanceof Error ? error.message : "Unexpected error.";
      if (response.headersSent) return response.end();
      sendJson(response, status, { error: message });
    });
  });

  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port ?? DEFAULT_PORT, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : (options.port ?? DEFAULT_PORT);
      resolve({
        url: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((done) => {
            for (const subscribers of streams.values()) {
              for (const subscriber of subscribers) subscriber.end();
            }
            server.close(() => done());
            server.closeAllConnections();
          }),
      });
    });
  });
}
