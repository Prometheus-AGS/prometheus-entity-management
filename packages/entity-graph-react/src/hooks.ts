import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, EMPTY_ENTITY_STATE, EMPTY_LIST_STATE, EMPTY_IDS } from "@prometheus-ags/entity-graph-core";
import { fetchEntity, fetchList, serializeKey, registerSubscriber, unregisterSubscriber, getEngineOptions, attachGlobalListeners } from "@prometheus-ags/entity-graph-core";
import type { EntityType, EntityId, EntityState, ListState } from "@prometheus-ags/entity-graph-core";
import type { EntityQueryOptions, ListQueryOptions, ListFetchParams, ListResponse } from "@prometheus-ags/entity-graph-core";

let listenersAttached = false;
function ensureListeners() { if (!listenersAttached) { attachGlobalListeners(); listenersAttached = true; } }

/**
 * View-model for one entity row: merged canonical + patch data plus fetch lifecycle flags.
 * `isLoading` is true only when there is no data yet; `isFetching` includes background refreshes.
 */
export interface UseEntityResult<T> {
  data: T | null; isLoading: boolean; isFetching: boolean; error: string | null; isStale: boolean; refetch: () => void;
}

/**
 * Subscribe to a single normalized entity: populates the graph via `fetch`/`normalize`, dedupes in-flight work, and revalidates when stale.
 * Solves “query-owned silos” by keeping **one** canonical record every list/detail reads through.
 *
 * @param opts - Entity query instruction (`EntityQueryOptions`): `type`, `id`, `fetch`, `normalize`, optional `staleTime` / `enabled`
 * @returns Merged entity (`entities` + `patches`), loading/error/stale flags, and `refetch`
 *
 * @example
 * ```tsx
 * const { data, isLoading, refetch } = useEntity({
 *   type: "Project",
 *   id: projectId,
 *   fetch: (id) => api.getProject(id),
 *   normalize: (raw) => ({ ...raw, id: String(raw.id) }),
 * });
 * ```
 */
export function useEntity<TRaw, TEntity extends object>(opts: EntityQueryOptions<TRaw, TEntity>): UseEntityResult<TEntity> {
  const { type, id, staleTime = getEngineOptions().defaultStaleTime, enabled = true } = opts;
  ensureListeners();
  const fetchRef = useRef(opts.fetch); fetchRef.current = opts.fetch;
  const normalizeRef = useRef(opts.normalize); normalizeRef.current = opts.normalize;
  const dataSelector = useCallback((state: ReturnType<typeof useGraphStore.getState>) => {
    if (!id) return null;
    return state.readEntitySnapshot<TEntity>(type, id) as TEntity | null;
  }, [id, type]);
  const data = useStore(useGraphStore, useShallow(dataSelector));
  const entityState = useStore(useGraphStore, useCallback((state): EntityState =>
    state.entityStates[`${type}:${id}`] ?? EMPTY_ENTITY_STATE,
  [type, id]));
  const doFetch = useCallback(() => {
    if (!id || !enabled) return;
    fetchEntity({ type, id, fetch: fetchRef.current, normalize: normalizeRef.current }, getEngineOptions());
  }, [id, enabled, type]);
  useEffect(() => {
    if (!id || !enabled) return;
    const token = registerSubscriber(`${type}:${id}`);
    const state = useGraphStore.getState();
    const existingState = state.entityStates[`${type}:${id}`];
    const hasData = !!state.entities[type]?.[id];
    const isStale = !existingState?.lastFetched || existingState.stale || Date.now() - (existingState.lastFetched ?? 0) > staleTime;
    if (!hasData || isStale) doFetch();
    return () => unregisterSubscriber(`${type}:${id}`, token);
  }, [id, type, enabled, staleTime, doFetch]);
  useEffect(() => { if (entityState.stale && id && enabled && !entityState.isFetching) doFetch(); }, [entityState.stale, id, enabled, entityState.isFetching, doFetch]);
  return { data, isLoading: !data && entityState.isFetching, isFetching: entityState.isFetching, error: entityState.error, isStale: entityState.stale, refetch: doFetch };
}

/**
 * Resolved rows for a list query: **`items` joins `ids` to the graph** at render time so shared entities update everywhere.
 */
