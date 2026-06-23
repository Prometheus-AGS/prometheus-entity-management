/**
 * Shared option types for SolidJS entity-graph bindings.
 *
 * These mirror the engine option shapes from @prometheus-ags/entity-graph-core
 * but are scoped to accessor patterns (no React-specific concepts).
 */

import type {
  EntityType,
  EntityId,
  ListState,
  EntityState,
  EntityError,
} from "@prometheus-ags/entity-graph-core";

// ── createEntity options ──────────────────────────────────────────────────────

/**
 * Options for `createEntity`. The `source` accessor is called reactively;
 * changing either `type` or `id` inside it re-triggers the fetch.
 *
 * @template TRaw - Shape returned by the transport fetch function.
 * @template TEntity - Normalized entity shape written to the graph.
 */
export interface CreateEntityOptions<TRaw, TEntity extends object> {
  /** Entity kind (e.g. `"Invoice"`). Drives the graph partition. */
  type: EntityType;
  /** Reactive accessor returning the entity id — return `null` / `undefined` to disable. */
  id: () => EntityId | null | undefined;
  /**
   * Transport fetch function. Receives the resolved `id` and returns raw data.
   * Called by the underlying `createResource`; deduplicated by the core engine.
   */
  fetch: (id: EntityId) => Promise<TRaw>;
  /** Maps raw API response to the canonical shape upserted into the graph. */
  normalize: (raw: TRaw) => TEntity;
  /**
   * Name of the id field inside the normalized entity (default `"id"`).
   * Used when the server-returned id may differ from the request id.
   */
  idField?: string;
  /**
   * Milliseconds before a cached entity is considered stale and a background
   * refetch is triggered (inherits from `configureEngine` when omitted).
   */
  staleTime?: number;
  /** Set to `false` to skip fetching regardless of id presence (default `true`). */
  enabled?: () => boolean;
  /** Called after a successful fetch and graph write. */
  onSuccess?: (entity: TEntity) => void;
  /** Called after all retries are exhausted. */
  onError?: (error: Error) => void;
}

// ── createEntityList options ──────────────────────────────────────────────────

/**
 * Options for `createEntityList`. The `queryKey` accessor is called reactively;
 * changing the key triggers a new list fetch.
 *
 * @template TRaw - Shape of each raw row from the transport.
 * @template TEntity - Normalized entity shape written to the graph.
 */
export interface CreateEntityListOptions<TRaw, TEntity extends object> {
  /** Entity kind for all items in this list. */
  type: EntityType;
  /**
   * Reactive accessor returning the list query key array.
   * Changing any element triggers a re-fetch. Use stable primitive values.
   */
  queryKey: () => unknown[];
  /**
   * Transport fetcher for the full list. Optional for graph-only (e.g. local-first
   * PGlite) scenarios where the graph is hydrated out-of-band.
   */
  fetch?: (params: { cursor?: string; page?: number; pageSize?: number; params?: Record<string, unknown> }) => Promise<{
    items: TRaw[];
    total?: number | null;
    nextCursor?: string | null;
    prevCursor?: string;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
    page?: number;
    pageSize?: number;
  }>;
  /** Row normalizer: maps a raw row to `{ id, data }` for graph upsert. */
  normalize?: (raw: TRaw) => { id: EntityId; data: TEntity };
  /** Replace or append ids on re-fetch (default `"replace"`). */
  mode?: "replace" | "append";
  /** Milliseconds before the list is re-fetched in the background. */
  staleTime?: number;
  /** Reactive accessor; set to `false` to pause fetching (default `true`). */
  enabled?: () => boolean;
  /** Called after a successful list fetch. */
  onSuccess?: (result: { items: TRaw[]; total?: number | null }) => void;
  /** Called after all retries are exhausted. */
  onError?: (error: Error) => void;
}

// ── Return types ──────────────────────────────────────────────────────────────

/**
 * Return value of `createEntity`.
 * All fields are SolidJS signals (fine-grained, no re-render of unrelated parts).
 */
export interface CreateEntityReturn<TEntity extends object> {
  /** The merged entity (canonical + patch overlay) or `null` when not yet loaded. */
  data: () => TEntity | null;
  /** `true` while the initial or background fetch is in-flight. */
  isLoading: () => boolean;
  /** `true` only during background SWR refetch (data already present). */
  isRefetching: () => boolean;
  /** Per-entity fetch error string from the graph, or `null`. */
  error: () => string | null;
  /**
   * Typed `EntityError` instance (`TerminalError` | `TransientError`) so
   * consumers can `instanceof`-check the failure mode without string parsing.
   */
  typedError: () => EntityError | null;
  /** Imperatively trigger a refetch, bypassing staleness checks. */
  refetch: () => Promise<void>;
  /** Raw `EntityState` slice for advanced use (isFetching, stale, lastFetched). */
  entityState: () => EntityState;
}

/**
 * Return value of `createEntityList`.
 * Items are fine-grained: each row is individually reactive via SolidJS signals.
 */
export interface CreateEntityListReturn<TEntity extends object> {
  /** Resolved entity objects in list order (ids joined to graph at read time). */
  items: () => TEntity[];
  /** `true` while the initial list fetch is in-flight. */
  isLoading: () => boolean;
  /** `true` while a "load more" / pagination fetch is in-flight. */
  isLoadingMore: () => boolean;
  /** List fetch error string, or `null`. */
  error: () => string | null;
  /** Typed error instance for `instanceof` checks. */
  typedError: () => EntityError | null;
  /** Total entity count from the server (may be `null` before first fetch). */
  total: () => number | null;
  /** `true` when a next page is available. */
  hasNextPage: () => boolean;
  /** `true` when a previous page is available. */
  hasPrevPage: () => boolean;
  /** Fetch the next page (appends when `mode` is `"append"`). */
  fetchNextPage: () => Promise<void>;
  /** Refetch the list from scratch (replaces ids). */
  refetch: () => Promise<void>;
  /** Raw `ListState` slice for advanced pagination/meta access. */
  listState: () => ListState;
}
