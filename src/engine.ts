import { useGraphStore } from "./graph";
import type { EntityType, EntityId } from "./graph";

/**
 * Process-wide defaults for stale times, retries, and background revalidation.
 * Keeps hook signatures small: `useEntity` / `useEntityList` merge these with per-query overrides.
 */
export interface EngineOptions {
  defaultStaleTime?: number;
  /** Max age (`Date.now() - lastFetched`) for evicting entities with zero subscribers during GC. */
  defaultGcTime?: number;
  /** Interval between GC passes when the collector is active (default 60s). */
  gcInterval?: number;
  maxRetries?: number;
  retryBaseDelay?: number;
  revalidateOnFocus?: boolean;
  revalidateOnReconnect?: boolean;
}

/**
 * Declarative **instruction** for loading one entity: wire transport (`fetch`), normalization, and graph writes.
 * Hooks pass this to `fetchEntity`; the graph remains source of truth after success.
 */
export interface EntityQueryOptions<TRaw, TEntity extends object> {
  type: EntityType;
  id: EntityId | null | undefined;
  fetch: (id: EntityId) => Promise<TRaw>;
  normalize: (raw: TRaw) => TEntity;
  idField?: string;
  sideEffects?: (raw: TRaw, store: typeof useGraphStore) => void;
  staleTime?: number;
  enabled?: boolean;
  onSuccess?: (entity: TEntity) => void;
  onError?: (error: Error) => void;
}

/** Cursor/page knobs passed through to list `fetch` implementations (REST, GraphQL, etc.). */
export interface ListFetchParams {
  cursor?: string;
  page?: number;
  pageSize?: number;
  params?: Record<string, unknown>;
}

/**
 * Normalized list page shape from any backend. Items are mapped through `normalize` into `{ id, data }` upserts — the list stores ids only.
 */
export interface ListResponse<T> {
  items: T[];
  total?: number | null;
  nextCursor?: string | null;
  prevCursor?: string;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * Declarative **instruction** for a collection query: stable `queryKey`, fetcher, and per-row normalization into the graph.
 * `mode` controls whether a fetch replaces ids or appends (infinite scroll) when used with load-more.
 */
export interface ListQueryOptions<TRaw, TEntity extends object> {
  type: EntityType;
  queryKey: unknown[];
  fetch: (params: ListFetchParams) => Promise<ListResponse<TRaw>>;
  normalize: (raw: TRaw) => { id: EntityId; data: TEntity };
  sideEffects?: (items: TRaw[], store: typeof useGraphStore) => void;
  mode?: "replace" | "append";
  staleTime?: number;
  enabled?: boolean;
  onSuccess?: (result: ListResponse<TRaw>) => void;
  onError?: (error: Error) => void;
}

/**
 * Deterministic string key for list queries so object order in nested keys does not create duplicate cache entries.
 * @param key - Hook-provided query key array (serializable values)
 */
export function serializeKey(key: unknown[]): string {
  return JSON.stringify(key, (_, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort()) : v);
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

const inflight = new Map<string, Promise<unknown>>();
/**
 * Collapse concurrent identical requests into one Promise (prevents stampedes when many components mount the same entity/list).
 * @param key - Logical dedupe key (e.g. `type:id` or serialized list key)
 * @param fn - Async work that performs the fetch + graph writes
 */
export function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p); return p;
}

const subscriberStatsListeners = new Set<() => void>();
function emitSubscriberStatsChange() {
  for (const cb of subscriberStatsListeners) cb();
}

const subscribers = new Map<string, Set<symbol>>();
/**
 * Ref-count graph interest for a subscriber key (`${type}:${id}`). Background revalidation skips keys with zero subscribers.
 * @returns Opaque token required for `unregisterSubscriber`
 */
export function registerSubscriber(key: string): symbol {
  const token = Symbol(key);
  if (!subscribers.has(key)) subscribers.set(key, new Set());
  subscribers.get(key)!.add(token);
  emitSubscriberStatsChange();
  return token;
}
/** Pair with `registerSubscriber` on unmount so idle entities stop refetching. */
export function unregisterSubscriber(key: string, token: symbol) {
  const set = subscribers.get(key);
  if (!set) return;
  set.delete(token);
  if (set.size === 0) subscribers.delete(key);
  emitSubscriberStatsChange();
}
/** Used by the engine to avoid background work for keys nothing in the tree is observing. */
export function hasSubscribers(key: string) { return (subscribers.get(key)?.size ?? 0) > 0; }