export interface UseEntityListResult<TEntity> {
  items: TEntity[]; ids: EntityId[]; isLoading: boolean; isFetching: boolean; isFetchingMore: boolean;
  /**
   * Last error message from the underlying fetcher, or `null` when
   * the latest attempt succeeded / no attempt has been made.
   * Combined with `isError` for TanStack-Query-style ergonomics.
   */
  error: string | null;
  /** Convenience for `error !== null`. TanStack-Query-style. */
  isError: boolean;
  hasNextPage: boolean; hasPrevPage: boolean; total: number | null; currentPage: number | null;
  fetchNextPage: () => void; refetch: () => void;
}

/**
 * Subscribe to a collection: stores **ordered ids** under a serialized `queryKey`, upserts each row into `entities`, and supports pagination.
 * Use when you need a table or feed backed by the shared graph (not an isolated query cache).
 *
 * @param opts - List query instruction (`ListQueryOptions`)
 * @returns Hydrated `items`, raw `ids`, pagination helpers, and fetch flags
 *
 * @example
 * ```tsx
 * const { items, fetchNextPage, hasNextPage } = useEntityList({
 *   type: "Task",
 *   queryKey: ["tasks", { projectId }],
 *   fetch: (p) => api.listTasks({ ...p, projectId }),
 *   normalize: (raw) => ({ id: raw.id, data: raw }),
 *   mode: "append",
 * });
 * ```
 */
/**
 * @deprecated Use `useEntities` from `"@prometheus-ags/prometheus-entity-management"` instead.
 * Register a transport: `registerEntityTransport("Foo", makeRestTransport({ supabase, table: "foo" }))`
 * Then consume: `const { items } = useEntities<Foo>("Foo")`.
 * `useEntityList` will be removed in a future major version.
 */
export function useEntityList<TRaw, TEntity extends object>(opts: ListQueryOptions<TRaw, TEntity>): UseEntityListResult<TEntity> {
  // Only warn when an inline fetch closure is supplied (the deprecated REST form).
  // Pure graph subscriptions (Tier-A PGlite/Electric entities) pass no fetch
  // callback and should NOT produce noise — they are the intended long-term pattern.
  if (opts.fetch) {
    console.warn(
      `[entity-management] useEntityList("${String(opts.type)}") is deprecated in 2.0.\n` +
      `Register a transport at boot: registerEntityTransport("${String(opts.type)}", makeRestTransport(...))\n` +
      `Then replace this call with: useEntities<T>("${String(opts.type)}")`,
    );
  }
  const { type, queryKey, staleTime = getEngineOptions().defaultStaleTime, enabled = true, mode = "replace" } = opts;
  ensureListeners();
  const key = useMemo(() => serializeKey(queryKey), [queryKey]);
  const fetchRef = useRef(opts.fetch); fetchRef.current = opts.fetch;
  const normalizeRef = useRef(opts.normalize); normalizeRef.current = opts.normalize;
  const listState = useStore(useGraphStore, useCallback((state): ListState => state.lists[key] ?? EMPTY_LIST_STATE, [key]));
  const itemsSelector = useCallback((state: ReturnType<typeof useGraphStore.getState>) => {
    const ids = state.lists[key]?.ids ?? EMPTY_IDS;
    return ids
      .map((id) => state.readEntitySnapshot<TEntity>(type, id))
      .filter((x) => x !== null) as TEntity[];
  }, [key, type]);
  const items = useStore(useGraphStore, useShallow(itemsSelector));
  const doFetch = useCallback((params: ListFetchParams = {}) => {
    if (!enabled) return;
    fetchList({ type, queryKey, mode, fetch: fetchRef.current, normalize: normalizeRef.current }, params, getEngineOptions(), false);
  }, [enabled, type, queryKey, mode]);
  const fetchNextPage = useCallback(() => {
    if (!listState.hasNextPage || listState.isFetchingMore || !enabled) return;
    fetchList({ type, queryKey, mode, fetch: fetchRef.current, normalize: normalizeRef.current }, { cursor: listState.nextCursor ?? undefined, page: (listState.currentPage ?? 0) + 1, pageSize: listState.pageSize ?? undefined }, getEngineOptions(), true);
  }, [listState.hasNextPage, listState.isFetchingMore, listState.nextCursor, listState.currentPage, listState.pageSize, enabled, type, queryKey, mode]);
  useEffect(() => {
    if (!enabled) return;
    const state = useGraphStore.getState(); const existing = state.lists[key];
    const isStale = !existing?.lastFetched || existing.stale || Date.now() - (existing.lastFetched ?? 0) > staleTime;
    if (!existing || isStale) doFetch({ page: 1, pageSize: listState.pageSize ?? undefined });
  }, [key, enabled, staleTime, doFetch, listState.pageSize]);
  useEffect(() => { if (listState.stale && enabled && !listState.isFetching) doFetch(); }, [listState.stale, enabled, listState.isFetching, doFetch]);
  // Stabilize the returned object identity. React 19's
  // `useSyncExternalStore` (which Zustand's `useStore` reads above)
  // warns "The result of getSnapshot should be cached to avoid an
  // infinite loop" whenever consumers see a fresh object identity per
  // render. The `useShallow(itemsSelector)` above keeps `items` stable
  // across no-op renders, and the `listState` selector already returns
  // a referentially-stable slice from the Zustand store; this useMemo
  // ensures the outer result shape consumers (e.g. `useTeam` →
  // `useQuickStats` → `KpiOutstanding`) read is also identity-stable.
  // See https://github.com/pmndrs/zustand/discussions/1936 and
  // https://react.dev/reference/react/useSyncExternalStore for the
  // contract being honoured here.
  return useMemo(
    () => ({
      items,
      ids: listState.ids,
      isLoading: listState.ids.length === 0 && listState.isFetching,
      isFetching: listState.isFetching,
      isFetchingMore: listState.isFetchingMore,
      error: listState.error,
      isError: listState.error !== null,
      hasNextPage: listState.hasNextPage,
      hasPrevPage: listState.hasPrevPage,
      total: listState.total,
      currentPage: listState.currentPage,
      fetchNextPage,
      refetch: doFetch,
    }),
    [items, listState, fetchNextPage, doFetch],
  );
}

