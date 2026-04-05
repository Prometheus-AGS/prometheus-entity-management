import { useGraphStore } from "./graph";
import type { EntityId, EntitySyncMetadata, EntityType, QueryKey, SyncOrigin } from "./graph";

interface GraphDataSnapshot {
  entities: ReturnType<typeof useGraphStore.getState>["entities"];
  patches: ReturnType<typeof useGraphStore.getState>["patches"];
  entityStates: ReturnType<typeof useGraphStore.getState>["entityStates"];
  syncMetadata: ReturnType<typeof useGraphStore.getState>["syncMetadata"];
  lists: ReturnType<typeof useGraphStore.getState>["lists"];
}

export interface GraphTransaction {
  upsertEntity: (type: EntityType, id: EntityId, data: Record<string, unknown>) => GraphTransaction;
  replaceEntity: (type: EntityType, id: EntityId, data: Record<string, unknown>) => GraphTransaction;
  removeEntity: (type: EntityType, id: EntityId) => GraphTransaction;
  patchEntity: (type: EntityType, id: EntityId, patch: Record<string, unknown>) => GraphTransaction;
  clearPatch: (type: EntityType, id: EntityId) => GraphTransaction;
  insertIdInList: (key: QueryKey, id: EntityId, position: "start" | "end" | number) => GraphTransaction;
  removeIdFromAllLists: (type: EntityType, id: EntityId) => GraphTransaction;
  setEntitySyncMetadata: (type: EntityType, id: EntityId, metadata: Partial<EntitySyncMetadata>) => GraphTransaction;
  markEntityPending: (type: EntityType, id: EntityId, origin?: SyncOrigin) => GraphTransaction;
  markEntitySynced: (type: EntityType, id: EntityId, origin?: SyncOrigin) => GraphTransaction;
  commit: () => void;
  rollback: () => void;
  snapshot: () => GraphDataSnapshot;
}

export interface GraphActionOptions<TInput, TResult> {
  key?: string;
  optimistic?: (tx: GraphTransaction, input: TInput) => void;
  run: (tx: GraphTransaction, input: TInput) => Promise<TResult> | TResult;
  onSuccess?: (result: TResult, input: TInput, tx: GraphTransaction) => void;
  onError?: (error: Error, input: TInput) => void;
}

export interface GraphActionRecord {
  id: string;
  key: string;
  input: unknown;
  enqueuedAt: string;
}

export type GraphActionEvent =
  | { type: "enqueued"; record: GraphActionRecord }
  | { type: "settled"; record: GraphActionRecord };

const graphActionListeners = new Set<(event: GraphActionEvent) => void>();
const graphActionReplayers = new Map<string, (record: GraphActionRecord) => Promise<unknown>>();

export function createGraphTransaction(): GraphTransaction {
  const baseline = cloneGraphData();
  let closed = false;

  const tx: GraphTransaction = {
    upsertEntity(type, id, data) {
      useGraphStore.getState().upsertEntity(type, id, data);
      return tx;
    },
    replaceEntity(type, id, data) {
      useGraphStore.getState().replaceEntity(type, id, data);
      return tx;
    },
    removeEntity(type, id) {
      useGraphStore.getState().removeEntity(type, id);
      return tx;
    },
    patchEntity(type, id, patch) {
      useGraphStore.getState().patchEntity(type, id, patch);
      return tx;
    },
    clearPatch(type, id) {
      useGraphStore.getState().clearPatch(type, id);
      return tx;
    },
    insertIdInList(key, id, position) {
      useGraphStore.getState().insertIdInList(key, id, position);
      return tx;
    },
    removeIdFromAllLists(type, id) {
      useGraphStore.getState().removeIdFromAllLists(type, id);
      return tx;
    },
    setEntitySyncMetadata(type, id, metadata) {
      useGraphStore.getState().setEntitySyncMetadata(type, id, metadata);
      return tx;
    },
    markEntityPending(type, id, origin = "optimistic") {
      useGraphStore.getState().setEntitySyncMetadata(type, id, {
        synced: false,
        origin,
        updatedAt: Date.now(),
      });
      return tx;
    },
    markEntitySynced(type, id, origin = "server") {
      useGraphStore.getState().setEntitySyncMetadata(type, id, {
        synced: true,
        origin,
        updatedAt: Date.now(),
      });
      return tx;
    },
    commit() {
      closed = true;
    },
    rollback() {
      if (closed) return;
      useGraphStore.setState(cloneGraphData(baseline) as Partial<ReturnType<typeof useGraphStore.getState>>);
      closed = true;
    },
    snapshot() {
      return cloneGraphData();
    },
  };

  return tx;
}

export function createGraphAction<TInput, TResult>(opts: GraphActionOptions<TInput, TResult>) {
  if (opts.key) {
    graphActionReplayers.set(opts.key, async (record) => {
      const tx = createGraphTransaction();
      try {
        const result = await opts.run(tx, record.input as TInput);
        tx.commit();
        return result;
      } catch (error) {
        tx.rollback();
        throw error;
      }
    });
  }

  return async (input: TInput): Promise<TResult> => {
    const tx = createGraphTransaction();
    const record = opts.key
      ? {
          id: `${opts.key}:${Date.now()}`,
          key: opts.key,
          input: structuredClone(input),
          enqueuedAt: new Date().toISOString(),
        }
      : null;

    try {
      if (record) emitGraphActionEvent({ type: "enqueued", record });
      opts.optimistic?.(tx, input);
      const result = await opts.run(tx, input);
      opts.onSuccess?.(result, input, tx);
      tx.commit();
      if (record) emitGraphActionEvent({ type: "settled", record });
      return result;
    } catch (error) {
      tx.rollback();
      const normalized = error instanceof Error ? error : new Error(String(error));
      if (record) emitGraphActionEvent({ type: "settled", record });
      opts.onError?.(normalized, input);
      throw normalized;
    }
  };
}

export function subscribeGraphActionEvents(listener: (event: GraphActionEvent) => void) {
  graphActionListeners.add(listener);
  return () => graphActionListeners.delete(listener);
}

export async function replayRegisteredGraphAction(record: GraphActionRecord) {
  const replayer = graphActionReplayers.get(record.key);
  if (!replayer) throw new Error(`No graph action registered for key "${record.key}"`);
  return replayer(record);
}

function cloneGraphData(
  source: Pick<ReturnType<typeof useGraphStore.getState>, "entities" | "patches" | "entityStates" | "syncMetadata" | "lists"> = useGraphStore.getState(),
): GraphDataSnapshot {
  return {
    entities: structuredClone(source.entities),
    patches: structuredClone(source.patches),
    entityStates: structuredClone(source.entityStates),
    syncMetadata: structuredClone(source.syncMetadata),
    lists: structuredClone(source.lists),
  };
}

function emitGraphActionEvent(event: GraphActionEvent) {
  for (const listener of graphActionListeners) listener(event);
}
