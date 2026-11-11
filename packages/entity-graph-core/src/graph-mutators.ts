/**
 * Draft-level graph writes shared by the store actions in `graph.ts` and by
 * `batchGraphWrites`. Each function mutates an immer draft of the graph data;
 * the caller owns the single `set` that publishes the result. Keeping one
 * implementation guarantees a batched write and the equivalent store action
 * produce the same graph.
 */
import type {
  EntityId,
  EntitySyncMetadata,
  EntityType,
  GraphState,
  ListState,
  QueryKey,
} from "./graph";
import { getMergeStrategy } from "./merge/registry";
import type { MergeContext } from "./merge/types";

/** The data slots of the graph (everything except the action functions). */
export type GraphData = Pick<GraphState, "entities" | "patches" | "entityStates" | "syncMetadata" | "lists">;

export function entityKey(type: EntityType, id: EntityId): string {
  return `${type}:${id}`;
}

export function defaultSyncMetadata(): EntitySyncMetadata {
  return { synced: true, origin: "server", updatedAt: null };
}

export function defaultListState(): ListState {
  return {
    ids: [],
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
}

export function upsertEntityDraft(s: GraphData, type: EntityType, id: EntityId, data: Record<string, unknown>): void {
  if (!s.entities[type]) s.entities[type] = {};
  const key = entityKey(type, id);
  // Route through the registered MergeStrategy (default = LWW shallow merge,
  // identical to the historical `{ ...prev, ...data }` behavior).
  const strategy = getMergeStrategy(type);
  const ctx: MergeContext = { type, id, origin: s.syncMetadata[key]?.origin ?? "server", updatedAt: Date.now() };
  s.entities[type][id] = strategy(s.entities[type][id], data, ctx);
  if (!s.syncMetadata[key]) s.syncMetadata[key] = defaultSyncMetadata();
}

export function upsertEntitiesDraft(
  s: GraphData,
  type: EntityType,
  entries: ReadonlyArray<{ id: EntityId; data: Record<string, unknown> }>,
): void {
  if (!s.entities[type]) s.entities[type] = {};
  const strategy = getMergeStrategy(type);
  for (const { id, data } of entries) {
    const key = entityKey(type, id);
    const ctx: MergeContext = { type, id, origin: s.syncMetadata[key]?.origin ?? "server", updatedAt: Date.now() };
    s.entities[type][id] = strategy(s.entities[type][id], data, ctx);
    if (!s.syncMetadata[key]) s.syncMetadata[key] = defaultSyncMetadata();
  }
}

export function replaceEntityDraft(s: GraphData, type: EntityType, id: EntityId, data: Record<string, unknown>): void {
  if (!s.entities[type]) s.entities[type] = {};
  s.entities[type][id] = data;
  const key = entityKey(type, id);
  if (!s.syncMetadata[key]) s.syncMetadata[key] = defaultSyncMetadata();
}

export function removeEntityDraft(s: GraphData, type: EntityType, id: EntityId): void {
  delete s.entities[type]?.[id];
  delete s.patches[type]?.[id];
  delete s.entityStates[entityKey(type, id)];
  delete s.syncMetadata[entityKey(type, id)];
}

export function patchEntityDraft(s: GraphData, type: EntityType, id: EntityId, patch: Record<string, unknown>): void {
  if (!s.patches[type]) s.patches[type] = {};
  s.patches[type][id] = { ...(s.patches[type][id] ?? {}), ...patch };
}

export function unpatchEntityDraft(s: GraphData, type: EntityType, id: EntityId, keys: readonly string[]): void {
  const p = s.patches[type]?.[id];
  if (!p) return;
  for (const k of keys) delete p[k];
}

export function clearPatchDraft(s: GraphData, type: EntityType, id: EntityId): void {
  delete s.patches[type]?.[id];
}

export function setEntitySyncMetadataDraft(
  s: GraphData,
  type: EntityType,
  id: EntityId,
  metadata: Partial<EntitySyncMetadata>,
): void {
  const k = entityKey(type, id);
  s.syncMetadata[k] = { ...(s.syncMetadata[k] ?? defaultSyncMetadata()), ...metadata };
}

export function removeIdFromAllListsDraft(s: GraphData, type: EntityType, id: EntityId): void {
  for (const key of Object.keys(s.lists)) {
    const list = s.lists[key];
    if (list.entityType && list.entityType !== type) continue;
    const idx = list.ids.indexOf(id);
    if (idx !== -1) { list.ids.splice(idx, 1); if (list.total !== null) list.total -= 1; }
  }
}

export function insertIdInListDraft(s: GraphData, key: QueryKey, id: EntityId, position: "start" | "end" | number): void {
  if (!s.lists[key]) s.lists[key] = defaultListState();
  const ids = s.lists[key].ids;
  const ex = ids.indexOf(id); if (ex !== -1) ids.splice(ex, 1);
  if (position === "start") ids.unshift(id);
  else if (position === "end") ids.push(id);
  else ids.splice(position, 0, id);
}

/**
 * Set a list's ordered ids (deduplicated, first occurrence wins) without
 * touching its fetch lifecycle or pagination metadata.
 */
export function setListIdsDraft(s: GraphData, key: QueryKey, ids: readonly EntityId[], entityType?: EntityType): void {
  if (!s.lists[key]) s.lists[key] = defaultListState();
  s.lists[key].ids = Array.from(new Set(ids));
  if (entityType !== undefined) s.lists[key].entityType = entityType;
}
