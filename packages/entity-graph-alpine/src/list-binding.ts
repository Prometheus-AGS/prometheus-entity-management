/**
 * list-binding.ts — $entityList(type, query) magic implementation.
 *
 * Mirrors the Svelte/Solid list bindings but wires Alpine.reactive() instead
 * of Svelte stores / Solid signals. Items are derived at read-time by joining
 * the stored `ids` array against `entities[type]` — ensuring cross-view
 * reactivity when an entity is updated anywhere in the app.
 *
 * Architecture:
 *   Alpine template
 *     → $entityList magic (this file)
 *       → fetchList (core engine)
 *       → useGraphStore.subscribe (core Layer 1 read)
 */

import {
  useGraphStore,
  fetchList,
  getEngineOptions,
  serializeKey,
  EMPTY_LIST_STATE,
  getEntityTransport,
} from "@prometheus-ags/entity-graph-core";
import type {
  EntityType,
  EntityId,
  EntityTransport,
  ListFetchParams,
  ListResponse,
} from "@prometheus-ags/entity-graph-core";
import type { AlpineEntityList, AlpineListQuery } from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function resolveItems<T extends Record<string, unknown>>(
  type: EntityType,
  ids: EntityId[],
): T[] {
  const s = useGraphStore.getState();
  const entities = s.entities[type] ?? {};
  const patches = s.patches[type] ?? {};
  const items: T[] = [];
  for (const id of ids) {
    const base = entities[id];
    if (!base) continue;
    const patch = patches[id];
    items.push((patch ? { ...base, ...patch } : base) as T);
  }
  return items;
}

function normalizeQueryKey(queryKey: unknown[] | string): unknown[] {
  return typeof queryKey === "string" ? [queryKey] : queryKey;
}

function tryGetTransport<T extends object>(type: EntityType): EntityTransport<T> | null {
  try {
    return getEntityTransport<T>(type);
  } catch {
    return null;
  }
}

// ── Internal mutable cell ─────────────────────────────────────────────────────

interface ListCell<T extends Record<string, unknown>> {
  items: T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  error: string | null;
  hasNextPage: boolean;
  total: number | null;
}

// ── createListBinding ─────────────────────────────────────────────────────────

/**
 * Create a reactive Alpine list binding for (type, query).
 *
 * The core engine handles fetch deduplication, retries, and graph writes.
 * This binding only reads the graph and delegates all I/O to `fetchList`.
 *
 * @internal Called by the `$entityList` magic factory.
 */
export function createListBinding<T extends Record<string, unknown>>(
  alpineReactive: <U extends object>(obj: U) => U,
  type: EntityType,
  query: AlpineListQuery,
): AlpineEntityList<T> {
  const {
    queryKey: rawKey,
    filter,
    search,
    limit,
    enabled = true,
    staleTime,
  } = query;

  const engineOpts = getEngineOptions();
  const effectiveStaleTime = staleTime ?? engineOpts.defaultStaleTime;
  const normalizedKey = normalizeQueryKey(rawKey);
  const listKey = serializeKey(normalizedKey);

  // Cursor tracking for load-more / infinite scroll.
  let currentCursor: string | undefined;

  // ── Alpine-reactive cell ────────────────────────────────────────────────────
  const cell = alpineReactive<ListCell<T>>({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    error: null,
    hasNextPage: false,
    total: null,
  });

  // ── Sync from graph ────────────────────────────────────────────────────────
  function syncFromGraph(): void {
    const s = useGraphStore.getState();
    const listState = s.lists[listKey] ?? EMPTY_LIST_STATE;

    cell.items = resolveItems<T>(type, listState.ids);
    cell.isLoading = listState.isFetching;
    cell.isLoadingMore = listState.isFetchingMore;
    cell.error = listState.error;
    cell.hasNextPage = listState.hasNextPage;
    cell.total = listState.total;
    currentCursor = listState.nextCursor ?? undefined;
  }

  // ── Subscribe to graph changes ─────────────────────────────────────────────
  const unsubscribe = useGraphStore.subscribe(
    (s) => ({
      listSlice: s.lists[listKey] ?? EMPTY_LIST_STATE,
      entities: s.entities[type],
      patches: s.patches[type],
    }),
    () => {
      syncFromGraph();
    },
  );

  // ── Build fetchList options from the registered transport ──────────────────
  function buildFetchOpts() {
    const transport = tryGetTransport<T>(type);
    if (!transport) return null;

    // Wrap the transport's `list` method into the ListQueryOptions `fetch` shape.
    const fetchFn = (params: ListFetchParams): Promise<ListResponse<T>> => {
      return transport.list({
        filter: filter as import("@prometheus-ags/entity-graph-core").FilterSpec | undefined,
        search,
        limit: params.pageSize ?? limit,
        cursor: params.cursor,
      }).then((result) => ({
        items: result.rows,
        total: result.total ?? null,
        nextCursor: (result.nextCursor != null ? String(result.nextCursor) : null) ?? null,
        hasNextPage: result.nextCursor != null,
      }));
    };

    return {
      type,
      queryKey: normalizedKey,
      fetch: fetchFn,
      normalize: (raw: T) => ({ id: transport.identify(raw), data: raw }),
      mode: "replace" as const,
    };
  }

  // ── Initial fetch ──────────────────────────────────────────────────────────
  function doFetch(): void {
    if (!enabled) return;
    const fetchOpts = buildFetchOpts();
    if (!fetchOpts) return;

    const s = useGraphStore.getState();
    const listState = s.lists[listKey];
    const lastFetched = listState?.lastFetched ?? 0;
    const isStale = Date.now() - lastFetched > effectiveStaleTime;
    const alreadyFetching = listState?.isFetching === true;

    if (!isStale && listState && listState.ids.length > 0) return;
    if (alreadyFetching) return;

    fetchList(fetchOpts, {}, engineOpts, false).then(() => {
      syncFromGraph();
    });
  }

  // ── Imperative refetch ────────────────────────────────────────────────────
  function refetch(): void {
    const fetchOpts = buildFetchOpts();
    if (!fetchOpts) return;
    useGraphStore.getState().invalidateLists(listKey);
    fetchList({ ...fetchOpts, mode: "replace" }, {}, engineOpts, false).then(() => {
      syncFromGraph();
    });
  }

  // ── Load more (cursor-based pagination) ───────────────────────────────────
  function loadMore(): void {
    const fetchOpts = buildFetchOpts();
    if (!fetchOpts) return;
    const s = useGraphStore.getState();
    const listState = s.lists[listKey] ?? EMPTY_LIST_STATE;
    if (!listState.hasNextPage) return;
    if (listState.isFetchingMore || listState.isFetching) return;

    fetchList(
      { ...fetchOpts, mode: "append" },
      { cursor: currentCursor },
      engineOpts,
      true,
    ).then(() => {
      syncFromGraph();
    });
  }

  // ── Cleanup ────────────────────────────────────────────────────────────────
  function destroy(): void {
    unsubscribe();
  }

  // Bootstrap.
  syncFromGraph();
  doFetch();

  // ── Return reactive list snapshot ──────────────────────────────────────────
  return {
    get items() { return cell.items; },
    get isLoading() { return cell.isLoading; },
    get isLoadingMore() { return cell.isLoadingMore; },
    get error() { return cell.error; },
    get hasNextPage() { return cell.hasNextPage; },
    get total() { return cell.total; },
    loadMore,
    refetch,
    destroy,
  };
}
