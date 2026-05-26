import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, EMPTY_IDS, EMPTY_LIST_STATE } from "../graph";
import { serializeKey, getEngineOptions } from "../engine";
import { applyView, checkCompleteness, matchesFilter, matchesSearch, findInsertionIndex } from "./evaluator";
import { toRestParams, toSQLClauses, toGraphQLVariables, hasCustomPredicates } from "./types";
import type { ViewDescriptor, FilterSpec, SortSpec, CompletenessMode } from "./types";
import type { EntityType, EntityId } from "../graph";
import type { ListResponse } from "../engine";

/**
 * Precompiled transport payloads for one view snapshot — pass to REST, GraphQL, or SQL backends without re-deriving from `ViewDescriptor`.
 */
export interface ViewFetchParams { rest: Record<string, string>; graphql: ReturnType<typeof toGraphQLVariables>; sql: ReturnType<typeof toSQLClauses>; view: ViewDescriptor; }

/**
 * Configure a **live view** over a base list: filter/sort/search in JS when data is complete, or compile the same spec to remote params when not.
 * `baseQueryKey` identifies the underlying id list in the graph; the hook may create additional keys for remote result sets.
 */
export interface UseEntityViewOptions<TEntity extends object> {
  type: EntityType; baseQueryKey: unknown[]; view: ViewDescriptor; mode?: CompletenessMode;
  remoteFetch?: (params: ViewFetchParams) => Promise<ListResponse<TEntity>>;
  normalize?: (raw: TEntity) => { id: EntityId; data: TEntity };
  remoteDebounce?: number; staleTime?: number; enabled?: boolean;
  /** SSR-seeded ids written once into `lists[baseKey]` to avoid empty-state flash before hydration fetch. */
  initialIds?: EntityId[];
  /** SSR-seeded total for completeness heuristics when ids are preloaded. */
  initialTotal?: number;
}

/**
 * Rich list UI state: projected `items`/`viewIds`, completeness mode, remote vs local fetching flags, and imperative view updaters.
 * `isShowingLocalPending` signals hybrid mode where stale local rows are visible while a remote round-trip runs.
 */
export interface UseEntityViewResult<TEntity> {
  items: TEntity[]; viewIds: EntityId[]; viewTotal: number | null;
  isLoading: boolean; isFetching: boolean; isRemoteFetching: boolean; isShowingLocalPending: boolean;
  /**
   * Last error message from the remote fetcher (or the cached base
   * list state). `null` when the latest attempt succeeded or no
   * attempt has been made.
   */
  error: string | null;
  /** Convenience for `error !== null`. TanStack-Query-style. */
  isError: boolean;
  hasNextPage: boolean; fetchNextPage: () => void;
  isLocallyComplete: boolean; completenessMode: CompletenessMode;
  setView: (v: Partial<ViewDescriptor>) => void; setFilter: (f: FilterSpec | null) => void;
  setSort: (s: SortSpec | null) => void; setSearch: (q: string) => void; clearView: () => void; refetch: () => void;
  isFetchingMore: boolean;
}

const EMPTY_ENTITY_BUCKET: Record<EntityId, Record<string, unknown>> = {};

/**
 * Higher-level list hook: combines **graph-backed id lists**, declarative `ViewDescriptor`, local `applyView`, optional remote fetch, and realtime sorted insertion.
 * Solves “filters tied to one query cache” by deriving the visible id order from the shared graph whenever possible.
 *
 * @param opts - Base type/key, initial view, optional `remoteFetch` + `normalize`, SSR seeds, forced `mode`
 * @returns Projected entities, view metadata, completeness, and setters for interactive toolbars
 *
 * @example
 * ```tsx
 * const view = useEntityView({
 *   type: "Task",
 *   baseQueryKey: ["tasks", projectId],
 *   view: { filter: [{ field: "status", op: "eq", value: "open" }], sort: [{ field: "dueAt", direction: "asc" }] },
 *   remoteFetch: (p) => api.tasksQuery(p.rest),
 *   normalize: (raw) => ({ id: raw.id, data: raw }),
 * });
 * ```
 */
