import { graphStore } from "./graph";
import type { EntityId, EntitySyncMetadata, EntityType, GraphStore, QueryKey, SyncOrigin } from "./graph";
import { emitLegacyDevtoolsEvent } from "./legacy-devtools";

declare const process: { env: { NODE_ENV?: string } } | undefined;

interface GraphDataSnapshot {
  entities: ReturnType<typeof graphStore.getState>["entities"];
  patches: ReturnType<typeof graphStore.getState>["patches"];
  entityStates: ReturnType<typeof graphStore.getState>["entityStates"];
  syncMetadata: ReturnType<typeof graphStore.getState>["syncMetadata"];
  lists: ReturnType<typeof graphStore.getState>["lists"];
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
const graphActionReplayers = new Map<string, (record: GraphActionRecord, store: GraphStore) => Promise<unknown>>();

export function createGraphTransaction(storeApi: GraphStore = graphStore): GraphTransaction {
  const baseline = cloneGraphData(storeApi.getState());
  let closed = false;

  const tx: GraphTransaction = {
    upsertEntity(type, id, data) {
      storeApi.getState().upsertEntity(type, id, data);
      if (
        typeof process === "undefined" || process.env.NODE_ENV !== "production"
      ) {
        emitLegacyDevtoolsEvent({ kind: "upsert", type, id, data, at: new Date().toISOString() });
      }
      return tx;
    },
    replaceEntity(type, id, data) {
      storeApi.getState().replaceEntity(type, id, data);
      return tx;
    },
    removeEntity(type, id) {
      storeApi.getState().removeEntity(type, id);
      return tx;
    },
    patchEntity(type, id, patch) {
      storeApi.getState().patchEntity(type, id, patch);
      if (
        typeof process === "undefined" || process.env.NODE_ENV !== "production"
      ) {
        emitLegacyDevtoolsEvent({ kind: "patch", type, id, patch, at: new Date().toISOString() });
      }
      return tx;
    },
    clearPatch(type, id) {
      storeApi.getState().clearPatch(type, id);
      if (
        typeof process === "undefined" || process.env.NODE_ENV !== "production"
      ) {
        emitLegacyDevtoolsEvent({ kind: "clearPatch", type, id, at: new Date().toISOString() });
      }
      return tx;
    },
    insertIdInList(key, id, position) {
      storeApi.getState().insertIdInList(key, id, position);
      return tx;
    },
    removeIdFromAllLists(type, id) {
      storeApi.getState().removeIdFromAllLists(type, id);
      return tx;
    },
    setEntitySyncMetadata(type, id, metadata) {
      storeApi.getState().setEntitySyncMetadata(type, id, metadata);
      return tx;
    },
    markEntityPending(type, id, origin = "optimistic") {
      storeApi.getState().setEntitySyncMetadata(type, id, {
        synced: false,
        origin,
        updatedAt: Date.now(),
      });
      return tx;
    },
    markEntitySynced(type, id, origin = "server") {
      storeApi.getState().setEntitySyncMetadata(type, id, {
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
      storeApi.setState(cloneGraphData(baseline) as Partial<ReturnType<typeof graphStore.getState>>);
      closed = true;
    },
    snapshot() {
      return cloneGraphData(storeApi.getState());
    },
  };

  return tx;
}

export function createGraphAction<TInput, TResult>(opts: GraphActionOptions<TInput, TResult>) {
  if (opts.key) {
    graphActionReplayers.set(opts.key, async (record, storeApi) => {
      const tx = createGraphTransaction(storeApi);
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

export async function replayRegisteredGraphAction(record: GraphActionRecord, storeApi: GraphStore = graphStore) {
  const replayer = graphActionReplayers.get(record.key);
  if (!replayer) throw new Error(`No graph action registered for key "${record.key}"`);
  return replayer(record, storeApi);
}

function cloneGraphData(
  source: Pick<ReturnType<typeof graphStore.getState>, "entities" | "patches" | "entityStates" | "syncMetadata" | "lists"> = graphStore.getState(),
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
