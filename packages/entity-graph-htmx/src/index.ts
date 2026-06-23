/**
 * @prometheus-ags/entity-graph-htmx
 *
 * Node.js SSE fragment server for HTMX. Holds a Prometheus entity graph
 * server-side and streams HTML fragments over Server-Sent Events so HTMX
 * clients can apply idiomorph (morph) or OOB swaps without a full-page
 * reload.
 *
 * Quick start:
 *
 * ```ts
 * import { createHtmxSseServer } from "@prometheus-ags/entity-graph-htmx";
 * import { parseSdlJson }        from "@prometheus-ags/entity-graph-sdl";
 * import { createServer }        from "node:http";
 *
 * const ir = parseSdlJson(JSON.stringify({
 *   version: "1.0",
 *   entities: {
 *     Post: {
 *       fields: {
 *         id:    { type: "uuid",     primary: true },
 *         title: { type: "string",   required: true },
 *         body:  { type: "string"  },
 *       },
 *     },
 *   },
 * }));
 *
 * const sseServer = createHtmxSseServer({ ir });
 *
 * createServer((req, res) => sseServer.handleRequest(req, res)).listen(3000);
 *
 * // Push a change from anywhere in your server code:
 * await sseServer.push({ op: "upsert", type: "Post", id: "1", entity: { id: "1", title: "Hello" } });
 * ```
 */

// ── Core server factory ───────────────────────────────────────────────────────
export { createHtmxSseServer } from "./sse-server.js";

// ── Server-side graph helpers ─────────────────────────────────────────────────
export { createServerGraph } from "./graph-server.js";
export type { ServerGraph } from "./graph-server.js";

// ── Fragment rendering ────────────────────────────────────────────────────────
export { autoRenderEntity, wrapOobFragment, renderFragment } from "./fragment-renderer.js";
export type { RenderFragmentOptions } from "./fragment-renderer.js";

// ── SSE client utilities ──────────────────────────────────────────────────────
export { createSseClient, subscriptionKey, clientSubscribedTo } from "./sse-client.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  SseClient,
  SseEvent,
  FragmentRenderContext,
  FragmentRenderer,
  EntityChangedEvent,
  ChangeOp,
  HtmxSseServerOptions,
  HtmxSseServer,
} from "./types.js";