const DEFAULT_OPTIONS: Required<EngineOptions> = {
  defaultStaleTime: 30_000,
  defaultGcTime: 300_000,
  gcInterval: 60_000,
  maxRetries: 3,
  retryBaseDelay: 1_000,
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
};
let engineOptions: Required<EngineOptions> = { ...DEFAULT_OPTIONS };

/**
 * Subscribe to ref-count changes for `registerSubscriber` / `unregisterSubscriber`.
 * Used by `useGraphDevTools` so subscriber totals update without graph mutations.
 */
export function subscribeSubscriberStats(onChange: () => void) {
  subscriberStatsListeners.add(onChange);
  return () => subscriberStatsListeners.delete(onChange);
}

/** Total active entity subscriber tokens across all keys (sum of ref-counts). */
export function getActiveSubscriberCount(): number {
  let n = 0;
  for (const set of subscribers.values()) n += set.size;
  return n;
}

let gcIntervalId: ReturnType<typeof setInterval> | null = null;

/**
 * One GC pass: removes entities that are unobserved, older than `defaultGcTime`, not fetching,
 * and have no non-empty local patches; then strips their ids from all lists.
 */
function runGarbageCollection(): void {
  const store = useGraphStore.getState();
  const { defaultGcTime: gcTime } = getEngineOptions();
  const now = Date.now();
  const toRemove: Array<{ type: EntityType; id: EntityId }> = [];

  for (const type of Object.keys(store.entities)) {
    const bucket = store.entities[type];
    if (!bucket) continue;
    for (const id of Object.keys(bucket)) {
      const key = `${type}:${id}`;
      if (hasSubscribers(key)) continue;
      const patch = store.patches[type]?.[id];
      if (patch !== undefined && Object.keys(patch).length > 0) continue;
      const entityState = store.entityStates[key];
      if (entityState?.isFetching) continue;
      const lastFetched = entityState?.lastFetched;
      if (lastFetched == null) continue;
      if (now - lastFetched <= gcTime) continue;
      toRemove.push({ type, id });
    }
  }

  for (const { type, id } of toRemove) {
    store.removeEntity(type, id);
    store.removeIdFromAllLists(type, id);
  }
}

/**
 * Stops the periodic garbage-collection timer started by `startGarbageCollector` / `configureEngine`.
 */
export function stopGarbageCollector(): void {
  if (gcIntervalId != null && typeof clearInterval !== "undefined") {
    clearInterval(gcIntervalId);
    gcIntervalId = null;
  }
}

/**
 * Starts periodic garbage collection using current `getEngineOptions().gcInterval`.
 * Stops any previous interval first. No-ops during SSR (`window` is undefined) or without `setInterval`.
 * @returns Disposer that stops this collector (equivalent to `stopGarbageCollector`).
 */
export function startGarbageCollector(): () => void {
  stopGarbageCollector();
  if (typeof window === "undefined" || typeof setInterval === "undefined") return () => {};
  gcIntervalId = setInterval(() => runGarbageCollection(), getEngineOptions().gcInterval);
  return () => stopGarbageCollector();
}

function restartGarbageCollector() {
  startGarbageCollector();
}

/** Override global engine behavior (typically once at app bootstrap). Restarts GC with merged options. */
export function configureEngine(opts: EngineOptions) {
  engineOptions = { ...DEFAULT_OPTIONS, ...opts };
  restartGarbageCollector();
}
/** Read merged engine options; hooks use this for default `staleTime` and retry behavior. */
export function getEngineOptions() { return engineOptions; }

/**
 * Run a single-entity fetch with dedupe, retries, normalization, and graph updates.
 * Call from hooks/adapters — not from presentational components.
 */