/**
 * Options for graph-aware mutations: API call + optional normalization into `entities`, optimistic patches, and targeted invalidation.
 * Prefer `invalidateLists` prefixes / `invalidateEntities` over ad-hoc store calls so list UIs stay coherent.
 */
export interface MutationOptions<TInput, TRaw, TEntity extends object> {
  type: EntityType; mutate: (input: TInput) => Promise<TRaw>;
  normalize?: (raw: TRaw, input: TInput) => { id: EntityId; data: TEntity };
  optimistic?: (input: TInput) => { id: EntityId; patch: Partial<TEntity> } | null;
  invalidateLists?: string[]; invalidateEntities?: Array<{ type: EntityType; id: EntityId }>;
  onSuccess?: (result: TRaw, input: TInput) => void; onError?: (error: Error, input: TInput) => void;
}

/** Imperative mutation handle plus explicit async `state` for UI pending/error/success. */
export interface UseMutationResult<TInput, TRaw> {
  mutate: (input: TInput) => Promise<TRaw | null>; trigger: (input: TInput) => void;
  reset: () => void; state: { isPending: boolean; isSuccess: boolean; isError: boolean; error: string | null };
}

/**
 * Perform writes through your API while keeping the entity graph authoritative: optional optimistic `patchEntity`, commit via `upsertEntity`, rollback on failure.
 * Use when `useEntity`/`useEntityList` describe reads and you need a consistent mutation story without a second client cache.
 *
 * @example
 * ```tsx
 * const { mutate, state } = useEntityMutation({
 *   type: "Task",
 *   mutate: (input) => api.updateTask(input.id, input.patch),
 *   normalize: (raw) => ({ id: raw.id, data: raw }),
 * });
 * ```
 */
