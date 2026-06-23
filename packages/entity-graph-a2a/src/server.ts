/**
 * server.ts — A2A v1.0 server core.
 *
 * Provides:
 *   createA2AServer(opts)  → A2AServer instance
 *
 * The A2AServer:
 *   - Manages task lifecycle (create → working → completed/failed/canceled)
 *   - Dispatches task messages to the configured A2ATaskHandler
 *   - Exposes handleRequest(req) — a framework-agnostic JSON-RPC dispatcher
 *   - Exposes fetch(request) — a standard Web Fetch API handler (Cloudflare
 *     Workers, Deno, Bun, Next.js Edge, Hono, etc.)
 *
 * The server does NOT depend on Node.js http module. Framework adapters are the
 * caller's responsibility (use handleRequest() from Express/Fastify/Hono/Next.js).
 *
 * Architecture:
 *   Request → handleRequest → dispatch by method → task store → handler → response
 *
 * Error handling:
 *   - Unknown method   → JSON-RPC code -32601 (Method not found)
 *   - Task not found   → JSON-RPC code -32001 (custom)
 *   - Handler error    → task status "failed" + JSON-RPC code -32000
 *   - Parse error      → JSON-RPC code -32700
 */

import { MemoryTaskStore } from "./store.js";
import { DefaultEntityGraphHandler } from "./handler.js";
import type {
  A2AServerOptions,
  A2ATaskHandler,
  A2ATaskStore,
  AgentCard,
  Artifact,
  CancelTaskParams,
  GetTaskParams,
  JsonRpcError,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
  Message,
  SendTaskParams,
  SendTaskResult,
  Task,
  TaskStatus,
} from "./types.js";

// ── JSON-RPC helpers ──────────────────────────────────────────────────────────

