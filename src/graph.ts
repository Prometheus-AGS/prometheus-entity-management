import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { EntityError } from "./errors";

/** Logical entity kind (e.g. `"Post"`). Used to partition the normalized graph. */
export type EntityType = string;
/** Primary key for an entity within its `type`. Lists and relations reference this, not row copies. */
export type EntityId = string;
/** Stable string key for a list query (often `JSON.stringify`-shaped). Lists store IDs only under this key. */
export type QueryKey = string;
/** Provenance of the latest known entity state. */
export type SyncOrigin = "server" | "client" | "optimistic";

/** Optional sync-facing metadata kept outside canonical entity payloads. */
export interface EntitySyncMetadata {
  synced: boolean;
  origin: SyncOrigin;
  updatedAt: number | null;
}

/** Snapshot shape returned by sync-aware reads and graph-native query helpers. */
export type EntitySnapshot<T extends object> = T & {
  $synced: boolean;
  $origin: SyncOrigin;
  $updatedAt: number | null;
};

/**
 * Fetch/cache metadata for a single entity instance (`type:id`).
 * Separates transport concerns from canonical `entities` data so hooks can show spinners and stale-while-revalidate without mutating server-shaped fields.
 */
export interface EntityState {
  isFetching: boolean;
  lastFetched: number | null;
  error: string | null;
  stale: boolean;
}

/**
 * Ordered **IDs** for a list query plus pagination metadata — never embedded entity payloads.
 * Cross-view reactivity depends on this: when `entities[type][id]` updates, every list containing that id re-resolves rows from the graph.
 */
export interface ListState {
  ids: EntityId[];
  total: number | null;
  nextCursor: string | null;
  prevCursor: string | null;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  isFetching: boolean;
  isFetchingMore: boolean;
  error: string | null;
  /**
   * Typed error instance for 2.0 hooks (`useEntities`, `useEntityQuery`).
   * Carries `TerminalError` / `TransientError` so consumers can
   * `instanceof`-check the failure mode without parsing the string in
   * `error`. Both fields are written together by `setListError`; the
   * string `error` field remains for back-compat with 1.x consumers.
   */
  lastError: EntityError | null;
  lastFetched: number | null;
  stale: boolean;
  currentPage: number | null;
  pageSize: number | null;
}

/**
 * Stable fallbacks for missing `lists[key]` / `entityStates[key]` slots.
 * Inline `?? { ... }` defaults allocate new objects every `getSnapshot` call and trigger React 19
 * “getSnapshot should be cached” / maximum update depth errors with `useSyncExternalStore`.
 */
export const EMPTY_IDS: EntityId[] = [];

export const EMPTY_ENTITY_STATE: EntityState = {
  isFetching: false,
  lastFetched: null,
  error: null,
  stale: false,
};

export const EMPTY_SYNC_METADATA: EntitySyncMetadata = {
  synced: true,
  origin: "server",
  updatedAt: null,
};

export const EMPTY_LIST_STATE: ListState = {
  ids: EMPTY_IDS,
  total: null,
  nextCursor: null,
  prevCursor: null,
  hasNextPage: false,
  hasPrevPage: false,
  isFetching: false,
  isFetchingMore: false,
  error: null,
  lastError: null,
  lastFetched: null,
  stale: false,
  currentPage: null,
  pageSize: null,
};

/**
 * Canonical Zustand store: **entities** (server truth), **patches** (UI-only overlay), **lists** (id order + list meta), and **entityStates** (per-entity fetch state).
 * Prefer hooks for React reads; use `useGraphStore.getState()` inside stores/adapters/engine code where React is not available.
 */
