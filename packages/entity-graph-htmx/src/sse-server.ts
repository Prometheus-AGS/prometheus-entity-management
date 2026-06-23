/**
 * sse-server.ts
 *
 * The HTTP request handler + SSE client registry.
 *
 * Route conventions (all configurable via path prefix):
 *
 *   GET  /sse?subscribe=Post:123,Post:*
 *          Opens an SSE stream. The `subscribe` query param is a comma-separated
 *          list of `type:id` or `type:*` tokens.
 *
 *   POST /entities/:type          — create
 *   PUT  /entities/:type/:id      — replace
 *   PATCH /entities/:type/:id     — merge
 *   DELETE /entities/:type/:id    — remove
 *
 * The mutation routes write directly into the server graph and the change-
 * listener bus fans out SSE events to subscribed clients automatically.
 *
 * Layering: this module is Layer 3 (HTTP surface). It depends on
 *   graph-server.ts  (Layer 1) for reads/writes
 *   sse-client.ts    (utility) for per-connection management
 *   fragment-renderer.ts (utility) for HTML generation
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { IrEntity } from "@prometheus-ags/entity-graph-sdl";
import type {
  HtmxSseServer,
  HtmxSseServerOptions,
  SseEvent,
  EntityChangedEvent,
  FragmentRenderContext,
} from "./types.js";
import { createServerGraph } from "./graph-server.js";
import { createSseClient, clientSubscribedTo, subscriptionKey } from "./sse-client.js";
import { renderFragment } from "./fragment-renderer.js";

const DEFAULT_HEARTBEAT_MS = 30_000;
const DEFAULT_SWAP = "morph";

/**
 * Create an HTMX SSE fragment server.
 *
 * ```ts
 * import { createHtmxSseServer } from "@prometheus-ags/entity-graph-htmx";
 * import { parseSdlJson } from "@prometheus-ags/entity-graph-sdl";
 * import { createServer } from "node:http";
 *
 * const ir = parseSdlJson(schemaJson);
 * const sseServer = createHtmxSseServer({ ir });
 *
 * createServer((req, res) => sseServer.handleRequest(req, res)).listen(3000);
 * ```
 */