export async function fetchEntity<TRaw, TEntity extends object>(
  opts: EntityQueryOptions<TRaw, TEntity>, engineOpts: Required<EngineOptions>
) {
  const { type, id, fetch, normalize, sideEffects, idField = "id" } = opts;
  if (!id) return;
  useGraphStore.getState().setEntityFetching(type, id, true);
  const attempt = async (retries: number): Promise<void> => {
    try {
      const raw = await fetch(id);
      const normalized = normalize(raw);
      const resolvedId = (normalized as Record<string, unknown>)[idField] as EntityId ?? id;
      useGraphStore.getState().upsertEntity(type, resolvedId, normalized as Record<string, unknown>);
      useGraphStore.getState().setEntityFetched(type, resolvedId);
      if (sideEffects) sideEffects(raw, useGraphStore);
      opts.onSuccess?.(normalized);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (retries < engineOpts.maxRetries) { await sleep(engineOpts.retryBaseDelay * Math.pow(2, retries)); return attempt(retries + 1); }
      useGraphStore.getState().setEntityError(type, id, error.message);
      opts.onError?.(error);
    }
  };
  await dedupe(`${type}:${id}`, () => attempt(0));
}

/**
 * Fetch a list page: upserts all rows, writes ids to the list key, supports append mode for pagination.
 * @param isLoadMore - When true, uses a separate dedupe key and `appendListResult` / `setListFetchingMore`.
 */
export async function fetchList<TRaw, TEntity extends object>(
  opts: ListQueryOptions<TRaw, TEntity>, params: ListFetchParams, engineOpts: Required<EngineOptions>, isLoadMore = false
) {
  const { type, queryKey, fetch, normalize, sideEffects, mode = "replace" } = opts;
  const key = serializeKey(queryKey);
  const store = useGraphStore.getState();
  if (isLoadMore) store.setListFetchingMore(key, true);
  else store.setListFetching(key, true);
  const attempt = async (retries: number): Promise<void> => {
    try {
      const response = await fetch(params);
      const normalized = response.items.map(normalize);
      useGraphStore.getState().upsertEntities(type, normalized.map(({ id, data }) => ({ id, data: data as Record<string, unknown> })));
      for (const { id } of normalized) useGraphStore.getState().setEntityFetched(type, id);
      const ids = normalized.map(({ id }) => id);
      const meta = { total: response.total ?? null, nextCursor: response.nextCursor ?? null, prevCursor: response.prevCursor ?? null, hasNextPage: response.hasNextPage ?? !!response.nextCursor, hasPrevPage: response.hasPrevPage ?? !!response.prevCursor, currentPage: response.page ?? null, pageSize: response.pageSize ?? null };
      if (mode === "append" && isLoadMore) useGraphStore.getState().appendListResult(key, ids, meta);
      else useGraphStore.getState().setListResult(key, ids, meta);
      if (sideEffects) sideEffects(response.items, useGraphStore);
      opts.onSuccess?.(response);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      if (retries < engineOpts.maxRetries) { await sleep(engineOpts.retryBaseDelay * Math.pow(2, retries)); return attempt(retries + 1); }
      useGraphStore.getState().setListError(key, error.message);
      opts.onError?.(error);
    }
  };
  await dedupe(isLoadMore ? `${key}:more` : key, () => attempt(0));
}

let focusListenerAttached = false;
/**
 * Opt-in window listeners that mark **subscribed** entities stale on focus/reconnect so hooks can SWR-refetch.
 * Idempotent; safe for SSR (no-ops without `window`). Pair with `configureEngine` flags.
 */
export function attachGlobalListeners() {
  if (typeof window === "undefined" || focusListenerAttached) return;
  focusListenerAttached = true;
  // Start GC on first client attach so defaultGcTime applies even without configureEngine().
  restartGarbageCollector();
  const revalidateAll = () => {
    const state = useGraphStore.getState();
    for (const key of subscribers.keys()) {
      if (!hasSubscribers(key)) continue;
      const colonIdx = key.indexOf(":");
      if (colonIdx === -1) continue;
      const type = key.slice(0, colonIdx);
      const id = key.slice(colonIdx + 1);
      state.setEntityStale(type, id, true);
    }
  };
  if (engineOptions.revalidateOnFocus) {
    window.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") revalidateAll(); });
    window.addEventListener("focus", revalidateAll);
  }
  if (engineOptions.revalidateOnReconnect) window.addEventListener("online", revalidateAll);
}
