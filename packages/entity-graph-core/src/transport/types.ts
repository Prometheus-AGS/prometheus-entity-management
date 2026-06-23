/**
 * 2.0 transport contract.
 *
 * Why this exists: in 1.x each call site of `useEntityList` /
 * `useEntityView` passed its own `fetch` closure + `normalize`
 * callback. That leaked the transport contract to every consumer and
 * was the structural cause of the Quick Stats trap — each widget could
 * (and did) reinvent the same retry-loop bug.
 *
 * In 2.0 the transport is registered ONCE per entity type at app boot
 * via `registerEntityTransport(type, transport)`. Hooks
 * (`useEntities`, `useEntityQuery`) look up the registered transport
 * by entity type — consumers never pass a fetcher.
 *
 * Transports are pluggable: a built-in `makeRestTransport` covers
 * PostgREST / Supabase; future helpers can cover GraphQL, PGlite-direct,
 * mock-in-memory, etc. The contract is intentionally tiny.
 */

import type { FilterSpec, SortSpec } from "../view/types";

/**
 * Transport-agnostic list query passed by `useEntities` / `useEntityQuery`
 * down to the registered transport.
 *
 * The transport is responsible for compiling this into the
 * transport-specific wire format (HTTP query string, GraphQL variables,
 * SQL WHERE, in-memory predicate, etc.).
 */
export interface ListQuery {
  /** Optional filter; transport-agnostic, see `FilterSpec`. */
  filter?: FilterSpec | null;
  /** Optional sort spec; transport-agnostic. */
  sort?: SortSpec | null;
  /** Free-text search string; transport decides which fields to match. */
  search?: string;
  /** Page size hint. Transport may cap or ignore. */
  limit?: number;
  /** Opaque cursor for pagination (cursor or numeric offset). */
  cursor?: string | number | null;
  /** Aborts the request when fired. Transports MUST honour this. */
  signal?: AbortSignal;
}

/**
 * Page of results returned by `EntityTransport.list`.
 *
 * `total` is `null` when the backend doesn't report it cheaply
 * (consumers should treat as "unknown" rather than "zero").
 *
 * `nextCursor` is `null`/`undefined` when there are no more pages.
 */
export interface ListResult<T> {
  rows: T[];
  total: number | null;
  nextCursor?: string | number | null;
}

/**
 * Operation flavour for a realtime change event.
 */
export type ChangeOp = "insert" | "update" | "delete";

/**
 * Realtime change event emitted by a transport's `subscribe`.
 *
 * For `delete` only `id` is meaningful; `row` MAY be omitted.
 */
export interface ChangeEvent<T> {
  op: ChangeOp;
  id: string;
  row?: T;
}

/**
 * The full per-entity transport contract.
 *
 * One transport per entity type, registered at app boot. The hooks
 * (`useEntities`, `useEntityQuery`) look it up via `getEntityTransport(type)`.
 *
 * Required: `identify`, `authoritative`, `list`.
 * Optional: `get` (for single-row fetches), `subscribe` (for realtime),
 * `staleTime` (hint for SWR).
 */
export interface EntityTransport<T extends object> {
  /**
   * Derive the stable string id of a row. Used by the engine to write
   * into the entity graph under the right id key.
   */
  identify: (row: T) => string;

  /**
   * `true` when the local copy is considered authoritative (e.g. PGlite
   * + Electric Tier-A sync) — consumers can render from cache without
   * a remote round-trip on every mount.
   *
   * `false` when the remote is authoritative (Tier-B REST hybrid) — the
   * cache is a hint, not the truth.
   */
  authoritative: boolean;

  /**
   * Stale-time hint in ms. The engine SWR logic refetches when
   * `Date.now() - lastFetched > staleTime`. Omit to inherit the engine
   * default (30s).
   */
  staleTime?: number;

  /** Fetch a list. The signal in `q.signal` MUST be honoured. */
  list: (q: ListQuery) => Promise<ListResult<T>>;

  /** Fetch a single row by id. Optional. */
  get?: (id: string, signal?: AbortSignal) => Promise<T | null>;

  /**
   * Subscribe to realtime change events for this entity type. Optional.
   *
   * Called by `useEntities` / `useEntityQuery` exactly once per
   * subscriber-bearing key. The returned function MUST tear down all
   * underlying resources (sockets, channels, intervals).
   */
  subscribe?: (onChange: (ev: ChangeEvent<T>) => void) => () => void;
}
