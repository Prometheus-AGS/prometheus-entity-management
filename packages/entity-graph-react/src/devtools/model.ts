import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import type {
  GraphDevtoolsClient,
  GraphDevtoolsController,
  GraphDevtoolsCapabilities,
  GraphDevtoolsEntityRecord,
  GraphDevtoolsEvent,
  GraphDevtoolsRelationship,
  GraphDevtoolsSnapshot,
  GraphDevtoolsSnapshotReference,
  GraphDevtoolsViewRecord,
} from "@prometheus-ags/entity-graph-core/devtools";

export interface EntityGraphInspectorModel {
  capturedAt: string;
  snapshot: GraphDevtoolsSnapshot;
  capabilities: GraphDevtoolsCapabilities;
  entities: readonly GraphDevtoolsEntityRecord[];
  policyEntities: readonly GraphDevtoolsEntityRecord[];
  views: readonly GraphDevtoolsViewRecord[];
  relationships: readonly GraphDevtoolsRelationship[];
  events: readonly GraphDevtoolsEvent[];
  snapshotReferences: readonly Extract<GraphDevtoolsSnapshotReference, { status: "retained" }>[];
}

export interface EntityGraphInspectorModelStore {
  getSnapshot(): EntityGraphInspectorModel;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

function withLocalValues(
  records: readonly GraphDevtoolsEntityRecord[],
  store: GraphStore,
): GraphDevtoolsEntityRecord[] {
  const state = store.getState();
  return records.map((record) => {
    const canonical = state.entities[record.type]?.[record.id];
    const storedPatch = state.patches[record.type]?.[record.id];
    const patch = storedPatch && Object.keys(storedPatch).length > 0 ? storedPatch : undefined;
    return {
      ...record,
      canonical: canonical ?? null,
      patch: patch ?? null,
      merged: canonical ? { ...canonical, ...(patch ?? {}) } : null,
    };
  });
}

function projectModel(
  controller: GraphDevtoolsController,
  store: GraphStore,
): EntityGraphInspectorModel {
  const snapshot = controller.getSnapshot();
  const policyEntities = controller.getEntityRecords().entityRecords;
  return {
    capturedAt: snapshot.capturedAt,
    snapshot,
    capabilities: controller.capabilities,
    entities: withLocalValues(policyEntities, store),
    policyEntities,
    views: controller.getViews().views,
    relationships: controller.getRelationships().relationships,
    events: controller.getHistory(),
    snapshotReferences: controller.getSnapshotReferences(),
  };
}

/** Publish expensive graph projections at most once per animation frame. */
export function createEntityGraphInspectorModelStore(
  controller: GraphDevtoolsController,
  store: GraphStore,
): EntityGraphInspectorModelStore {
  let snapshot = projectModel(controller, store);
  let frame: number | null = null;
  const listeners = new Set<() => void>();

  const publish = () => {
    frame = null;
    snapshot = projectModel(controller, store);
    for (const listener of listeners) listener();
  };
  const schedule = () => {
    if (frame !== null) return;
    frame = requestAnimationFrame(publish);
  };
  const unsubscribe = controller.subscribe(schedule);

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      unsubscribe();
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      listeners.clear();
    },
  };
}

async function requestResult(client: GraphDevtoolsClient, command: Parameters<GraphDevtoolsClient["request"]>[0]) {
  const response = await client.request(command);
  if (!response.ok) throw new Error(response.error.message);
  return response.result;
}

/** Build the same inspector projection from a serialized DevTools client. */
export async function createRemoteEntityGraphInspectorModelStore(
  client: GraphDevtoolsClient,
): Promise<EntityGraphInspectorModelStore> {
  let disposed = false;
  let frame: number | null = null;
  let loading = false;
  let dirty = false;
  const listeners = new Set<() => void>();
  const load = async (): Promise<EntityGraphInspectorModel> => {
    const [snapshot, capabilities, entityRecords, views, relationships, events] = await Promise.all([
      requestResult(client, "get-snapshot"),
      requestResult(client, "get-capabilities"),
      requestResult(client, "get-entity-records"),
      requestResult(client, "get-views"),
      requestResult(client, "get-relationships"),
      requestResult(client, "get-history"),
    ]);
    const records = (entityRecords as { entityRecords: GraphDevtoolsEntityRecord[] }).entityRecords;
    const history = events as GraphDevtoolsEvent[];
    const retainedSnapshots = new Map<number, Extract<GraphDevtoolsSnapshotReference, { status: "retained" }>>();
    for (const event of history) {
      if (event.type === "mutation" && event.payload.snapshot.status === "retained") {
        retainedSnapshots.set(event.payload.snapshot.cursor, event.payload.snapshot);
      }
    }
    return {
      capturedAt: (snapshot as GraphDevtoolsSnapshot).capturedAt,
      snapshot: snapshot as GraphDevtoolsSnapshot,
      capabilities: capabilities as GraphDevtoolsCapabilities,
      entities: records,
      policyEntities: records,
      views: (views as { views: GraphDevtoolsViewRecord[] }).views,
      relationships: (relationships as { relationships: GraphDevtoolsRelationship[] }).relationships,
      events: history,
      snapshotReferences: [...retainedSnapshots.values()],
    };
  };
  let snapshot = await load();
  const publish = async () => {
    frame = null;
    if (loading) {
      dirty = true;
      return;
    }
    loading = true;
    try {
      const next = await load();
      if (disposed) return;
      snapshot = next;
      for (const listener of listeners) listener();
    } catch {
      // Connection state is surfaced by the hosting extension; retain the last coherent model.
    } finally {
      loading = false;
      if (dirty && !disposed) {
        dirty = false;
        schedule();
      }
    }
  };
  const schedule = () => {
    if (disposed || frame !== null) return;
    frame = requestAnimationFrame(() => void publish());
  };
  const unsubscribe = client.subscribe(schedule);
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      disposed = true;
      unsubscribe();
      if (frame !== null) cancelAnimationFrame(frame);
      listeners.clear();
    },
  };
}