export function useEntityMutation<TInput, TRaw, TEntity extends object>(opts: MutationOptions<TInput, TRaw, TEntity>): UseMutationResult<TInput, TRaw> {
  const [state, setState] = useState({ isPending: false, isSuccess: false, isError: false, error: null as string | null });
  const optsRef = useRef(opts); optsRef.current = opts;
  const mutate = useCallback(async (input: TInput): Promise<TRaw | null> => {
    const { type, mutate: apiFn, normalize, optimistic, invalidateLists, invalidateEntities, onSuccess, onError } = optsRef.current;
    setState({ isPending: true, isSuccess: false, isError: false, error: null });
    let rollback: (() => void) | null = null;
    if (optimistic) {
      const opt = optimistic(input);
      if (opt) {
        const { id, patch } = opt; const store = useGraphStore.getState();
        const previous = { ...store.patches[type]?.[id] };
        const previousSync = store.syncMetadata[`${type}:${id}`];
        store.patchEntity(type, id, patch as Record<string, unknown>);
        store.setEntitySyncMetadata(type, id, { synced: false, origin: "optimistic", updatedAt: Date.now() });
        rollback = () => {
          const currentStore = useGraphStore.getState();
          if (Object.keys(previous).length > 0) currentStore.patchEntity(type, id, previous);
          else currentStore.clearPatch(type, id);
          if (previousSync) currentStore.setEntitySyncMetadata(type, id, previousSync);
          else currentStore.clearEntitySyncMetadata(type, id);
        };
      }
    }
    try {
      const result = await apiFn(input);
      if (normalize) {
        const { id, data } = normalize(result, input);
        const store = useGraphStore.getState();
        store.upsertEntity(type, id, data as Record<string, unknown>);
        store.setEntitySyncMetadata(type, id, { synced: true, origin: "server", updatedAt: Date.now() });
        if (optimistic) { const opt = optimistic(input); if (opt) store.clearPatch(type, opt.id); }
      }
      if (invalidateLists) for (const k of invalidateLists) useGraphStore.getState().invalidateLists(k);
      if (invalidateEntities) for (const { type: t, id } of invalidateEntities) useGraphStore.getState().invalidateEntity(t, id);
      setState({ isPending: false, isSuccess: true, isError: false, error: null });
      onSuccess?.(result, input); return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      rollback?.();
      setState({ isPending: false, isSuccess: false, isError: true, error: error.message });
      onError?.(error, input); return null;
    }
  }, []);
  const trigger = useCallback((input: TInput) => { void mutate(input); }, [mutate]);
  const reset = useCallback(() => setState({ isPending: false, isSuccess: false, isError: false, error: null }), []);
  return { mutate, trigger, reset, state };
}

/**
 * Read/write **UI-only** fields for one entity (`patches` layer) so selection, hover, or transient state is visible in every view that reads that id.
 * Does not replace `useEntityCRUD`’s edit buffer for form drafts — patches are for shared, non-persisted overlays.
 *
 * @param type - Entity kind
 * @param id - Entity id (no-ops when null/undefined)
 * @returns Current patch slice and helpers `augment` / `unaugment` / `clear`
 */
export function useEntityAugment<TEntity extends object>(type: EntityType, id: EntityId | null | undefined) {
  const patch = useStore(useGraphStore, useCallback((state) => id ? ((state.patches[type]?.[id] as Partial<TEntity>) ?? null) : null, [type, id]));
  const augment = useCallback((fields: Partial<TEntity>) => { if (!id) return; useGraphStore.getState().patchEntity(type, id, fields as Record<string, unknown>); }, [type, id]);
  const unaugment = useCallback((keys: (keyof TEntity)[]) => { if (!id) return; useGraphStore.getState().unpatchEntity(type, id, keys as string[]); }, [type, id]);
  const clear = useCallback(() => { if (!id) return; useGraphStore.getState().clearPatch(type, id); }, [type, id]);
  return { patch, augment, unaugment, clear };
}

/** In-flight Suspense waiters keyed like the entity engine (`${type}:${id}`). */
const suspenseEntityPromises = new Map<string, Promise<void>>();

/** In-flight Suspense waiters keyed by `serializeKey(queryKey)`. */
const suspenseListPromises = new Map<string, Promise<void>>();

