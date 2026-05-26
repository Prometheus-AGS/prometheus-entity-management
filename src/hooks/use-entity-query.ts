/**
 * `useEntityQuery` — rich 2.0 hook (replaces `useEntityView`).
 *
 * Same feature surface as `useEntityView` (view descriptor, hybrid mode,
 * pagination, realtime sorted insertion, toolbar setters) but transport is
 * looked up from the registry — callers no longer pass `remoteFetch`.
 *
 * Usage:
 *   registerEntityTransport("Client", makeRestTransport({ supabase, table: "client" }));
 *
 *   const { items, setFilter, setSort, setSearch, fetchNextPage, error } =
 *     useEntityQuery<Client>("Client", { view: defaultView });
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, EMPTY_IDS, EMPTY_LIST_STATE } from "../graph";
import { serializeKey, getEngineOptions } from "../engine";
import { getEntityTransport } from "../transport/registry";
import { TerminalError, TransientError, toEntityError } from "../errors";
import { applyView, checkCompleteness, matchesFilter, matchesSearch, findInsertionIndex } from "../view/evaluator";
import { hasCustomPredicates } from "../view/types";
import type { EntityType, EntityId } from "../graph";
import type { ViewDescriptor, FilterSpec, SortSpec, CompletenessMode } from "../view/types";
import type { ListQuery } from "../transport/types";

export interface UseEntityQueryOptions {
  /** Initial view descriptor (filter/sort/search). */
  view?: ViewDescriptor;
  /** Force a completeness mode instead of auto-detecting. */
  mode?: CompletenessMode;
  /** Skip all fetching when false. `isLoading` is immediately `false`. */
  enabled?: boolean;
  /** SSR-seed ids for the base list slot (avoids flash-of-empty-state). */
  initialIds?: EntityId[];
  /** SSR-seed total for completeness heuristics. */
  initialTotal?: number;
  /** Debounce delay (ms) for view changes before a remote re-fetch fires. */
  remoteDebounce?: number;
}

export interface UseEntityQueryResult<T> {
  /** Projected entity rows visible through the current view. */
  items: T[];
  /** All ids in the projected view (for virtualised renderers). */
  viewIds: EntityId[];
  /** Server-reported total or local count if complete, else null. */
  viewTotal: number | null;

  /** True while the very first page is loading with zero cached rows. */
  isLoading: boolean;
  /** True while any fetch (initial or page) is in-flight. */
  isFetching: boolean;
  /** True while a paginated "load more" fetch is in-flight. */
  isFetchingMore: boolean;
  /** True when the last attempt ended with any error. */
  isError: boolean;
  /**
   * Typed error — `instanceof TerminalError` (4xx) or
   * `instanceof TransientError` (5xx/network). `null` on success.
   */
  error: TerminalError | TransientError | null;

  /** True when there are more pages to load. */
  hasNextPage: boolean;
  /** Load the next page of results. */
  fetchNextPage: () => void;

  /** True when `completenessMode === "hybrid"` and remote is still in-flight while local rows are displayed. */
  isShowingLocalPending: boolean;
  /** Whether local graph data is complete for the current view. */
  isLocallyComplete: boolean;
  /** Resolved completeness mode for the current view. */
  completenessMode: CompletenessMode;