export function createHtmxSseServer(opts: HtmxSseServerOptions): HtmxSseServer {
  const {
    ir,
    renderers = {},
    autoRender = true,
    swapStrategy = DEFAULT_SWAP,
    heartbeatIntervalMs = DEFAULT_HEARTBEAT_MS,
    mutationHandler,
  } = opts;

  // Index IR entities by name for O(1) lookup.
  const irByType = new Map<string, IrEntity>(
    ir.entities.map((e) => [e.name, e])
  );

  // Server-side entity graph.
  const graph = createServerGraph();

  // Connected SSE clients.
  const clients = new Map<string, ReturnType<typeof createSseClient>>();

  // ── Heartbeat ────────────────────────────────────────────────────────────────

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  if (heartbeatIntervalMs > 0) {
    heartbeatTimer = setInterval(() => {
      const ping: SseEvent = { event: "ping", data: String(Date.now()) };
      for (const client of clients.values()) {
        client.send(ping);
      }
    }, heartbeatIntervalMs);
    // Don't hold the event loop open if the process exits normally.
    if (heartbeatTimer.unref) heartbeatTimer.unref();
  }

  // ── Graph change → SSE fan-out ────────────────────────────────────────────

  graph.onEntityChanged(async (event) => {
    await pushToClients(event);
  });

  async function pushToClients(event: EntityChangedEvent): Promise<void> {
    const { type, id, op, entity } = event;
    const irEntity = irByType.get(type);

    for (const client of clients.values()) {
      if (!clientSubscribedTo(client, type, id)) continue;

      if (op === "delete") {
        client.send({
          event: `entity-deleted`,
          data: JSON.stringify({ type, id }),
          id: `${type}:${id}:delete:${Date.now()}`,
        });
        continue;
      }

      if (!irEntity || !entity) continue;

      const ctx: FragmentRenderContext = {
        entityType: type,
        entityId: id,
        entity,
        ir: irEntity,
        isRealtime: true,
      };

      const html = await renderFragment({
        ctx,
        renderer: renderers[type],
        autoRender,
        swapStrategy,
        ir: irEntity,
      });

      if (html !== null) {
        client.send({
          event: `entity-updated`,
          data: html,
          id: `${type}:${id}:${Date.now()}`,
        });
      }
    }
  }

  // ── HTTP routing ──────────────────────────────────────────────────────────

  async function handleRequest(
    req: IncomingMessage,
    res: ServerResponse
  ): Promise<void> {
    const url = new URL(req.url ?? "/", "http://localhost");
    const pathname = url.pathname;
    const method = (req.method ?? "GET").toUpperCase();

    // SSE connect endpoint
    if (method === "GET" && pathname === "/sse") {
      return handleSseConnect(req, res, url);
    }

    // Mutation endpoints: /entities/:type and /entities/:type/:id
    if (pathname.startsWith("/entities")) {
      return handleMutation(req, res, pathname, method, url);
    }

    // Delegate to caller-supplied handler first.
    if (mutationHandler) {
      const body = await readBody(req);
      const handled = await mutationHandler(req, res, pathname, body);
      if (handled) return;
    }

    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }

  function handleSseConnect(
    req: IncomingMessage,
    res: ServerResponse,
    url: URL
  ): void {
    const client = createSseClient(res);

    // Register subscriptions from query param: ?subscribe=Post:123,Post:*
    const subscribeParam = url.searchParams.get("subscribe") ?? "";
    for (const token of subscribeParam.split(",").map((t: string) => t.trim()).filter(Boolean)) {
      const colonIdx = token.indexOf(":");
      if (colonIdx === -1) continue;
      const type = token.slice(0, colonIdx);
      const id = token.slice(colonIdx + 1);
      if (!type || !id) continue;
      client.subscriptions.add(subscriptionKey(type, id));
    }

    clients.set(client.id, client);

    // Send initial state for each subscription immediately after connect.
    void sendInitialState(client);

    // Clean up when the client disconnects.
    req.on("close", () => {
      client.close();
      clients.delete(client.id);
    });

    // Acknowledge connection.
    client.send({ event: "connected", data: JSON.stringify({ clientId: client.id }), retry: 3000 });
  }

  async function sendInitialState(client: ReturnType<typeof createSseClient>): Promise<void> {
    for (const sub of client.subscriptions) {
      const colonIdx = sub.indexOf(":");
      if (colonIdx === -1) continue;
      const type = sub.slice(0, colonIdx);
      const id = sub.slice(colonIdx + 1);

      if (id === "*") {
        // Wildcard: send all known entities of this type.
        const entities = graph.readEntities(type);
        const irEntity = irByType.get(type);
        if (!irEntity) continue;
        for (const entity of entities) {
          const entityId = String(entity[irEntity.primaryKey] ?? entity.id ?? "");
          if (!entityId) continue;
          await pushToClients({ op: "upsert", type, id: entityId, entity });
        }
      } else {
        const entity = graph.readEntity(type, id);
        if (entity) {
          await pushToClients({ op: "upsert", type, id, entity });
        }
      }
    }
  }

  async function handleMutation(
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    method: string,
    _url: URL
  ): Promise<void> {
    // Parse: /entities/:type  or  /entities/:type/:id
    const parts = pathname.replace(/^\//, "").split("/");
    // parts[0] === "entities"
    const entityType = parts[1];
    const entityId = parts[2];

    if (!entityType) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing entity type" }));
      return;
    }

    const body = await readBody(req);
    let payload: Record<string, unknown> = {};
    if (body) {
      try {
        payload = JSON.parse(body) as Record<string, unknown>;
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Invalid JSON body" }));
        return;
      }
    }

    const irEntity = irByType.get(entityType);
    if (!irEntity) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: `Unknown entity type: ${entityType}` }));
      return;
    }

    const pkField = irEntity.primaryKey;

    try {
      if (method === "POST") {
        // Create: id should be in body or auto-generated.
        const id = String(payload[pkField] ?? payload.id ?? `${Date.now()}`);
        graph.upsertEntity(entityType, id, { ...payload, [pkField]: id });
        res.writeHead(201, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id }));
      } else if (method === "PUT" && entityId) {
        // Full replace.
        graph.replaceEntity(entityType, entityId, payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: entityId }));
      } else if (method === "PATCH" && entityId) {
        // Partial merge.
        graph.upsertEntity(entityType, entityId, payload);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ id: entityId }));
      } else if (method === "DELETE" && entityId) {
        graph.removeEntity(entityType, entityId);
        res.writeHead(204);
        res.end();
      } else {
        res.writeHead(405, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Method not allowed" }));
      }
    } catch (err) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: String(err) }));
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  async function push(event: EntityChangedEvent): Promise<void> {
    const { op, type, id, entity } = event;
    if (op === "delete") {
      graph.removeEntity(type, id);
    } else if (entity) {
      graph.upsertEntity(type, id, entity);
    }
    // The graph's onEntityChanged listener handles the SSE fan-out.
  }

  function broadcast(event: SseEvent): void {
    for (const client of clients.values()) {
      client.send(event);
    }
  }

  function close(): void {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    for (const client of clients.values()) {
      client.close();
    }
    clients.clear();
  }

  return {
    handleRequest,
    push,
    broadcast,
    get clientCount() { return clients.size; },
    close,
  };
}

// ── Utility ───────────────────────────────────────────────────────────────────

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => { chunks.push(chunk); });
    req.on("end", () => { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}
