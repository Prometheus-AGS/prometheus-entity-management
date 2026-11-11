/**
 * Atomic, single-publication batches of graph writes.
 *
 * `batchGraphWrites(fn)` runs every write `fn` makes against ONE immer draft
 * and publishes ONE store update (one subscriber notification), however many
 * entity types it touches. It never copies the graph: untouched entity types,
 * entities and lists keep their identity (immer structural sharing), so the
 * cost is proportional to what changed, not to the size of the graph. If `fn`
 * throws, nothing is published and the graph is unchanged.
 *
 * `applyGraphChanges(changes)` is the data form of the same thing: a
 * serialisable change set (for journals, replay and tests) applied as one
 * batch. With the default last-write-wins merge strategy every change kind is
 * idempotent, so re-delivering a change set is safe; a custom merge strategy
 * that is not idempotent (for example a counter) makes `upsert` non-idempotent.
 */
import { current, isDraft } from "immer";
import { graphStore, type EntityId, type EntitySyncMetadata, type EntityType, type GraphStore, type QueryKey } from "./graph";
import {
  clearPatchDraft,
  insertIdInListDraft,
  patchEntityDraft,
  removeEntityDraft,
  removeIdFromAllListsDraft,
  replaceEntityDraft,
  setEntitySyncMetadataDraft,
  setListIdsDraft,
  unpatchEntityDraft,
  upsertEntitiesDraft,
  upsertEntityDraft,
  type GraphData,
} from "./graph-mutators";

/** Write handle passed to a `batchGraphWrites` callback. Every method returns the handle for chaining. */
export interface GraphBatch {
  upsertEntity(type: EntityType, id: EntityId, data: Record<string, unknown>): GraphBatch;
  upsertEntities(type: EntityType, entries: ReadonlyArray<{ id: EntityId; data: Record<string, unknown> }>): GraphBatch;
  replaceEntity(type: EntityType, id: EntityId, data: Record<string, unknown>): GraphBatch;
  /** Remove the canonical entity, its patches, fetch state and sync metadata (not its list memberships). */
  removeEntity(type: EntityType, id: EntityId): GraphBatch;
  patchEntity(type: EntityType, id: EntityId, patch: Record<string, unknown>): GraphBatch;
  unpatchEntity(type: EntityType, id: EntityId, keys: readonly string[]): GraphBatch;
  clearPatch(type: EntityType, id: EntityId): GraphBatch;
  setEntitySyncMetadata(type: EntityType, id: EntityId, metadata: Partial<EntitySyncMetadata>): GraphBatch;
  insertIdInList(key: QueryKey, id: EntityId, position: "start" | "end" | number): GraphBatch;
  removeIdFromAllLists(type: EntityType, id: EntityId): GraphBatch;
  /** Set a list's ordered ids (deduplicated) without changing its fetch or pagination metadata. */
  setListIds(key: QueryKey, ids: readonly EntityId[], entityType?: EntityType): GraphBatch;
  /** Read canonical data merged with patches, including writes made earlier in this batch. */
  readEntity<T = Record<string, unknown>>(type: EntityType, id: EntityId): T | null;
}

/** One serialisable graph write. */
export type GraphChange =
  | { op: "upsert"; type: EntityType; id: EntityId; data: Record<string, unknown> }
  | { op: "replace"; type: EntityType; id: EntityId; data: Record<string, unknown> }
  | { op: "remove"; type: EntityType; id: EntityId }
  | { op: "patch"; type: EntityType; id: EntityId; patch: Record<string, unknown> }
  | { op: "unpatch"; type: EntityType; id: EntityId; keys: string[] }
  | { op: "clearPatch"; type: EntityType; id: EntityId }
  | { op: "syncMetadata"; type: EntityType; id: EntityId; metadata: Partial<EntitySyncMetadata> }
  | { op: "insertId"; key: QueryKey; id: EntityId; position: "start" | "end" | number }
  | { op: "removeIdFromAllLists"; type: EntityType; id: EntityId }
  | { op: "setListIds"; key: QueryKey; ids: EntityId[]; entityType?: EntityType };

/** Drafts of batches currently open, per store, so a nested batch joins the outer publication. */
const openDrafts = new WeakMap<GraphStore, GraphData>();

