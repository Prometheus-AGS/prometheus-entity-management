import type { GraphStore } from "../graph";
import {
  graphDevtoolsEntityIdentityKey,
  projectGraphDevtoolsInspectionValue,
} from "./inspection";
import type {
  GraphDevtoolsPreviewAppliedReceipt,
  GraphDevtoolsPreviewConflictReceipt,
  GraphDevtoolsPreviewRestoreReceipt,
  GraphDevtoolsValuePolicy,
} from "./protocol";

interface RawPreviewReceipt {
  previewId: string;
  type: string;
  id: string;
  priorPatch: Record<string, unknown> | undefined;
  previewPatch: Record<string, unknown>;
  appliedPatch: Record<string, unknown>;
  baselineRevision: number;
  previewRevision: number;
  appliedAt: string;
}

export interface GraphDevtoolsPreviewController {
  apply(type: string, id: string, patch: Record<string, unknown>): GraphDevtoolsPreviewAppliedReceipt | null;
  restore(previewId: string): GraphDevtoolsPreviewRestoreReceipt | null;
  dispose(): void;
}

function replaceEntityPatch(
  store: GraphStore,
  type: string,
  id: string,
  patch: Record<string, unknown> | undefined,
): void {
  store.setState((state) => {
    const patches = { ...state.patches };
    const bucket = { ...(patches[type] ?? {}) };
    if (patch === undefined) delete bucket[id];
    else bucket[id] = { ...patch };
    if (Object.keys(bucket).length === 0) delete patches[type];
    else patches[type] = bucket;
    return { patches };
  });
}

export function createGraphDevtoolsPreviewController(
  store: GraphStore,
  storeId: string,
  valuePolicy: GraphDevtoolsValuePolicy,
  valueRevisionFor: (type: string, id: string) => number,
): GraphDevtoolsPreviewController {
  const receipts = new Map<string, RawPreviewReceipt>();
  const activeByEntity = new Map<string, string>();
  let nextPreview = 1;
  let disposed = false;

  const projectPatch = (type: string, id: string, value: unknown): unknown => (
    projectGraphDevtoolsInspectionValue(
      value,
      valuePolicy,
      { storeId, category: "patch", key: type, id },
    )
  );

  const removeReceipt = (receipt: RawPreviewReceipt) => {
    receipts.delete(receipt.previewId);
    const key = graphDevtoolsEntityIdentityKey(receipt.type, receipt.id);
    if (activeByEntity.get(key) === receipt.previewId) activeByEntity.delete(key);
  };

  return {
    apply(type, id, patch) {
      if (disposed || !store.getState().entities[type]?.[id]) return null;
      const key = graphDevtoolsEntityIdentityKey(type, id);
      const previousPreviewId = activeByEntity.get(key);
      if (previousPreviewId) receipts.delete(previousPreviewId);

      const storedPriorPatch = store.getState().patches[type]?.[id];
      const priorPatch = storedPriorPatch === undefined ? undefined : { ...storedPriorPatch };
      const previewPatch = { ...patch };
      const baselineRevision = valueRevisionFor(type, id);
      store.getState().patchEntity(type, id, previewPatch);
      const appliedPatch = { ...(store.getState().patches[type]?.[id] ?? {}) };
      const previewRevision = valueRevisionFor(type, id);
      const receipt: RawPreviewReceipt = {
        previewId: `preview-${storeId}-${nextPreview++}`,
        type,
        id,
        priorPatch,
        previewPatch,
        appliedPatch,
        baselineRevision,
        previewRevision,
        appliedAt: new Date().toISOString(),
      };
      receipts.set(receipt.previewId, receipt);
      activeByEntity.set(key, receipt.previewId);
      return {
        previewId: receipt.previewId,
        entity: { type, id },
        priorPatch: priorPatch === undefined ? null : projectPatch(type, id, priorPatch),
        previewPatch: projectPatch(type, id, previewPatch),
        appliedPatch: projectPatch(type, id, appliedPatch),
        baselineRevision,
        previewRevision,
        appliedAt: receipt.appliedAt,
      };
    },
    restore(previewId) {
      if (disposed) return null;
      const receipt = receipts.get(previewId);
      if (!receipt) return null;
      const observedRevision = valueRevisionFor(receipt.type, receipt.id);
      if (observedRevision !== receipt.previewRevision) {
        const currentPatch = store.getState().patches[receipt.type]?.[receipt.id];
        const conflict: GraphDevtoolsPreviewConflictReceipt = {
          previewId,
          status: "conflict",
          reason: "entity-changed-since-preview",
          expectedRevision: receipt.previewRevision,
          observedRevision,
          currentPatch: currentPatch === undefined
            ? null
            : projectPatch(receipt.type, receipt.id, currentPatch),
          priorPatch: receipt.priorPatch === undefined
            ? null
            : projectPatch(receipt.type, receipt.id, receipt.priorPatch),
        };
        removeReceipt(receipt);
        return conflict;
      }

      replaceEntityPatch(store, receipt.type, receipt.id, receipt.priorPatch);
      removeReceipt(receipt);
      return {
        previewId,
        status: "restored",
        restoredPatch: receipt.priorPatch === undefined
          ? null
          : projectPatch(receipt.type, receipt.id, receipt.priorPatch),
        observedRevision,
        restoredAt: new Date().toISOString(),
      };
    },
    dispose() {
      disposed = true;
      receipts.clear();
      activeByEntity.clear();
    },
  };
}