export function useEntityView<TEntity extends object>(opts: UseEntityViewOptions<TEntity>): UseEntityViewResult<TEntity> {
  const { type, baseQueryKey, mode: forcedMode, remoteFetch, remoteDebounce = 300, staleTime = getEngineOptions().defaultStaleTime, enabled = true, initialIds, initialTotal } = opts;
  const optsRef = useRef(opts); optsRef.current = opts;
  const [liveView, setLiveView] = useState<ViewDescriptor>(opts.view);
  const liveViewRef = useRef(liveView); liveViewRef.current = liveView;
  const [isRemoteFetching, setIsRemoteFetching] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [remoteResultKey, setRemoteResultKey] = useState<string | null>(null);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const baseKey = useMemo(() => serializeKey(baseQueryKey), [baseQueryKey]);
  const seededRef = useRef(false);
  if (!seededRef.current && initialIds && initialIds.length > 0) {
    seededRef.current = true;
    const store = useGraphStore.getState();
    if (!store.lists[baseKey]) {
      store.setListResult(baseKey, initialIds, { total: initialTotal ?? null });
    }
  }
  const listState = useStore(
    useGraphStore,
    useCallback((state) => state.lists[baseKey] ?? null, [baseKey]),
  );
  const remoteListState = useStore(useGraphStore, useCallback((state) => remoteResultKey ? state.lists[remoteResultKey] ?? null : null, [remoteResultKey]));
  const { isComplete } = useMemo(() => {
    if (!listState) return { isComplete: false };
    return checkCompleteness(listState.ids.length, listState.total, listState.hasNextPage);
  }, [listState]);
  const completenessMode: CompletenessMode = useMemo(() => {
    if (forcedMode) return forcedMode;
    if (liveView.filter && hasCustomPredicates(liveView.filter)) return "local";
    if (isComplete) return "local";
    if (!remoteFetch) return "local";
    return "hybrid";
  }, [forcedMode, isComplete, liveView.filter, remoteFetch]);
  const localViewIds = useStore(
    useGraphStore,
    useShallow((state): EntityId[] => {
      const list = state.lists[baseKey] ?? EMPTY_LIST_STATE;
      const sourceIds =
        completenessMode !== "remote" && remoteResultKey
          ? (state.lists[remoteResultKey]?.ids ?? EMPTY_IDS)
          : list.ids;
      const getEntity = (id: EntityId): Record<string, unknown> | null => state.readEntitySnapshot(type, id);
      return applyView(
        sourceIds,
        getEntity,
        liveView.filter,
        liveView.sort,
        liveView.search?.query
          ? { query: liveView.search.query, fields: liveView.search.fields }
          : null,
      );
    }),
  );
  const items = useMemo(
    () =>
      localViewIds
        .map((id) => useGraphStore.getState().readEntitySnapshot<TEntity>(type, id))
        .filter((item) => item !== null) as TEntity[],
    [localViewIds, type],
  );
  const fireRemoteFetch = useCallback(async (view: ViewDescriptor, cursor?: string) => {
    const { remoteFetch: rf, normalize: norm, baseQueryKey: bqk } = optsRef.current; if (!rf) return;
    const params: ViewFetchParams = { rest: toRestParams(view), graphql: toGraphQLVariables(view), sql: toSQLClauses(view), view };
    const rKey = serializeKey([...bqk, "__view__", view, cursor]);
    setRemoteResultKey(rKey); setIsRemoteFetching(true); setRemoteError(null);
    const store = useGraphStore.getState(); store.setListFetching(rKey, true);
    const baseKeyStr = serializeKey(bqk);
    try {
      const response = await rf(params);
      const normalized = norm ? response.items.map(norm) : response.items.map((item) => ({ id: String((item as Record<string, unknown>).id), data: item }));
      store.upsertEntities(type, normalized.map(({ id, data }) => ({ id, data: data as Record<string, unknown> }))); for (const { id } of normalized) store.setEntityFetched(type, id);
      store.setListResult(rKey, normalized.map(({ id }) => id), { total: response.total ?? null, nextCursor: response.nextCursor ?? null, hasNextPage: response.hasNextPage ?? !!response.nextCursor });
      // Mark the base key as freshly fetched (even if its ids list is
      // empty / unchanged). This stops the staleness re-trigger in the
      // mount effect below — a successful remote fetch counts as a base
      // refresh even when no ids land in the base list.
      store.setListFetching(baseKeyStr, false);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setRemoteError(msg);
      // Stamp BOTH keys with the error:
      //  - rKey so consumers reading remote-result state see it,
      //  - baseKey so the SWR staleness check in the mount effect
      //    stops refiring (terminal-error trap fix). `setListError`
      //    now also stamps `lastFetched` so this is sufficient to
      //    prevent the retry loop on permanent errors like 404 from a
      //    missing table. Consumers can manually `refetch()` to
      //    re-attempt.
      store.setListError(rKey, msg);
      store.setListError(baseKeyStr, msg);
    }
    finally { setIsRemoteFetching(false); }
  }, [type]);
  useEffect(() => {
    if (!enabled || completenessMode === "local" || !remoteFetch) return;
    const searchQuery = liveView.search?.query ?? ""; const minChars = liveView.search?.minChars ?? 2;
    if (searchQuery.length > 0 && searchQuery.length < minChars) return;
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fireRemoteFetch(liveViewRef.current), remoteDebounce);
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  }, [liveView, completenessMode, enabled, remoteFetch, remoteDebounce, fireRemoteFetch]);
  useEffect(() => {
    if (!enabled) return; const state = useGraphStore.getState(); const existing = state.lists[baseKey];
    const isStale = !existing?.lastFetched || existing.stale || Date.now() - (existing.lastFetched ?? 0) > staleTime;
    if (!existing || isStale) fireRemoteFetch(liveViewRef.current);
  }, [baseKey, enabled, staleTime, fireRemoteFetch]);
  useEffect(() => {
    const unsub = useGraphStore.subscribe((state) => state.entities[type] ?? EMPTY_ENTITY_BUCKET, (newEntities, prevEntities) => {
      const view = liveViewRef.current; const store = useGraphStore.getState(); const list = store.lists[baseKey]; if (!list) return;
      for (const id of new Set([...Object.keys(newEntities), ...Object.keys(prevEntities)])) {
        const isPresent = id in newEntities; if (!isPresent) continue;
        const entity = newEntities[id] as Record<string, unknown>;
        const merged = store.readEntitySnapshot(type, id) ?? entity;
        const matches = (!view.filter || matchesFilter(merged, view.filter)) && (!view.search?.query || matchesSearch(merged, view.search.query, view.search.fields));
        if (matches && !list.ids.includes(id)) {
          if (view.sort && view.sort.length > 0) { const idx = findInsertionIndex(merged, list.ids, (eid) => store.readEntitySnapshot(type, eid), view.sort); store.insertIdInList(baseKey, id, idx); }
          else store.insertIdInList(baseKey, id, "start");
        }
      }
    });
    return unsub;
  }, [type, baseKey]);
  const setView = useCallback((partial: Partial<ViewDescriptor>) => setLiveView((prev) => ({ ...prev, ...partial })), []);
  const setFilter = useCallback((filter: FilterSpec | null) => setLiveView((prev) => ({ ...prev, filter: filter ?? undefined })), []);
  const setSort = useCallback((sort: SortSpec | null) => setLiveView((prev) => ({ ...prev, sort: sort ?? undefined })), []);
  const setSearch = useCallback((query: string) => setLiveView((prev) => ({ ...prev, search: prev.search ? { ...prev.search, query } : { query, fields: [] } })), []);
  const clearView = useCallback(() => setLiveView({}), []);
  const fetchNextPage = useCallback(() => { if (completenessMode === "local" || isRemoteFetching) return; fireRemoteFetch(liveViewRef.current, remoteListState?.nextCursor ?? undefined); }, [completenessMode, isRemoteFetching, remoteListState?.nextCursor, fireRemoteFetch]);
  const refetch = useCallback(() => fireRemoteFetch(liveViewRef.current), [fireRemoteFetch]);
  const viewTotal = remoteListState?.total ?? (isComplete ? localViewIds.length : listState?.total ?? null);
  // Fixed: `listState?.isFetching ?? true` was the terminal-error
  // trap — when no list state existed (because a remote fetch failed
  // before seeding the base key, OR because the base key was never
  // primed), the `?? true` kept isLoading at true forever. The new
  // default of `?? false` matches `useEntityList`'s symmetric
  // behaviour (it reads from EMPTY_LIST_STATE which has
  // `isFetching: false`). `isRemoteFetching` still gates the spinner
  // during the actual round-trip.
  const error: string | null = remoteError ?? listState?.error ?? null;
  return {
    items,
    viewIds: localViewIds,
    viewTotal,
    isLoading:
      items.length === 0 &&
      ((listState?.isFetching ?? false) || isRemoteFetching),
    isFetching: (listState?.isFetching ?? false) || isRemoteFetching,
    isRemoteFetching,
    isShowingLocalPending: completenessMode === "hybrid" && isRemoteFetching && items.length > 0,
    error,
    isError: error !== null,
    hasNextPage: completenessMode === "local" ? false : (remoteListState?.hasNextPage ?? listState?.hasNextPage ?? false),
    fetchNextPage, isLocallyComplete: isComplete, completenessMode, setView, setFilter, setSort, setSearch, clearView, refetch,
    isFetchingMore: remoteListState?.isFetching ?? false,
  };
}
