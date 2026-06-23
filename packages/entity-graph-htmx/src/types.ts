/**
 * types.ts
 *
 * Shared type surface for the entity-graph-htmx SSE fragment server.
 * No runtime code here — pure type contracts.
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import type { IrEntity, EntityGraphIR } from "@prometheus-ags/entity-graph-sdl";

// ── SSE client lifecycle ──────────────────────────────────────────────────────

/** An active SSE connection to a browser client. */
export interface SseClient {
  readonly id: string;
  /** Entity subscriptions this client has registered, keyed as `type:queryKey`. */
  readonly subscriptions: Set<string>;
  /** Write an SSE event to the response stream. */
  send(event: SseEvent): void;
  /** Close the underlying response stream. */
  close(): void;
}

/** Wire format for one SSE frame. `data` must be a single-line string (newlines escaped). */
export interface SseEvent {
  /** SSE event name (maps to `hx-trigger` on the client). */
  event: string;
  /** Payload — for HTMX morph swaps this is an HTML fragment. */
  data: string;
  /** Optional dedupe id; browsers track the `Last-Event-ID` header. */
  id?: string;
  /** Retry hint in milliseconds sent to the browser on connect. */
  retry?: number;
}

// ── Fragment rendering ────────────────────────────────────────────────────────

/**
 * Context passed to each fragment renderer.
 * Renderers receive the resolved entity data (merged entities + patches) and
 * the IR metadata so they can build type-safe HTML without querying the graph
 * again.
 */
export interface FragmentRenderContext<T extends Record<string, unknown> = Record<string, unknown>> {
  entityType: string;
  entityId: string;
  /** Resolved entity data — canonical entity merged with any local patches. */
  entity: T;
  /** IR metadata for this entity type (fields, relations, primaryKey). */
  ir: IrEntity;
  /** Whether this render is triggered by a realtime change vs. initial fetch. */
  isRealtime: boolean;
}

/**
 * A function that turns an entity snapshot into an HTML string.
 * The output is wrapped in the SSE envelope and pushed to subscribed clients.
 *
 * Return `null` to suppress the SSE event (e.g. when an ACL check fails).
 */
export type FragmentRenderer<T extends Record<string, unknown> = Record<string, unknown>> = (
  ctx: FragmentRenderContext<T>
) => string | null | Promise<string | null>;

// ── Entity change events (internal bus) ──────────────────────────────────────

export type ChangeOp = "upsert" | "delete";

export interface EntityChangedEvent {
  op: ChangeOp;
  type: string;
  id: string;
  /** Resolved entity payload (post-merge). Present for upsert; absent for delete. */
  entity?: Record<string, unknown>;
}

// ── Server options ────────────────────────────────────────────────────────────

/**
 * Options for `createHtmxSseServer`.
 */
export interface HtmxSseServerOptions {
  /**
   * Parsed SDL IR describing the entity schema.
   * Use `parseSdl` / `parseSdlJson` from `@prometheus-ags/entity-graph-sdl`.
   */
  ir: EntityGraphIR;

  /**
   * Fragment renderers keyed by entity type name (case-sensitive, matches SDL).
   * At least one renderer must be registered; unknown types fall back to a
   * JSON-in-pre auto-renderer when `autoRender` is true.
   */
  renderers?: Record<string, FragmentRenderer>;

  /**
   * When true (default), entity types without a registered renderer get an
   * automatic `<dl>` field-list fragment. Set to false for strict mode.
   */
  autoRender?: boolean;

  /**
   * HTMX OOB swap strategy used in the morph event payload.
   * Defaults to `"morph"` (idiomorph). Pass `"outerHTML"` for plain swap.
   *
   * @see https://htmx.org/attributes/hx-swap-oob/
   */
  swapStrategy?: "morph" | "outerHTML" | "innerHTML" | string;

  /**
   * How long (ms) before the SSE connection is considered dead and the client
   * is removed. Defaults to 30 000 (30 s). Set to 0 to disable.
   */
  heartbeatIntervalMs?: number;

  /**
   * Optional request handler for HTMX-triggered mutations (POST/PATCH/DELETE).
   * Called before the built-in fallback (404). Return true if your handler
   * handled the request, false to fall through.
   */
  mutationHandler?: (
    req: IncomingMessage,
    res: ServerResponse,
    pathname: string,
    body: string
  ) => boolean | Promise<boolean>;
}

// ── Server handle ─────────────────────────────────────────────────────────────

/** Returned by `createHtmxSseServer`. */
export interface HtmxSseServer {
  /**
   * Attach to an existing `node:http` IncomingMessage + ServerResponse pair.
   * Useful for embedding inside Express, Fastify raw-mode, Hono node adapter, etc.
   */
  handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;

  /**
   * Push an entity change to all subscribed SSE clients.
   * Call this from your transport upsert callbacks, realtime adapter handlers,
   * or mutation endpoints.
   */
  push(event: EntityChangedEvent): Promise<void>;

  /** Broadcast a raw SSE event to ALL currently connected clients. */
  broadcast(event: SseEvent): void;

  /** Number of currently open SSE connections. */
  readonly clientCount: number;

  /** Gracefully close all open SSE connections and stop the heartbeat. */
  close(): void;
}