export interface GraphState {
  /** Normalized server-confirmed records. Mutate only via upsert/replace/remove — not from components. */
  entities: Record<EntityType, Record<EntityId, Record<string, unknown>>>;
  /** Local-only fields merged at read time (`readEntity` / hooks). Never send patches to the server. */
  patches: Record<EntityType, Record<EntityId, Record<string, unknown>>>;
  /** Per-entity fetch lifecycle keyed as `${type}:${id}`. */
  entityStates: Record<string, EntityState>;
  /** Optional sync/provenance state layered beside the canonical entity payload. */
  syncMetadata: Record<string, EntitySyncMetadata>;
  /** List slots keyed by serialized query keys. Values hold id arrays and pagination — not entity clones. */
  lists: Record<QueryKey, ListState>;
  /**
   * Shallow-merge `data` into the canonical entity. Use when the API returns partial updates or normalized fragments.
   * @param type - Entity kind
   * @param id - Entity id
   * @param data - Fields to merge into existing canonical data
   */
  upsertEntity: (type: EntityType, id: EntityId, data: Record<string, unknown>) => void;
  /**
   * Batch upsert for list endpoints — avoids N separate writes when hydrating many rows at once.
   * @param type - Entity kind
   * @param entries - Pairs of id + partial/full payloads to merge
   */
  upsertEntities: (type: EntityType, entries: Array<{ id: EntityId; data: Record<string, unknown> }>) => void;
  /**
   * Replace the canonical entity entirely (no merge). Use when the server returns a full snapshot and partial merge would leave stale keys behind.
   */
  replaceEntity: (type: EntityType, id: EntityId, data: Record<string, unknown>) => void;
  /** Remove canonical entity, its patches, and its entityState. Does not remove the id from lists — use `removeIdFromAllLists` if needed. */
  removeEntity: (type: EntityType, id: EntityId) => void;
  /**
   * Merge UI-only fields into `patches` so every subscriber sees selection, expansion, optimistic toggles, etc., without forking canonical data.
   */
  patchEntity: (type: EntityType, id: EntityId, patch: Record<string, unknown>) => void;
  /** Remove specific patch keys; other patch keys remain. */
  unpatchEntity: (type: EntityType, id: EntityId, keys: string[]) => void;
  /** Drop all patches for an entity (e.g. after successful mutation when server data is authoritative). */
  clearPatch: (type: EntityType, id: EntityId) => void;
  /** Reflect in-flight GET for a single entity (deduped fetches in the engine still flip this once per logical request). */
  setEntityFetching: (type: EntityType, id: EntityId, fetching: boolean) => void;
  /** Persist terminal fetch failure message and clear fetching — hooks surface `error` while leaving prior data if any. */
  setEntityError: (type: EntityType, id: EntityId, error: string | null) => void;
  /** Mark entity successfully loaded; clears error, fetching, stale, and updates `lastFetched`. */
  setEntityFetched: (type: EntityType, id: EntityId) => void;
  /** Drive background revalidation: when true, hooks refetch while still showing cached `readEntity` data. */
  setEntityStale: (type: EntityType, id: EntityId, stale: boolean) => void;
  /** Merge sync metadata for one entity without polluting canonical server fields. */
  setEntitySyncMetadata: (type: EntityType, id: EntityId, metadata: Partial<EntitySyncMetadata>) => void;
  /** Clear sync metadata for one entity. */
  clearEntitySyncMetadata: (type: EntityType, id: EntityId) => void;
  /**
   * Replace list ids and merge pagination meta after a primary list fetch (not load-more).
   * Resets fetching flags and clears list error on success path (engine calls this after normalize).
   */
  setListResult: (key: QueryKey, ids: EntityId[], meta: Partial<Omit<ListState, "ids" | "isFetching" | "isFetchingMore" | "error" | "stale">>) => void;
  /** Append unique ids (e.g. infinite scroll) while merging meta; dedupes id order. */
  appendListResult: (key: QueryKey, ids: EntityId[], meta: Partial<Omit<ListState, "ids" | "isFetching" | "isFetchingMore" | "error" | "stale">>) => void;
  /** Prepend ids (e.g. “new item at top”) with optional meta merge. */
  prependListResult: (key: QueryKey, ids: EntityId[], meta?: Partial<ListState>) => void;
  /** After deletes, keep every list consistent by removing an id everywhere it appears and decrementing `total` when tracked. */
  removeIdFromAllLists: (type: EntityType, id: EntityId) => void;
  /**
   * Insert or move an id in one list. If the id already exists, it is removed first then re-inserted at `position`.
   * @param position - `"start"`, `"end"`, or numeric index
   */
  insertIdInList: (key: QueryKey, id: EntityId, position: "start" | "end" | number) => void;
  /** Initial or full list fetch in progress (not page-2+). */
  setListFetching: (key: QueryKey, fetching: boolean) => void;
  /** Pagination / “load more” in progress for the same list key. */
  setListFetchingMore: (key: QueryKey, fetchingMore: boolean) => void;
  /**
   * Record list fetch failure; clears both fetching flags.
   * The optional `typed` argument is the typed `EntityError` instance
   * (used by 2.0 hooks); when omitted only the string `error` field is
   * populated (back-compat with 1.x callers).
   */
  setListError: (key: QueryKey, error: string | null, typed?: EntityError | null) => void;
  /** Mark a list query stale so hooks can refetch without discarding current ids (stale-while-revalidate). */
  setListStale: (key: QueryKey, stale: boolean) => void;
  /**
   * Mark one or all entities of a type stale for subscriber-driven refetch. Does not delete data.
   * @param id - Omit to stale every entity of `type`
   */
  invalidateEntity: (type: EntityType, id?: EntityId) => void;
  /**
   * Mark lists stale by key prefix or custom predicate so the next access triggers background refresh without dropping ids immediately.
   */
  invalidateLists: (matcher: string | ((key: QueryKey) => boolean)) => void;
  /** Convenience: stale all entities of a type and lists whose keys start with `type`. */
  invalidateType: (type: EntityType) => void;
  /**
   * Single read path: `{ ...entities[type][id], ...patches[type][id] }` or null if no canonical row exists.
   * @returns Merged view suitable for rendering; not a deep clone
   */
  readEntity: <T = Record<string, unknown>>(type: EntityType, id: EntityId) => T | null;
  /**
   * Sync-aware read path: canonical entity + patches + virtual sync metadata (`$synced`, `$origin`, `$updatedAt`).
   */
  readEntitySnapshot: <T = Record<string, unknown>>(type: EntityType, id: EntityId) => EntitySnapshot<T & Record<string, unknown>> | null;
}

