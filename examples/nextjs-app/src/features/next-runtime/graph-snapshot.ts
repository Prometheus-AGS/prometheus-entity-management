import {
  createGraphStore,
  type EntityState,
  type EntitySyncMetadata,
  type GraphStore,
  type ListState,
} from "@prometheus-ags/entity-graph-core";

export interface DehydratedGraphSnapshot {
  requestId: string;
  entities: Record<string, Record<string, Record<string, unknown>>>;
  patches: Record<string, Record<string, Record<string, unknown>>>;
  entityStates: Record<string, EntityState>;
  syncMetadata: Record<string, EntitySyncMetadata>;
  lists: Record<string, ListState>;
}

function cloneSnapshot(snapshot: DehydratedGraphSnapshot): DehydratedGraphSnapshot {
  return structuredClone(snapshot);
}

export function dehydrateGraphStore(
  store: GraphStore,
  requestId: string,
): DehydratedGraphSnapshot {
  const state = store.getState();
  return cloneSnapshot({
    requestId,
    entities: state.entities,
    patches: state.patches,
    entityStates: state.entityStates,
    syncMetadata: state.syncMetadata,
    lists: state.lists,
  });
}

export function hydrateGraphStore(snapshot: DehydratedGraphSnapshot): GraphStore {
  const store = createGraphStore();
  const cloned = cloneSnapshot(snapshot);
  store.setState({
    entities: cloned.entities,
    patches: cloned.patches,
    entityStates: cloned.entityStates,
    syncMetadata: cloned.syncMetadata,
    lists: cloned.lists,
  });
  return store;
}
