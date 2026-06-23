/**
 * createEntityList — SolidJS primitive for reactive normalized entity lists.
 *
 * Architecture:
 *   createEntityList  (this file, Layer 2)
 *     └─ core engine fetchList  (Layer 1 / transport)
 *          └─ useGraphStore  (Layer 0 / Zustand graph)
 *
 * A Zustand `subscribe` bridges the graph's `lists[key]` slot + entity rows
 * into a SolidJS `createStore`, giving SolidJS fine-grained per-row reactivity.
 * Changing `queryKey()` re-serializes to a new list slot, triggering a fresh
 * fetch while keeping existing data visible (stale-while-revalidate).
 */

import { createEffect, onCleanup } from "solid-js";
import { createStore } from "solid-js/store";

import {
  useGraphStore,
  fetchList,
  serializeKey,
  getEngineOptions,
  EMPTY_LIST_STATE,
} from "@prometheus-ags/entity-graph-core";
import type { EntityId, ListState } from "@prometheus-ags/entity-graph-core";
import type { CreateEntityListOptions, CreateEntityListReturn } from "./types";

// ── Internal store shape ──────────────────────────────────────────────────────

interface ListSlice<TEntity extends object> {
  items: TEntity[];
  listState: ListState;
}

// ── Equality helper for list subscription ────────────────────────────────────

function listSliceEqual(
  a: { listState: ListState; entityBucket: Record<string, unknown> | undefined },
  b: { listState: ListState; entityBucket: Record<string, unknown> | undefined },
): boolean {
  return a.listState === b.listState && a.entityBucket === b.entityBucket;
}

/**
 * Creates a fine-grained SolidJS reactive primitive for an entity list.
 *
 * - Subscribes to `useGraphStore` to mirror list state (ids + pagination)
 *   and resolves the entity rows by joining ids → graph entities on each read.
 * - Changing `queryKey()` triggers a new fetch and subscribes to the new list
 *   slot; the previous subscription is cleaned up automatically.
 * - Supports pagination (`fetchNextPage`) and imperative refetch.
 *
 * @example
 * ```tsx
 * const invoices = createEntityList({
 *   type: "Invoice",
 *   queryKey: () => ["invoices", { status: filter() }],
 *   fetch: (params) => api.getInvoices(params),
 *   normalize: (raw) => ({ id: raw.invoice_id, data: { ...raw } }),
 * });
 *
 * return (
 *   <For each={invoices.items()}>
 *     {(invoice) => <InvoiceRow invoice={invoice} />}
 *   </For>
 * );
 * ```
 */
