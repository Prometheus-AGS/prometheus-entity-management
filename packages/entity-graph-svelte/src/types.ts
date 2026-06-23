/**
 * Public types for `@prometheus-ags/entity-graph-svelte`.
 *
 * These mirror the shape of the rune-reactive objects returned by
 * `createEntityStore` and `createEntityList` so consumers can annotate their
 * own code without importing the implementation details.
 */

import type { EntityId, EntityType, ListState } from "@prometheus-ags/entity-graph-core";
import type {
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
} from "@prometheus-ags/entity-graph-core";

// ── EntityStore ────────────────────────────────────────────────────────────

/**
 * Rune-reactive handle for a single entity.
 * Every property is a Svelte 5 `$state` cell that updates whenever
 * the underlying graph slice changes.
 */
export interface EntityStore<T extends object> {
  /** Merged canonical + patch view from the graph, or `null` before first load. */
  entity: T | null;
  /** `true` while the transport fetch is in flight. */
  isLoading: boolean;
  /** Error string from the last failed fetch, or `null` on success. */
  error: string | null;
  /** True when the entity exists in the graph and is not being fetched. */
  isReady: boolean;
  /**
   * Trigger a fresh fetch regardless of staleness.
   * Useful for pull-to-refresh patterns or after an optimistic mutation.
   */
  refetch: () => void;
  /**
   * Release the graph subscription and subscriber ref-count token.
   * Call this from the component's `onDestroy` (or `$effect` cleanup)
   * to prevent memory leaks in long-lived SPA sessions.
   */
  destroy: () => void;
}

// ── EntityList ─────────────────────────────────────────────────────────────

/**
 * Rune-reactive handle for a list query.
 * `items` is joined from the graph on every render so cross-view
 * reactivity works: updating `entities[type][id]` in any store
 * immediately reflects here without re-fetching.
 */
export interface EntityList<T extends object> {
  /** Resolved entity rows (canonical + patches). Excludes ids not yet in the graph. */
  items: T[];
  /** `true` on the first fetch or when a full reload is pending. */
  isLoading: boolean;
  /** `true` while a "load more" page fetch is in progress. */
  isLoadingMore: boolean;
  /** Error string from the last failed list fetch. */
  error: string | null;
  /** Whether there are more pages available. */
  hasNextPage: boolean;
  /** Total row count from the server (if the transport provides it). */
  total: number | null;
  /**
   * Trigger a full refetch from the first page.
   * Resets ids and fetches with the original `ListQueryOptions`.
   */
  refetch: () => void;
  /**
   * Fetch the next page (append mode). No-op if `hasNextPage` is false
   * or a fetch is already in progress.
   */
  loadMore: () => void;
  /**
   * Release the graph subscription.
   * Call from `onDestroy` or `$effect` cleanup.
   */
  destroy: () => void;
}

// ── Options re-exports ─────────────────────────────────────────────────────

export type {
  EntityType,
  EntityId,
  ListState,
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
};