function getEntitySuspensePromise(type: EntityType, id: EntityId): Promise<void> {
  const key = `${type}:${id}`;
  const existing = suspenseEntityPromises.get(key);
  if (existing) return existing;

  let unsub: (() => void) | null = null;
  let settled = false;

  const promise = new Promise<void>((resolve, reject) => {
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      unsub?.();
      unsub = null;
      fn();
    };

    const inspect = (state: ReturnType<typeof useGraphStore.getState>) => {
      if (settled) return;
      const hasData = !!state.entities[type]?.[id];
      const es = state.entityStates[key];
      if (hasData) settle(() => resolve());
      else if (es != null && es.error != null && !es.isFetching) {
        const msg = es.error;
        settle(() => reject(new Error(msg)));
      }
    };

    inspect(useGraphStore.getState());
    if (!settled) unsub = useGraphStore.subscribe((state) => inspect(state));
  });

  const tracked = promise.finally(() => { suspenseEntityPromises.delete(key); });
  suspenseEntityPromises.set(key, tracked);
  return tracked;
}

function getListSuspensePromise(listKey: string): Promise<void> {
  const existing = suspenseListPromises.get(listKey);
  if (existing) return existing;

  let unsub: (() => void) | null = null;
  let settled = false;

  const promise = new Promise<void>((resolve, reject) => {
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      unsub?.();
      unsub = null;
      fn();
    };

    const inspect = (state: ReturnType<typeof useGraphStore.getState>) => {
      if (settled) return;
      const list = state.lists[listKey] ?? EMPTY_LIST_STATE;
      if (list.ids.length > 0) settle(() => resolve());
      else if (list.error != null && !list.isFetching) {
        const msg = list.error;
        settle(() => reject(new Error(msg)));
      }
      else if (list.ids.length === 0 && !list.isFetching && list.lastFetched != null) settle(() => resolve());
    };

    inspect(useGraphStore.getState());
    if (!settled) unsub = useGraphStore.subscribe((state) => inspect(state));
  });

  const tracked = promise.finally(() => { suspenseListPromises.delete(listKey); });
  suspenseListPromises.set(listKey, tracked);
  return tracked;
}

/**
 * Suspense-compatible version of `useEntity`. Throws a promise while the entity
 * is loading, allowing React Suspense boundaries to show fallback UI.
 * Once data is available, returns the entity data directly (never null).
 *
 * @param opts - Same as `useEntity` (`EntityQueryOptions`)
 * @returns `data` plus `isFetching`, `isStale`, and `refetch`
 * @throws Promise while loading (caught by the nearest Suspense boundary)
 * @throws Error if the fetch fails with no data, if `id` is missing when required, or if the entity never resolves
 */
export function useSuspenseEntity<TRaw, TEntity extends object>(
  opts: EntityQueryOptions<TRaw, TEntity>
): { data: TEntity; isFetching: boolean; isStale: boolean; refetch: () => void } {
  const result = useEntity(opts);
  const { type, id } = opts;

  if (result.isLoading) {
    if (!id) throw new Error("useSuspenseEntity requires a non-null entity id");
    throw getEntitySuspensePromise(type, id);
  }

  if (result.error != null && result.data == null) {
    throw new Error(result.error);
  }

  if (result.data == null) {
    throw new Error(!id ? "useSuspenseEntity requires a non-null entity id" : "Entity not found");
  }

  return {
    data: result.data,
    isFetching: result.isFetching,
    isStale: result.isStale,
    refetch: result.refetch,
  };
}

/**
 * Suspense-compatible version of `useEntityList`. Throws a promise during
 * initial load, allowing Suspense boundaries to handle loading state.
 *
 * @param opts - Same as `useEntityList` (`ListQueryOptions`)
 * @returns Same shape as `useEntityList` except `isLoading` is omitted (always false when not suspended)
 * @throws Promise while initially loading (caught by the nearest Suspense boundary)
 * @throws Error if the fetch fails while the list is still empty
 */
export function useSuspenseEntityList<TRaw, TEntity extends object>(
  opts: ListQueryOptions<TRaw, TEntity>
): Omit<UseEntityListResult<TEntity>, "isLoading"> {
  const key = useMemo(() => serializeKey(opts.queryKey), [opts.queryKey]);
  const result = useEntityList(opts);

  if (result.isLoading) throw getListSuspensePromise(key);

  if (result.error != null && result.items.length === 0) {
    throw new Error(result.error);
  }

  const { isLoading: _isLoading, ...rest } = result;
  return rest;
}
