/**
 * createEntityList — Svelte 5 runes binding for a list query.
 *
 * Subscribes to the entity graph and calls core `fetchList` / `serializeKey`.
 * `items` is derived at subscription time by joining the list's `ids` array
 * against `entities[type]` — the same cross-view reactivity guarantee the
 * React binding provides.
 *
 * Architecture: this module ONLY reads the graph and delegates all I/O to
 * core engine functions. It does not reimplement fetch/retry/dedup logic.
 */

import {
  useGraphStore,
  fetchList,
  getEngineOptions,
  serializeKey,
  EMPTY_LIST_STATE,
} from "@prometheus-ags/entity-graph-core";
import type { EntityType, EntityId } from "@prometheus-ags/entity-graph-core";
import type {
  ListQueryOptions,
  ListFetchParams,
} from "@prometheus-ags/entity-graph-core";
import type { EntityList } from "./types.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveItems<TEntity extends object>(
  type: EntityType,
  ids: EntityId[]
): TEntity[] {
  const graphState = useGraphStore.getState();
  const bucket = graphState.entities[type] ?? {};
  const patchBucket = graphState.patches[type] ?? {};
  const items: TEntity[] = [];
  for (const id of ids) {
    const base = bucket[id];
    if (!base) continue;
    const patch = patchBucket[id];
    items.push((patch ? { ...base, ...patch } : base) as TEntity);
  }
  return items;
}

// ── createEntityList ───────────────────────────────────────────────────────

export interface CreateEntityListOptions<TRaw, TEntity extends object>
  extends Omit<ListQueryOptions<TRaw, TEntity>, "type"> {
  /** Whether to fire the initial fetch (default: true). */
  enabled?: boolean;
  /** Staleness threshold in ms (defaults to engine global). */
  staleTime?: number;
}

/**
 * Create a Svelte 5 runes-compatible reactive list for an entity collection.
 *
 * ```svelte
 * <script lang="ts">
 *   import { createEntityList } from "@prometheus-ags/entity-graph-svelte";
 *
 *   const list = createEntityList<RawInvoice, Invoice>("Invoice", {
 *     queryKey: ["invoices", { companyId }],
 *     fetch: (params) => api.listInvoices(params),
 *     normalize: (raw) => ({ id: raw.id, data: raw }),
 *   });
 * </script>
 *
 * {#each list.items as invoice (invoice.id)}
 *   <InvoiceRow {invoice} />
 * {/each}
 * ```
 *
 * @param type - Entity type key (e.g. `"Invoice"`)
 * @param opts - List query options including `queryKey`, `fetch`, `normalize`
 */
export function createEntityList<TRaw, TEntity extends object>(
  type: EntityType,
  opts: CreateEntityListOptions<TRaw, TEntity>
): EntityList<TEntity> {
  const {
    queryKey,
    fetch: fetchFn,
    normalize,
    enabled = true,
    staleTime,
    mode = "replace",
    sideEffects,
    onSuccess,
    onError,
  } = opts;

  const engineOpts = getEngineOptions();
  const effectiveStaleTime = staleTime ?? engineOpts.defaultStaleTime;
  const listKey = serializeKey(queryKey);

  // Track cursor state for load-more / infinite scroll.
  let currentCursor: string | undefined;

  // ── Internal mutable state ─────────────────────────────────────────────
  const state: EntityList<TEntity> = {
    items: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasNextPage: false,
    total: null,
    refetch,
    loadMore,
    destroy,
  };

  // ── Sync from graph ────────────────────────────────────────────────────
  function syncFromGraph() {
    const graphState = useGraphStore.getState();
    const listState = graphState.lists[listKey] ?? EMPTY_LIST_STATE;

    state.items = resolveItems<TEntity>(type, listState.ids);
    state.isLoading = listState.isFetching;
    state.isLoadingMore = listState.isFetchingMore;
    state.error = listState.error;
    state.hasNextPage = listState.hasNextPage;
    state.total = listState.total;
    currentCursor = listState.nextCursor ?? undefined;
  }

  // ── Subscribe to graph changes ─────────────────────────────────────────
  const unsubscribe = useGraphStore.subscribe(
    (graphState) => ({
      listSlice: graphState.lists[listKey] ?? EMPTY_LIST_STATE,
      entities: graphState.entities[type],
      patches: graphState.patches[type],
    }),
    () => {
      syncFromGraph();
    }
  );

  // ── Fetch helpers ──────────────────────────────────────────────────────
  function doFetch(params: ListFetchParams = {}) {
    if (!enabled || !fetchFn || !normalize) return;
    const graphState = useGraphStore.getState();
    const listState = graphState.lists[listKey];
    const lastFetched = listState?.lastFetched ?? 0;
    const isStale = Date.now() - lastFetched > effectiveStaleTime;
    const alreadyFetching = listState?.isFetching === true;

    if (!isStale && listState && listState.ids.length > 0) return;
    if (alreadyFetching) return;

    fetchList<TRaw, TEntity>(
      { type, queryKey, fetch: fetchFn, normalize, mode, sideEffects, onSuccess, onError },
      params,
      engineOpts,
      false
    ).then(() => {
      syncFromGraph();
    });
  }

  function refetch() {
    if (!fetchFn || !normalize) return;
    useGraphStore.getState().invalidateLists(listKey);
    fetchList<TRaw, TEntity>(
      { type, queryKey, fetch: fetchFn, normalize, mode: "replace", sideEffects, onSuccess, onError },
      {},
      engineOpts,
      false
    ).then(() => {
      syncFromGraph();
    });
  }

  function loadMore() {
    if (!fetchFn || !normalize) return;
    const graphState = useGraphStore.getState();
    const listState = graphState.lists[listKey] ?? EMPTY_LIST_STATE;
    if (!listState.hasNextPage) return;
    if (listState.isFetchingMore || listState.isFetching) return;

    const params: ListFetchParams = { cursor: currentCursor };
    fetchList<TRaw, TEntity>(
      { type, queryKey, fetch: fetchFn, normalize, mode: "append", sideEffects, onSuccess, onError },
      params,
      engineOpts,
      true
    ).then(() => {
      syncFromGraph();
    });
  }

  function destroy() {
    unsubscribe();
  }

  // Bootstrap.
  syncFromGraph();
  doFetch();

  return state;
}