  /** Merge partial view descriptor updates. */
  setView: (v: Partial<ViewDescriptor>) => void;
  /** Replace the active filter spec. */
  setFilter: (f: FilterSpec | null) => void;
  /** Replace the active sort spec. */
  setSort: (s: SortSpec | null) => void;
  /** Update free-text search query. */
  setSearch: (q: string) => void;
  /** Reset view to the initial descriptor. */
  clearView: () => void;
  /** Force a fresh fetch (bypasses staleTime). */
  refetch: () => void;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const EMPTY_ENTITY_BUCKET: Record<EntityId, Record<string, unknown>> = {};

/**
 * Rich list hook: view descriptor, local/remote/hybrid completeness, pagination,
 * realtime sorted insertion, typed errors — all backed by the transport registry.
 *
 * @param type - Registered entity type key (e.g. `"Client"`)
 * @param opts - View descriptor, mode override, SSR seeds, enabled gate
 */
export function useEntityQuery<T extends object>(
  type: EntityType,
  opts: UseEntityQueryOptions = {},
): UseEntityQueryResult<T> {
  const {
    view: initialView = {},
    mode: forcedMode,
    enabled = true,
    initialIds,
    initialTotal,
    remoteDebounce = 300,
  } = opts;

  const engineOpts = getEngineOptions();
  const optsRef = useRef(opts); optsRef.current = opts;

  // --- live view descriptor (mutated by toolbar setters) -------------------
  const [liveView, setLiveView] = useState<ViewDescriptor>(initialView);
  const liveViewRef = useRef(liveView); liveViewRef.current = liveView;

  // --- abort / fetch machinery ---------------------------------------------
  const abortRef = useRef<AbortController | null>(null);
  const fetchCountRef = useRef(0);
  const [fetchTick, setFetchTick] = useState(0);

  // --- remote sub-key for view-specific page results -----------------------
  const [remoteResultKey, setRemoteResultKey] = useState<string | null>(null);
  const [isFetchingState, setIsFetchingState] = useState(false);

  // --- stable base key (does NOT include view — base holds raw server page) -
  const baseKey = useMemo(
    () => serializeKey([type, "__base__"]),
    [type],
  );

  // --- SSR seed (once, before first render) --------------------------------
  const seededRef = useRef(false);
  if (!seededRef.current && initialIds && initialIds.length > 0) {
    seededRef.current = true;
    const store = useGraphStore.getState();
    if (!store.lists[baseKey]) {
      store.setListResult(baseKey, initialIds, { total: initialTotal ?? null });
    }
  }

  // --- subscribe to base list state ----------------------------------------
  const listState = useStore(
    useGraphStore,
    useCallback((s) => s.lists[baseKey] ?? EMPTY_LIST_STATE, [baseKey]),
  );

  // --- subscribe to remote-view list state (pagination, total) ------------
  const remoteListState = useStore(
    useGraphStore,
    useCallback(
      (s) => (remoteResultKey ? s.lists[remoteResultKey] ?? null : null),
      [remoteResultKey],
    ),
  );

  // --- completeness detection ----------------------------------------------
  const { isComplete } = useMemo(() => {
    if (!listState) return { isComplete: false };
    return checkCompleteness(listState.ids.length, listState.total, listState.hasNextPage);
  }, [listState]);

  let transport: ReturnType<typeof getEntityTransport<T>> | null = null;
  try { transport = getEntityTransport<T>(type); } catch { /* handled below */ }

  const completenessMode: CompletenessMode = useMemo(() => {
    if (forcedMode) return forcedMode;
    if (liveView.filter && hasCustomPredicates(liveView.filter)) return "local";
    if (isComplete) return "local";
    // If no transport, fall back to local (will show empty)
    if (!transport) return "local";
    return "hybrid";
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forcedMode, isComplete, liveView.filter, transport?.authoritative]);

  // --- local JS view projection --------------------------------------------
  const localViewIds = useStore(
    useGraphStore,
    useShallow((state): EntityId[] => {
      const list = state.lists[baseKey] ?? EMPTY_LIST_STATE;
      const sourceIds =
        completenessMode !== "remote" && remoteResultKey
          ? (state.lists[remoteResultKey]?.ids ?? EMPTY_IDS)
          : list.ids;
      const getEntity = (id: EntityId): Record<string, unknown> | null =>
        state.readEntitySnapshot(type, id);
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
        .map((id) => useGraphStore.getState().readEntitySnapshot<T>(type, id))
        .filter((item) => item !== null) as T[],
    [localViewIds, type],
  );

  // --- remote fetch implementation ----------------------------------------
  const fireRemoteFetch = useCallback(
    async (view: ViewDescriptor, cursor?: string | number) => {
      let tp: ReturnType<typeof getEntityTransport<T>>;
      try { tp = getEntityTransport<T>(type); }
      catch (e) {
        const err = toEntityError(e);
        useGraphStore.getState().setListError(baseKey, err.message, err);
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const thisCount = ++fetchCountRef.current;

      const rKey = serializeKey([type, "__view__", view, cursor]);
      setRemoteResultKey(rKey);
      setIsFetchingState(true);

      const store = useGraphStore.getState();
      store.setListFetching(rKey, true);
      store.setListFetching(baseKey, true);

      const effectiveStaleTime = tp.staleTime ?? engineOpts.defaultStaleTime;
      const maxRetries = engineOpts.maxRetries ?? 3;
      const retryBaseDelay = engineOpts.retryBaseDelay ?? 1_000;

      const query: ListQuery = {
        filter: view.filter,
        sort: view.sort,
        search: view.search?.query,
        cursor,
        signal: controller.signal,
      };

      const attempt = async (retries: number): Promise<void> => {
        try {
          const result = await tp.list(query);

          if (thisCount !== fetchCountRef.current) return;
          if (controller.signal.aborted) return;

          const graphStore = useGraphStore.getState();
          const entries = result.rows.map((row) => ({
            id: tp.identify(row),
            data: row as Record<string, unknown>,
          }));
          graphStore.upsertEntities(type, entries);
          for (const { id } of entries) graphStore.setEntityFetched(type, id);

          const ids = entries.map(({ id }) => id);

          // Pagination: if cursor provided, append to view key; otherwise replace
          if (cursor !== undefined) {
            graphStore.appendListResult(rKey, ids, {
              total: result.total,
              nextCursor: typeof result.nextCursor === "string" ? result.nextCursor : null,
              hasNextPage: result.nextCursor !== null && result.nextCursor !== undefined,
            });
          } else {
            graphStore.setListResult(rKey, ids, {
              total: result.total,
              nextCursor: typeof result.nextCursor === "string" ? result.nextCursor : null,
              hasNextPage: result.nextCursor !== null && result.nextCursor !== undefined,
            });
            // Also stamp the base key as fresh
            graphStore.setListFetching(baseKey, false);
          }
        } catch (err) {
          if (thisCount !== fetchCountRef.current) return;
          if (controller.signal.aborted) return;

          const typed = toEntityError(err);

          if (typed instanceof TransientError && retries < maxRetries) {
            await sleep(retryBaseDelay * Math.pow(2, retries));
            if (controller.signal.aborted) return;
            return attempt(retries + 1);
          }

          const gs = useGraphStore.getState();
          gs.setListError(rKey, typed.message, typed);
          gs.setListError(baseKey, typed.message, typed);
        } finally {
          if (thisCount === fetchCountRef.current) setIsFetchingState(false);
        }
      };

      void attempt(0);

      void effectiveStaleTime; // keep reference stable for future SWR check
    },
    [type, baseKey, engineOpts.defaultStaleTime, engineOpts.maxRetries, engineOpts.retryBaseDelay],
  );

  // --- view-change debounce effect -----------------------------------------
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!enabled || completenessMode === "local" || !transport) return;

    const searchQuery = liveView.search?.query ?? "";
    const minChars = liveView.search?.minChars ?? 2;
    if (searchQuery.length > 0 && searchQuery.length < minChars) return;

    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(
      () => fireRemoteFetch(liveViewRef.current),
      remoteDebounce,
    );
    return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveView, completenessMode, enabled, remoteDebounce]);

  // --- mount / stale-check effect ------------------------------------------
  useEffect(() => {
    if (!enabled || !transport) return;

    const store = useGraphStore.getState();
    const existing = store.lists[baseKey];
    const effectiveStaleTime = transport.staleTime ?? engineOpts.defaultStaleTime;
    const isStale =
      !existing?.lastFetched ||
      existing.stale ||
      Date.now() - (existing.lastFetched ?? 0) > effectiveStaleTime;

    if (!existing || isStale) {
      void fireRemoteFetch(liveViewRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseKey, enabled, fetchTick]);

  // --- realtime sorted insertion -------------------------------------------
  useEffect(() => {
    const unsub = useGraphStore.subscribe(
      (state) => state.entities[type] ?? EMPTY_ENTITY_BUCKET,
      (newEntities, prevEntities) => {
        const view = liveViewRef.current;
        const store = useGraphStore.getState();
        const list = store.lists[baseKey];
        if (!list) return;

        for (const id of new Set([
          ...Object.keys(newEntities),
          ...Object.keys(prevEntities),
        ])) {
          const isPresent = id in newEntities;
          if (!isPresent) continue;

          const entity = newEntities[id] as Record<string, unknown>;
          const merged = store.readEntitySnapshot(type, id) ?? entity;

          const matchesCurrentView =
            (!view.filter || matchesFilter(merged, view.filter)) &&
            (!view.search?.query ||
              matchesSearch(merged, view.search.query, view.search.fields));

          if (matchesCurrentView && !list.ids.includes(id)) {
            if (view.sort && view.sort.length > 0) {
              const idx = findInsertionIndex(
                merged,
                list.ids,
                (eid) => store.readEntitySnapshot(type, eid),
                view.sort,
              );
              store.insertIdInList(baseKey, id, idx);
            } else {
              store.insertIdInList(baseKey, id, "start");
            }
          }
        }
      },
    );
    return unsub;
  }, [type, baseKey]);

  // --- realtime subscription -----------------------------------------------
  useEffect(() => {
    let tp: ReturnType<typeof getEntityTransport<T>>;
    try { tp = getEntityTransport<T>(type); } catch { return; }
    if (!tp.subscribe || !enabled) return;

    const unsub = tp.subscribe((ev) => {
      const store = useGraphStore.getState();
      if (ev.op === "delete") {
        store.removeIdFromAllLists(type, ev.id);
        store.removeEntity(type, ev.id);
      } else if (ev.row) {
        store.upsertEntity(type, ev.id, ev.row as Record<string, unknown>);
        store.setEntityFetched(type, ev.id);
      }
    });
    return () => unsub();
  }, [type, enabled]);

  // --- toolbar setters -----------------------------------------------------
  const setView = useCallback(
    (partial: Partial<ViewDescriptor>) => setLiveView((prev) => ({ ...prev, ...partial })),
    [],
  );
  const setFilter = useCallback(
    (filter: FilterSpec | null) =>
      setLiveView((prev) => ({ ...prev, filter: filter ?? undefined })),
    [],
  );
  const setSort = useCallback(
    (sort: SortSpec | null) =>
      setLiveView((prev) => ({ ...prev, sort: sort ?? undefined })),
    [],
  );
  const setSearch = useCallback(
    (query: string) =>
      setLiveView((prev) => ({
        ...prev,
        search: prev.search ? { ...prev.search, query } : { query, fields: [] },
      })),
    [],
  );
  const clearView = useCallback(() => setLiveView(initialView), [initialView]);

  const fetchNextPage = useCallback(() => {
    if (completenessMode === "local" || isFetchingState) return;
    const cursor = remoteListState?.nextCursor ?? undefined;
    void fireRemoteFetch(liveViewRef.current, cursor ?? undefined);
  }, [completenessMode, isFetchingState, remoteListState?.nextCursor, fireRemoteFetch]);

  const refetch = useCallback(() => {
    abortRef.current?.abort();
    useGraphStore.getState().setListStale(baseKey, true);
    setFetchTick((n) => n + 1);
  }, [baseKey]);

  // --- derived values ------------------------------------------------------
  const viewTotal =
    remoteListState?.total ??
    (isComplete ? localViewIds.length : listState?.total ?? null);

  const baseError = listState?.lastError ?? null;
  const remoteError = remoteListState?.lastError ?? null;
  const typedError =
    ((remoteError ?? baseError) as TerminalError | TransientError | null) ?? null;

  return {
    items,
    viewIds: localViewIds,
    viewTotal,
    isLoading:
      !enabled
        ? false
        : items.length === 0 &&
          ((listState?.isFetching ?? false) || isFetchingState),
    isFetching: (listState?.isFetching ?? false) || isFetchingState,
    isFetchingMore: remoteListState?.isFetching ?? false,
    isError: typedError !== null,
    error: typedError,
    hasNextPage:
      completenessMode === "local"
        ? false
        : (remoteListState?.hasNextPage ?? listState?.hasNextPage ?? false),
    fetchNextPage,
    isShowingLocalPending:
      completenessMode === "hybrid" && isFetchingState && items.length > 0,
    isLocallyComplete: isComplete,
    completenessMode,
    setView,
    setFilter,
    setSort,
    setSearch,
    clearView,
    refetch,
  };
}