function success<T>(id: JsonRpcRequest["id"], result: T): JsonRpcSuccess<T> {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(
  id: JsonRpcRequest["id"],
  code: number,
  message: string,
  data?: unknown,
): JsonRpcError {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

const ERR_PARSE = -32700;
const ERR_METHOD_NOT_FOUND = -32601;
const ERR_INVALID_PARAMS = -32602;
const ERR_TASK_NOT_FOUND = -32001;
const ERR_INTERNAL = -32000;

// ── Task factory ──────────────────────────────────────────────────────────────

function makeTask(params: SendTaskParams): Task {
  const now = new Date().toISOString();
  return {
    id: params.id,
    sessionId: params.sessionId,
    status: { state: "submitted", updatedAt: now },
    history: [],
    artifacts: [],
    createdAt: now,
    updatedAt: now,
    metadata: params.metadata,
  };
}

function withStatus(task: Task, status: Pick<TaskStatus, "state" | "message">): Task {
  const now = new Date().toISOString();
  return {
    ...task,
    status: { ...status, updatedAt: now },
    updatedAt: now,
  };
}

function appendMessage(task: Task, message: Message): Task {
  return {
    ...task,
    history: [
      ...task.history,
      { ...message, timestamp: new Date().toISOString() },
    ],
    updatedAt: new Date().toISOString(),
  };
}

function appendArtifacts(task: Task, artifacts: Artifact[]): Task {
  if (artifacts.length === 0) return task;
  return {
    ...task,
    artifacts: [...task.artifacts, ...artifacts],
    updatedAt: new Date().toISOString(),
  };
}

// ── A2AServer ─────────────────────────────────────────────────────────────────

/**
 * A2AServer — the entity-graph A2A server instance.
 *
 * Use `createA2AServer(opts)` to instantiate.
 */
export class A2AServer {
  private readonly card: AgentCard;
  private readonly handler: A2ATaskHandler;
  private readonly store: A2ATaskStore;

  constructor(opts: A2AServerOptions) {
    this.card = opts.card;
    this.handler = opts.handler ?? new DefaultEntityGraphHandler();
    this.store = opts.store ?? new MemoryTaskStore();
  }

  /** Return the AgentCard (serve this at GET /.well-known/agent.json). */
  getCard(): AgentCard {
    return this.card;
  }

  // ── JSON-RPC dispatcher ───────────────────────────────────────────────────

  /**
   * Dispatch a raw JSON-RPC request object.
   * Framework-agnostic — call from any HTTP handler.
   */
  async handleRequest(raw: unknown): Promise<JsonRpcResponse> {
    // Parse / validate the request envelope.
    let req: JsonRpcRequest;
    try {
      req = parseJsonRpcRequest(raw);
    } catch (err) {
      return rpcError(null, ERR_PARSE, "Parse error", String(err));
    }

    switch (req.method) {
      case "tasks/send":
        return this.handleTasksSend(req);
      case "tasks/get":
        return this.handleTasksGet(req);
      case "tasks/cancel":
        return this.handleTasksCancel(req);
      case "tasks/sendSubscribe":
        // Streaming is out of scope for the initial implementation.
        // Callers should use tasks/send and poll tasks/get.
        return rpcError(req.id, ERR_METHOD_NOT_FOUND, "tasks/sendSubscribe is not supported — use tasks/send + tasks/get polling.");
      default:
        return rpcError(req.id, ERR_METHOD_NOT_FOUND, `Method not found: ${req.method}`);
    }
  }

  /**
   * Web Fetch API handler.
   * Mount at any route in your server framework.
   *
   * Routes:
   *   GET  /.well-known/agent.json → AgentCard
   *   POST /tasks                  → JSON-RPC dispatcher
   *
   * @example (Hono)
   * ```ts
   * app.use("/a2a/*", (c) => server.fetch(c.req.raw));
   * ```
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // AgentCard discovery endpoint.
    if (request.method === "GET" && url.pathname.endsWith("/.well-known/agent.json")) {
      return new Response(JSON.stringify(this.card, null, 2), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // JSON-RPC task endpoint.
    if (request.method === "POST") {
      let body: unknown;
      try {
        body = await request.json();
      } catch {
        const err = rpcError(null, ERR_PARSE, "Invalid JSON body");
        return new Response(JSON.stringify(err), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      const response = await this.handleRequest(body);
      const status = "error" in response ? 400 : 200;
      return new Response(JSON.stringify(response), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response("Not Found", { status: 404 });
  }

  // ── Method handlers ───────────────────────────────────────────────────────

  private async handleTasksSend(req: JsonRpcRequest): Promise<JsonRpcResponse<SendTaskResult>> {
    const params = req.params as SendTaskParams | undefined;
    if (!isValidSendTaskParams(params)) {
      return rpcError(req.id, ERR_INVALID_PARAMS, "tasks/send requires params.id (string) and params.message (object)");
    }

    // Fetch or create task.
    let task = await this.store.get(params.id);
    if (task === null) {
      task = makeTask(params);
    }

    // Append the incoming message and set status to "working".
    task = appendMessage(task, params.message);
    task = withStatus(task, { state: "working" });
    await this.store.set(task);

    // Dispatch to handler.
    try {
      const { useGraphStore } = await import("@prometheus-ags/entity-graph-core");
      const ctx = {
        task,
        message: params.message,
        graphState: useGraphStore.getState(),
      };

      const result = await this.handler.handle(ctx);

      // Apply handler result.
      task = withStatus(task, result.status);
      if (result.artifacts && result.artifacts.length > 0) {
        task = appendArtifacts(task, result.artifacts);
      }
      if (result.reply !== undefined) {
        task = appendMessage(task, {
          ...result.reply,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      task = withStatus(task, {
        state: "failed",
        message: err instanceof Error ? err.message : String(err),
      });
      await this.store.set(task);
      return rpcError(
        req.id,
        ERR_INTERNAL,
        "Task handler error",
        err instanceof Error ? err.message : String(err),
      );
    }

    await this.store.set(task);
    return success(req.id, { task });
  }

  private async handleTasksGet(req: JsonRpcRequest): Promise<JsonRpcResponse<{ task: Task }>> {
    const params = req.params as GetTaskParams | undefined;
    if (typeof params?.id !== "string") {
      return rpcError(req.id, ERR_INVALID_PARAMS, "tasks/get requires params.id (string)");
    }

    const task = await this.store.get(params.id);
    if (task === null) {
      return rpcError(req.id, ERR_TASK_NOT_FOUND, `Task not found: ${params.id}`);
    }

    // Trim history if historyLength is specified.
    const trimmedTask: Task =
      params.historyLength !== undefined
        ? { ...task, history: task.history.slice(-params.historyLength) }
        : task;

    return success(req.id, { task: trimmedTask });
  }

  private async handleTasksCancel(req: JsonRpcRequest): Promise<JsonRpcResponse<{ task: Task }>> {
    const params = req.params as CancelTaskParams | undefined;
    if (typeof params?.id !== "string") {
      return rpcError(req.id, ERR_INVALID_PARAMS, "tasks/cancel requires params.id (string)");
    }

    const task = await this.store.get(params.id);
    if (task === null) {
      return rpcError(req.id, ERR_TASK_NOT_FOUND, `Task not found: ${params.id}`);
    }

    if (task.status.state === "completed" || task.status.state === "failed") {
      return rpcError(
        req.id,
        ERR_INVALID_PARAMS,
        `Cannot cancel a task in state "${task.status.state}"`,
      );
    }

    const canceled = withStatus(task, { state: "canceled" });
    await this.store.set(canceled);
    return success(req.id, { task: canceled });
  }
}

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * Create an A2A entity-graph server instance.
 *
 * @example
 * ```ts
 * import { createA2AServer, buildAgentCard, DefaultEntityGraphHandler } from "@prometheus-ags/entity-graph-a2a";
 *
 * const server = createA2AServer({
 *   card: buildAgentCard({ url: "https://api.example.com/a2a" }),
 *   handler: new DefaultEntityGraphHandler(),
 * });
 *
 * // Hono / Cloudflare Workers
 * export default { fetch: (req) => server.fetch(req) };
 * ```
 */
export function createA2AServer(opts: A2AServerOptions): A2AServer {
  return new A2AServer(opts);
}

// ── Validation helpers ────────────────────────────────────────────────────────

function parseJsonRpcRequest(raw: unknown): JsonRpcRequest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Request must be a JSON object");
  }
  const obj = raw as Record<string, unknown>;
  if (obj["jsonrpc"] !== "2.0") {
    throw new Error('Request must have jsonrpc: "2.0"');
  }
  if (typeof obj["method"] !== "string") {
    throw new Error("Request must have a string method");
  }
  return raw as JsonRpcRequest;
}

function isValidSendTaskParams(params: unknown): params is SendTaskParams {
  if (typeof params !== "object" || params === null) return false;
  const p = params as Record<string, unknown>;
  return typeof p["id"] === "string" && typeof p["message"] === "object" && p["message"] !== null;
}
