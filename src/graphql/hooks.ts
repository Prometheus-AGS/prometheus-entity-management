/**
 * graphql/hooks.ts
 *
 * React hooks for GraphQL. Mirror of REST hooks — same graph, same stale/fetch logic.
 * After normalization data lives in the same entity graph, so a GQL mutation
 * immediately updates REST useEntity subscribers and vice versa.
 */
import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import { useGraphStore, EMPTY_ENTITY_STATE, EMPTY_LIST_STATE, EMPTY_IDS } from "../graph";
import { registerSubscriber, unregisterSubscriber, getEngineOptions, serializeKey } from "../engine";
import type { GQLClient, EntityDescriptor } from "./client";
import type { EntityType, EntityId, EntityState, ListState } from "../graph";

// ---------------------------------------------------------------------------
// useGQLEntity
// ---------------------------------------------------------------------------
export interface GQLEntityOptions<TData, TEntity extends Record<string, unknown>> {
  client: GQLClient; document: string; variables?: Record<string, unknown>;
  type: EntityType; id: EntityId | null | undefined;
  descriptor: EntityDescriptor<unknown, TEntity>;
  sideDescriptors?: EntityDescriptor<unknown, Record<string, unknown>>[];
  staleTime?: number; enabled?: boolean;
  onSuccess?: (data: TData) => void; onError?: (err: Error) => void;
}

export function useGQLEntity<TData, TEntity extends Record<string, unknown>>(opts: GQLEntityOptions<TData, TEntity>) {
  const { type, id, staleTime = getEngineOptions().defaultStaleTime, enabled = true } = opts;
  const optsRef = useRef(opts); optsRef.current = opts;

  const data = useStore(useGraphStore, useShallow((s) => {
    if (!id) return null;
    return s.readEntitySnapshot<TEntity>(type, id) as TEntity | null;
  }));

  const entityState = useStore(useGraphStore, useCallback((s): EntityState =>
    s.entityStates[`${type}:${id}`] ?? EMPTY_ENTITY_STATE,
  [type, id]));

  const doFetch = useCallback(() => {
    if (!id || !enabled) return;
    const { client, document, variables, descriptor, sideDescriptors, onSuccess, onError } = optsRef.current;
    useGraphStore.getState().setEntityFetching(type, id, true);
    client.query<TData, Record<string, unknown>>({
      document, variables: { ...variables, id },
      descriptors: sideDescriptors ? [descriptor as EntityDescriptor<unknown, Record<string, unknown>>, ...sideDescriptors] : [descriptor as EntityDescriptor<unknown, Record<string, unknown>>],
      cacheKey: `gql-entity:${type}:${id}:${document.slice(0, 40)}`,
    }).then((r) => {
      useGraphStore.getState().setEntityFetched(type, id);
      if (r.data) onSuccess?.(r.data);
    }).catch((e: Error) => { useGraphStore.getState().setEntityError(type, id, e.message); onError?.(e); });
  }, [id, type, enabled]);

  useEffect(() => {
    if (!id || !enabled) return;
    const token = registerSubscriber(`${type}:${id}`);
    const s = useGraphStore.getState(); const ex = s.entityStates[`${type}:${id}`];
    if (!s.entities[type]?.[id] || !ex?.lastFetched || ex.stale || Date.now() - (ex.lastFetched ?? 0) > staleTime) doFetch();
    return () => unregisterSubscriber(`${type}:${id}`, token);
  }, [id, type, enabled, staleTime, doFetch]);

  useEffect(() => { if (entityState.stale && id && enabled && !entityState.isFetching) doFetch(); }, [entityState.stale, id, enabled, entityState.isFetching, doFetch]);

  return { data, isLoading: !data && entityState.isFetching, isFetching: entityState.isFetching, error: entityState.error, isStale: entityState.stale, refetch: doFetch };
}

// ---------------------------------------------------------------------------
// useGQLList
// ---------------------------------------------------------------------------
export interface GQLListOptions<TData, TEntity extends Record<string, unknown>> {
  client: GQLClient; document: string; variables?: Record<string, unknown>;
  type: EntityType; queryKey: unknown[];
  descriptor: EntityDescriptor<unknown, TEntity>;
  getItems: (data: TData) => unknown[];
  getPagination?: (data: TData) => { total?: number; nextCursor?: string; hasNextPage?: boolean; page?: number; pageSize?: number };
  sideDescriptors?: EntityDescriptor<unknown, Record<string, unknown>>[];
  mode?: "replace" | "append"; staleTime?: number; enabled?: boolean;
}