function defaultEntityState(): EntityState {
  return { ...EMPTY_ENTITY_STATE };
}

function defaultSyncMetadata(): EntitySyncMetadata {
  return { ...EMPTY_SYNC_METADATA };
}

function defaultListState(): ListState {
  return { ...EMPTY_LIST_STATE, ids: [] };
}

function ek(type: EntityType, id: EntityId) { return `${type}:${id}`; }

interface SnapshotCacheEntry {
  base: Record<string, unknown>;
  patch: Record<string, unknown> | undefined;
  metadata: EntitySyncMetadata;
  snapshot: EntitySnapshot<Record<string, unknown>>;
}

const snapshotCache = new Map<string, SnapshotCacheEntry>();

function readCachedEntitySnapshot<T extends Record<string, unknown>>(
  type: EntityType,
  id: EntityId,
  base: Record<string, unknown>,
  patch: Record<string, unknown> | undefined,
  metadata: EntitySyncMetadata,
): EntitySnapshot<T> {
  const key = ek(type, id);
  const cached = snapshotCache.get(key);
  if (
    cached &&
    cached.base === base &&
    cached.patch === patch &&
    cached.metadata === metadata
  ) {
    return cached.snapshot as EntitySnapshot<T>;
  }

  const snapshot = {
    ...(patch ? { ...base, ...patch } : base),
    $synced: metadata.synced,
    $origin: metadata.origin,
    $updatedAt: metadata.updatedAt,
  } as EntitySnapshot<T>;

  snapshotCache.set(key, { base, patch, metadata, snapshot });
  return snapshot;
}

/**
 * Global entity graph store (Zustand + Immer). **Components should not subscribe directly** — use hooks so layering stays `Component → hook → store`.
 * `getState()` is intended for non-React code paths (engine, adapters, mutations) that must write or read the graph synchronously.
 */
