import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import type {
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