export function createEntityList<TRaw, TEntity extends object>(
  opts: CreateEntityListOptions<TRaw, TEntity>,
): CreateEntityListReturn<TEntity> {
  const {
    type,
    queryKey: queryKeyAccessor,
    fetch,
    normalize,
    mode = "replace",
    staleTime,
    enabled: enabledAccessor,
    onSuccess,
    onError,
  } = opts;

  // ── Fine-grained Solid store ─────────────────────────────────────────────────
  const [slice, setSlice] = createStore<ListSlice<TEntity>>({
    items: [],
    listState: { ...EMPTY_LIST_STATE },
  });

  // ── Helper: resolve items from current graph state for a given key ───────────
  function resolveItems(key: string): TEntity[] {
    const s = useGraphStore.getState();
    const list = s.lists[key];
    if (!list) return [];
    return list.ids
      .map((id: EntityId) => s.readEntity<TEntity>(type, id))
      .filter((e): e is TEntity => e !== null);
  }

  // ── Initial / stale-while-revalidate fetch ────────────────────────────────────
  // Declared before createEffect so it is always defined when the effect runs
  // (the effect mock executes the callback synchronously in tests).
  async function doInitialFetch(key: string): Promise<void> {
    const s = useGraphStore.getState();
    const listState = s.lists[key];
    const effectiveStaleTime = staleTime ?? getEngineOptions().defaultStaleTime;
    const age = Date.now() - (listState?.lastFetched ?? 0);
    const isFresh = listState && !listState.stale && age < effectiveStaleTime;
    if (isFresh) return;

    await fetchList(
      {
        type,
        queryKey: JSON.parse(key) as unknown[],
        fetch,
        normalize,
        mode,
        onSuccess: onSuccess as ((r: { items: TRaw[]; total?: number | null }) => void) | undefined,
        onError,
      },
      {},
      getEngineOptions(),
    );
  }

  // ── Reactive effect: subscribe to graph whenever queryKey changes ─────────────
  createEffect(() => {
    const rawKey = queryKeyAccessor();
    const key = serializeKey(rawKey);
    const enabled = enabledAccessor ? enabledAccessor() : true;

    // Sync snapshot immediately with whatever is already in the graph.
    const syncFromGraph = () => {
      const s = useGraphStore.getState();
      const listState = s.lists[key] ?? EMPTY_LIST_STATE;
      const items = resolveItems(key);
      setSlice("listState", (prev) => ({ ...prev, ...listState }));
      setSlice("items", items);
    };

    syncFromGraph();

    // Subscribe to any graph change that could affect this list.
    // Solid's fine-grained update system means only changed fields propagate.
    const unsub = useGraphStore.subscribe(
      (s) => {
        const listState = s.lists[key] ?? EMPTY_LIST_STATE;
        const entityBucket = s.entities[type];
        return { listState, entityBucket };
      },
      ({ listState }) => {
        const items = resolveItems(key);
        setSlice("listState", (prev) => ({ ...prev, ...listState }));
        setSlice("items", items);
      },
      { equalityFn: listSliceEqual },
    );

    // Kick off the fetch when enabled and data may be stale.
    if (enabled && (fetch || normalize)) {
      void doInitialFetch(key);
    }

    onCleanup(() => {
      unsub();
    });
  });

  // ── fetchNextPage ─────────────────────────────────────────────────────────────
  async function fetchNextPage(): Promise<void> {
    const key = serializeKey(queryKeyAccessor());
    const s = useGraphStore.getState();
    const listState = s.lists[key] ?? EMPTY_LIST_STATE;
    if (!listState.hasNextPage || listState.isFetchingMore) return;

    await fetchList(
      {
        type,
        queryKey: JSON.parse(key) as unknown[],
        fetch,
        normalize,
        mode: "append",
        onSuccess: onSuccess as ((r: { items: TRaw[]; total?: number | null }) => void) | undefined,
        onError,
      },
      { cursor: listState.nextCursor ?? undefined },
      getEngineOptions(),
      true, // isLoadMore
    );
  }

  // ── Imperative refetch ────────────────────────────────────────────────────────
  async function refetch(): Promise<void> {
    const key = serializeKey(queryKeyAccessor());
    useGraphStore.getState().setListStale(key, true);
    await fetchList(
      {
        type,
        queryKey: JSON.parse(key) as unknown[],
        fetch,
        normalize,
        mode: "replace",
        onSuccess: onSuccess as ((r: { items: TRaw[]; total?: number | null }) => void) | undefined,
        onError,
      },
      {},
      getEngineOptions(),
    );
  }

  // ── Derived signals ───────────────────────────────────────────────────────────
  const isLoading = () => slice.listState.isFetching && slice.items.length === 0;
  const isLoadingMore = () => slice.listState.isFetchingMore;
  const error = () => slice.listState.error;
  const typedError = () => slice.listState.lastError;
  const total = () => slice.listState.total;
  const hasNextPage = () => slice.listState.hasNextPage;
  const hasPrevPage = () => slice.listState.hasPrevPage;

  return {
    items: () => slice.items,
    isLoading,
    isLoadingMore,
    error,
    typedError,
    total,
    hasNextPage,
    hasPrevPage,
    fetchNextPage,
    refetch,
    listState: () => slice.listState,
  };
}
