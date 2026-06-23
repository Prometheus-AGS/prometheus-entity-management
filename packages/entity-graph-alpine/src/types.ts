/**
 * types.ts — public surface types for @prometheus-ags/entity-graph-alpine.
 *
 * Kept separate so the plugin implementation and the Alpine type helpers can
 * import from a single source of truth without circular refs.
 *
 * NOTE: alpinejs 3.x ships without bundled TypeScript declarations. The module
 * augmentation block below is intentionally omitted to avoid a "cannot augment
 * untyped module" TS error. Consumers who want typed `$entity` / `$entityList`
 * in their own `.ts` files should add a local `.d.ts` shim using the interface
 * shapes exported here (see README).
 */

import type { EntityType, EntityId, ListState } from "@prometheus-ags/entity-graph-core";

// ── $entity magic return type ─────────────────────────────────────────────────

/**
 * Reactive snapshot returned by `$entity(type, id)`.
 *
 * All properties are plain JS values tracked through Alpine.reactive().
 * Reading a property inside an Alpine `x-effect`, `x-text`, or `:bind`
 * expression registers it as a dependency — mutations to the underlying graph
 * slice update the property and re-run the dependent expression.
 */
export interface AlpineEntitySnapshot<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Merged entity data (`entities[type][id]` + `patches[type][id]`), or `null` when not yet loaded. */
  data: T | null;
  /** `true` while a network fetch is in flight. */
  isLoading: boolean;
  /** Non-null when the last fetch ended with an error. */
  error: string | null;
  /** `true` when data is present AND no fetch is in flight. */
  readonly isReady: boolean;
  /** Imperatively invalidate + refetch this entity. */
  refetch(): void;
  /** Release graph subscription. Called automatically when the Alpine component is destroyed. */
  destroy(): void;
}

// ── $entityList magic return type ─────────────────────────────────────────────

/**
 * Reactive snapshot returned by `$entityList(type, query)`.
 *
 * Items are derived by joining list `ids` against `entities[type]` at read
 * time — the same cross-view reactivity guarantee the React / Svelte bindings
 * provide: updating an entity in one place instantly updates every list
 * containing it.
 */
export interface AlpineEntityList<T extends Record<string, unknown> = Record<string, unknown>> {
  /** Resolved, merged entity rows in the list's current sort order. */
  items: T[];
  /** `true` while the initial page is loading. */
  isLoading: boolean;
  /** `true` while an additional page is loading (load-more / infinite scroll). */
  isLoadingMore: boolean;
  /** Non-null when the last list fetch ended with an error. */
  error: string | null;
  /** `true` when the server reported additional pages. */
  hasNextPage: boolean;
  /** Server-reported total row count, or `null` when the backend does not provide it. */
  total: number | null;
  /** Fetch the next page and append results. No-op when `!hasNextPage`. */
  loadMore(): void;
  /** Invalidate and re-fetch the list from the first page. */
  refetch(): void;
  /** Release graph subscription and clean up. */
  destroy(): void;
}

// ── Query options for $entityList ─────────────────────────────────────────────

/**
 * Inline query options accepted by `$entityList(type, query)`.
 *
 * Mirrors `ListQueryOptions` from core but exposes only the subset that makes
 * sense to pass inline from an Alpine template attribute. Fetch logic is
 * provided by the transport registered via `registerEntityTransport` at boot.
 */
export interface AlpineListQuery {
  /**
   * Stable cache key for this query. Used to deduplicate in-flight requests
   * and to identify the list slot in the graph. Supply a string or an array
   * that will be JSON-stringified.
   */
  queryKey: unknown[] | string;
  /**
   * Transport-agnostic filter. Compiled by the registered transport into
   * REST params / SQL WHERE / GraphQL variables as appropriate.
   */
  filter?: Record<string, unknown>;
  /** Free-text search forwarded to the registered transport. */
  search?: string;
  /** Initial page size. */
  limit?: number;
  /** Whether to fire the fetch immediately (default `true`). */
  enabled?: boolean;
  /** Staleness threshold in ms. Overrides engine default when provided. */
  staleTime?: number;
}

// ── Alpine plugin options ─────────────────────────────────────────────────────

/**
 * Options accepted by `EntityGraphAlpinePlugin` / `createEntityGraphPlugin`.
 */
export interface EntityGraphAlpinePluginOptions {
  /**
   * Custom name for the entity magic (default: `"$entity"`).
   * Useful when integrating alongside other plugins that claim the same name.
   */
  entityMagicName?: string;
  /**
   * Custom name for the list magic (default: `"$entityList"`).
   */
  listMagicName?: string;
}

export type { EntityType, EntityId, ListState };