function createDraftBatch(draft: GraphData): GraphBatch {
  const batch: GraphBatch = {
    upsertEntity: (type, id, data) => (upsertEntityDraft(draft, type, id, data), batch),
    upsertEntities: (type, entries) => (upsertEntitiesDraft(draft, type, entries), batch),
    replaceEntity: (type, id, data) => (replaceEntityDraft(draft, type, id, data), batch),
    removeEntity: (type, id) => (removeEntityDraft(draft, type, id), batch),
    patchEntity: (type, id, patch) => (patchEntityDraft(draft, type, id, patch), batch),
    unpatchEntity: (type, id, keys) => (unpatchEntityDraft(draft, type, id, keys), batch),
    clearPatch: (type, id) => (clearPatchDraft(draft, type, id), batch),
    setEntitySyncMetadata: (type, id, metadata) => (setEntitySyncMetadataDraft(draft, type, id, metadata), batch),
    insertIdInList: (key, id, position) => (insertIdInListDraft(draft, key, id, position), batch),
    removeIdFromAllLists: (type, id) => (removeIdFromAllListsDraft(draft, type, id), batch),
    setListIds: (key, ids, entityType) => (setListIdsDraft(draft, key, ids, entityType), batch),
    readEntity: <T>(type: EntityType, id: EntityId): T | null => {
      const base = draft.entities[type]?.[id];
      if (!base) return null;
      const patch = draft.patches[type]?.[id];
      // Snapshot drafts so nothing returned outlives the producer as a revoked proxy.
      const plain = <V extends object>(value: V): V => (isDraft(value) ? (current(value as never) as V) : value);
      return (patch ? { ...plain(base), ...plain(patch) } : { ...plain(base) }) as T;
    },
  };
  return batch;
}

/**
 * Apply every write made by `fn` atomically with a single store publication.
 *
 * Use the `batch` handle for all writes inside `fn`, and keep `fn`
 * synchronous. A store write made around the handle while the batch is open
 * (a store action, a transaction op) would be overwritten when the batch
 * publishes, so it makes the batch throw and publish nothing; an async `fn`
 * throws too. A nested `batchGraphWrites` on the same store joins the outer
 * batch, so atomicity is that of the outermost batch.
 *
 * @returns whatever `fn` returns.
 */
export function batchGraphWrites<T>(fn: (batch: GraphBatch) => T, store: GraphStore = graphStore): T {
  const open = openDrafts.get(store);
  if (open) return fn(createDraftBatch(open));

  let result!: T;
  const before = store.getState();
  store.setState((draft) => {
    openDrafts.set(store, draft);
    try {
      result = fn(createDraftBatch(draft));
    } finally {
      openDrafts.delete(store);
    }
    if (typeof (result as { then?: unknown } | null)?.then === "function") {
      throw new TypeError("batchGraphWrites: the callback must be synchronous; nothing was written");
    }
    if (store.getState() !== before) {
      throw new Error(
        "batchGraphWrites: the store was written outside the batch handle while the batch was open; the batch was not applied",
      );
    }
  });
  return result;
}

function applyChange(batch: GraphBatch, change: GraphChange): void {
  switch (change.op) {
    case "upsert": batch.upsertEntity(change.type, change.id, change.data); return;
    case "replace": batch.replaceEntity(change.type, change.id, change.data); return;
    case "remove": batch.removeEntity(change.type, change.id); return;
    case "patch": batch.patchEntity(change.type, change.id, change.patch); return;
    case "unpatch": batch.unpatchEntity(change.type, change.id, change.keys); return;
    case "clearPatch": batch.clearPatch(change.type, change.id); return;
    case "syncMetadata": batch.setEntitySyncMetadata(change.type, change.id, change.metadata); return;
    case "insertId": batch.insertIdInList(change.key, change.id, change.position); return;
    case "removeIdFromAllLists": batch.removeIdFromAllLists(change.type, change.id); return;
    case "setListIds": batch.setListIds(change.key, change.ids, change.entityType); return;
    default: throw new Error(`Unknown graph change op: ${(change as { op: string }).op}`);
  }
}

/** Apply a serialisable change set in order as one atomic batch (one notification). */
export function applyGraphChanges(changes: readonly GraphChange[], store: GraphStore = graphStore): void {
  batchGraphWrites((batch) => {
    for (const change of changes) applyChange(batch, change);
  }, store);
}