export const useGraphStore = create<GraphState>()(
  subscribeWithSelector(
    immer((set, get) => ({
      entities: {}, patches: {}, entityStates: {}, syncMetadata: {}, lists: {},

      upsertEntity: (type, id, data) => set((s) => {
        if (!s.entities[type]) s.entities[type] = {};
        s.entities[type][id] = { ...(s.entities[type][id] ?? {}), ...data };
        const key = ek(type, id);
        if (!s.syncMetadata[key]) s.syncMetadata[key] = defaultSyncMetadata();
      }),
      upsertEntities: (type, entries) => set((s) => {
        if (!s.entities[type]) s.entities[type] = {};
        for (const { id, data } of entries) {
          s.entities[type][id] = { ...(s.entities[type][id] ?? {}), ...data };
          const key = ek(type, id);
          if (!s.syncMetadata[key]) s.syncMetadata[key] = defaultSyncMetadata();
        }
      }),
      replaceEntity: (type, id, data) => set((s) => {
        if (!s.entities[type]) s.entities[type] = {};
        s.entities[type][id] = data;
        const key = ek(type, id);
        if (!s.syncMetadata[key]) s.syncMetadata[key] = defaultSyncMetadata();
      }),
      removeEntity: (type, id) => set((s) => {
        delete s.entities[type]?.[id];
        delete s.patches[type]?.[id];
        delete s.entityStates[ek(type, id)];
        delete s.syncMetadata[ek(type, id)];
      }),
      patchEntity: (type, id, patch) => set((s) => {
        if (!s.patches[type]) s.patches[type] = {};
        s.patches[type][id] = { ...(s.patches[type][id] ?? {}), ...patch };
      }),
      unpatchEntity: (type, id, keys) => set((s) => {
        const p = s.patches[type]?.[id]; if (!p) return;
        for (const k of keys) delete p[k];
      }),
      clearPatch: (type, id) => set((s) => { delete s.patches[type]?.[id]; }),
      setEntityFetching: (type, id, fetching) => set((s) => {
        const k = ek(type, id);
        if (!s.entityStates[k]) s.entityStates[k] = defaultEntityState();
        s.entityStates[k].isFetching = fetching;
      }),
      setEntityError: (type, id, error) => set((s) => {
        const k = ek(type, id);
        if (!s.entityStates[k]) s.entityStates[k] = defaultEntityState();
        s.entityStates[k].error = error; s.entityStates[k].isFetching = false;
      }),
      setEntityFetched: (type, id) => set((s) => {
        const k = ek(type, id);
        if (!s.entityStates[k]) s.entityStates[k] = defaultEntityState();
        s.entityStates[k].lastFetched = Date.now();
        s.entityStates[k].isFetching = false;
        s.entityStates[k].error = null; s.entityStates[k].stale = false;
        s.syncMetadata[k] = { ...(s.syncMetadata[k] ?? defaultSyncMetadata()), synced: true, origin: "server", updatedAt: Date.now() };
      }),
      setEntityStale: (type, id, stale) => set((s) => {
        const k = ek(type, id);
        if (!s.entityStates[k]) s.entityStates[k] = defaultEntityState();
        s.entityStates[k].stale = stale;
      }),
      setEntitySyncMetadata: (type, id, metadata) => set((s) => {
        const k = ek(type, id);
        s.syncMetadata[k] = { ...(s.syncMetadata[k] ?? defaultSyncMetadata()), ...metadata };
      }),
      clearEntitySyncMetadata: (type, id) => set((s) => {
        delete s.syncMetadata[ek(type, id)];
      }),
      setListResult: (key, ids, meta) => set((s) => {
        const ex = s.lists[key] ?? defaultListState();
        s.lists[key] = { ...ex, ...meta, ids, isFetching: false, isFetchingMore: false, error: null, lastError: null, stale: false, lastFetched: Date.now() };
      }),
      appendListResult: (key, ids, meta) => set((s) => {
        const ex = s.lists[key] ?? defaultListState();
        s.lists[key] = { ...ex, ...meta, ids: Array.from(new Set([...ex.ids, ...ids])), isFetching: false, isFetchingMore: false, error: null, lastError: null, stale: false, lastFetched: Date.now() };
      }),
      prependListResult: (key, ids, meta) => set((s) => {
        const ex = s.lists[key] ?? defaultListState();
        s.lists[key] = { ...ex, ...(meta ?? {}), ids: Array.from(new Set([...ids, ...ex.ids])), isFetching: false, isFetchingMore: false, error: null, lastError: null, stale: false, lastFetched: Date.now() };
      }),
      removeIdFromAllLists: (_type, id) => set((s) => {
        for (const key of Object.keys(s.lists)) {
          const list = s.lists[key]; const idx = list.ids.indexOf(id);
          if (idx !== -1) { list.ids.splice(idx, 1); if (list.total !== null) list.total -= 1; }
        }
      }),
      insertIdInList: (key, id, position) => set((s) => {
        if (!s.lists[key]) s.lists[key] = defaultListState();
        const ids = s.lists[key].ids;
        const ex = ids.indexOf(id); if (ex !== -1) ids.splice(ex, 1);
        if (position === "start") ids.unshift(id);
        else if (position === "end") ids.push(id);
        else ids.splice(position, 0, id);
      }),
      setListFetching: (key, fetching) => set((s) => {
        if (!s.lists[key]) s.lists[key] = defaultListState();
        s.lists[key].isFetching = fetching;
      }),
      setListFetchingMore: (key, fetchingMore) => set((s) => {
        if (!s.lists[key]) s.lists[key] = defaultListState();
        s.lists[key].isFetchingMore = fetchingMore;
      }),
      setListError: (key, error, typed) => set((s) => {
        if (!s.lists[key]) s.lists[key] = defaultListState();
        s.lists[key].error = error;
        s.lists[key].lastError = typed ?? (error === null ? null : s.lists[key].lastError);
        s.lists[key].isFetching = false;
        s.lists[key].isFetchingMore = false;
        // Stamp lastFetched on failure too. Without this, the SWR
        // staleness check (`Date.now() - (lastFetched ?? 0) > staleTime`)
        // would return true on the next render and refire the fetcher
        // immediately — a 404/permanent error becomes an infinite
        // retry loop. With lastFetched stamped, the failure is treated
        // as a complete attempt and consumers see a stable `error` +
        // `isFetching: false`. They can manually `refetch()` if they
        // want to retry. Clearing `stale` also makes invalidateLists
        // the explicit retry mechanism, which is the contract we want.
        s.lists[key].lastFetched = Date.now();
        s.lists[key].stale = false;
      }),
      setListStale: (key, stale) => set((s) => {
        if (!s.lists[key]) s.lists[key] = defaultListState();
        s.lists[key].stale = stale;
      }),
      invalidateEntity: (type, id) => set((s) => {
        if (id) { const k = ek(type, id); if (s.entityStates[k]) s.entityStates[k].stale = true; }
        else { for (const k of Object.keys(s.entityStates)) if (k.startsWith(`${type}:`)) s.entityStates[k].stale = true; }
      }),
      invalidateLists: (matcher) => set((s) => {
        const pred = typeof matcher === "string" ? (k: string) => k.startsWith(matcher) : matcher;
        for (const key of Object.keys(s.lists)) if (pred(key)) s.lists[key].stale = true;
      }),
      invalidateType: (type) => { get().invalidateEntity(type); get().invalidateLists(type); },
      readEntity: <T>(type: EntityType, id: EntityId): T | null => {
        const s = get(); const base = s.entities[type]?.[id]; if (!base) return null;
        const patch = s.patches[type]?.[id];
        return (patch ? { ...base, ...patch } : base) as T;
      },
      readEntitySnapshot: <T>(type: EntityType, id: EntityId): EntitySnapshot<T & Record<string, unknown>> | null => {
        const s = get();
        const base = s.entities[type]?.[id];
        if (!base) {
          snapshotCache.delete(ek(type, id));
          return null;
        }
        const patch = s.patches[type]?.[id];
        const metadata = s.syncMetadata[ek(type, id)] ?? EMPTY_SYNC_METADATA;
        return readCachedEntitySnapshot<T & Record<string, unknown>>(
          type,
          id,
          base,
          patch,
          metadata,
        );
      },
    }))
  )
);