export function useGQLList<TData, TEntity extends Record<string, unknown>>(opts: GQLListOptions<TData, TEntity>) {
  const { type, queryKey, staleTime = getEngineOptions().defaultStaleTime, enabled = true, mode = "replace" } = opts;
  const optsRef = useRef(opts); optsRef.current = opts;
  const key = useMemo(() => serializeKey(queryKey), [queryKey]);

  const listState = useStore(useGraphStore, useCallback((s): ListState => s.lists[key] ?? EMPTY_LIST_STATE, [key]));

  const items = useStore(
    useGraphStore,
    useShallow((s) => {
      const ids = s.lists[key]?.ids ?? EMPTY_IDS;
      return ids
        .map((id) => s.readEntitySnapshot<TEntity>(type, id))
        .filter((x) => x !== null) as TEntity[];
    }),
  );

  const doFetch = useCallback((cursor?: string, append = false) => {
    if (!enabled) return;
    const { client, document, variables, descriptor, sideDescriptors, getItems, getPagination } = optsRef.current;
    const store = useGraphStore.getState();
    if (append) store.setListFetchingMore(key, true); else store.setListFetching(key, true);
    const vars = { ...variables, ...(cursor ? { cursor } : {}) };
    client.query<TData, Record<string, unknown>>({
      document, variables: vars,
      descriptors: sideDescriptors ? [descriptor as EntityDescriptor<unknown, Record<string, unknown>>, ...sideDescriptors] : [descriptor as EntityDescriptor<unknown, Record<string, unknown>>],
      cacheKey: `gql-list:${key}:${cursor ?? "first"}`,
    }).then((r) => {
      if (!r.data) return;
      const rawItems = getItems(r.data); const pag = getPagination?.(r.data) ?? {};
      const { extractId = (n: Record<string, unknown>) => String(n.id) } = descriptor;
      const ids = rawItems.map((item) => extractId(item as Record<string, unknown>));
      const meta = { total: pag.total ?? null, nextCursor: pag.nextCursor ?? null, hasNextPage: pag.hasNextPage ?? !!pag.nextCursor, currentPage: pag.page ?? null, pageSize: pag.pageSize ?? null };
      if (append && mode === "append") useGraphStore.getState().appendListResult(key, ids, meta);
      else useGraphStore.getState().setListResult(key, ids, meta);
    }).catch((e: Error) => useGraphStore.getState().setListError(key, e.message));
  }, [key, enabled, mode]);

  useEffect(() => {
    if (!enabled) return;
    const ex = useGraphStore.getState().lists[key];
    if (!ex || ex.stale || !ex.lastFetched || Date.now() - ex.lastFetched > staleTime) doFetch();
  }, [key, enabled, staleTime, doFetch]);

  useEffect(() => { if (listState.stale && enabled && !listState.isFetching) doFetch(); }, [listState.stale, enabled, listState.isFetching, doFetch]);

  const fetchNextPage = useCallback(() => { if (!listState.hasNextPage || listState.isFetchingMore) return; doFetch(listState.nextCursor ?? undefined, true); }, [listState.hasNextPage, listState.isFetchingMore, listState.nextCursor, doFetch]);

  return { items, ids: listState.ids, isLoading: listState.ids.length === 0 && listState.isFetching, isFetching: listState.isFetching, isFetchingMore: listState.isFetchingMore, error: listState.error, hasNextPage: listState.hasNextPage, total: listState.total, currentPage: listState.currentPage, fetchNextPage, refetch: () => doFetch() };
}

// ---------------------------------------------------------------------------
// useGQLMutation
// ---------------------------------------------------------------------------
export function useGQLMutation<TData, TEntity extends Record<string, unknown>>(opts: {
  client: GQLClient; document: string; type: string;
  descriptors?: EntityDescriptor<unknown, TEntity>[];
  optimistic?: (variables: Record<string, unknown>) => void;
  invalidateLists?: string[];
  onSuccess?: (data: TData) => void; onError?: (err: Error) => void;
}) {
  const optsRef = useRef(opts); optsRef.current = opts;
  const [state, setState] = useState({ isPending: false, isSuccess: false, isError: false, error: null as string | null });
  const mutate = useCallback(async (variables: Record<string, unknown>) => {
    const { client, document, descriptors, optimistic, invalidateLists, onSuccess, onError } = optsRef.current;
    setState({ isPending: true, isSuccess: false, isError: false, error: null });
    try {
      const r = await client.mutate<TData, TEntity>({ document, variables, descriptors, optimistic: optimistic ? () => optimistic(variables) : undefined });
      if (invalidateLists) for (const k of invalidateLists) useGraphStore.getState().invalidateLists(k);
      setState({ isPending: false, isSuccess: true, isError: false, error: null });
      if (r.data) onSuccess?.(r.data); return r;
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      setState({ isPending: false, isSuccess: false, isError: true, error: e.message }); onError?.(e); return null;
    }
  }, []);
  const trigger = useCallback((v: Record<string, unknown>) => { void mutate(v); }, [mutate]);
  return { mutate, trigger, state };
}

// ---------------------------------------------------------------------------
// useGQLSubscription
// ---------------------------------------------------------------------------
export function useGQLSubscription<TData>(opts: {
  client: GQLClient; wsClient: { subscribe: (payload: unknown, sink: unknown) => () => void };
  document: string; variables?: Record<string, unknown>;
  descriptors: EntityDescriptor<unknown, Record<string, unknown>>[];
  onData?: (data: TData) => void; onError?: (err: unknown) => void; enabled?: boolean;
}) {
  const { document, variables, enabled = true } = opts;
  const [status, setStatus] = useState({ connected: false, error: null as string | null });
  const optsRef = useRef(opts); optsRef.current = opts;
  useEffect(() => {
    const { client, wsClient, descriptors, onData, onError } = optsRef.current;
    if (!enabled) return;
    const unsub = client.subscribe<TData>({ document, variables, descriptors, wsClient, onData: (d) => { setStatus({ connected: true, error: null }); onData?.(d); }, onError: (e) => { setStatus({ connected: false, error: String(e) }); onError?.(e); } });
    setStatus({ connected: true, error: null }); return unsub;
  }, [document, variables, enabled]);
  return status;
}
