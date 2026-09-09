import { createStore } from "zustand/vanilla";

import type { GraphActionRecord, GraphSyncStatus } from "./local-first-types";

/**
 * Per-runtime local-first state: the pending-action set and the sync-status
 * store a runtime publishes to.
 *
 * Extracted from `local-first-runtime.ts`, which crossed the 500-line limit
 * once the dispose barrier landed. The seam is real rather than convenient —
 * scope construction and the status store are a separate concern from the
 * runtime that consumes them, and nothing here touches persistence or replay.
 */

const initialStatus: GraphSyncStatus = {
  phase: "idle",
  isOnline: true,
  isSynced: true,
  pendingActions: 0,
  lastHydratedAt: null,
  lastPersistedAt: null,
  storageKey: null,
  error: null,
};

/** Create an independent sync-status store. Each runtime owns one. */
export function createGraphSyncStatusStore() {
  return createStore<{
    status: GraphSyncStatus;
    setStatus: (status: Partial<GraphSyncStatus>) => void;
  }>()((set) => ({
    status: { ...initialStatus },
    setStatus: (status) =>
      set((state) => ({ status: { ...state.status, ...status } })),
  }));
}

export type GraphSyncStatusStore = ReturnType<typeof createGraphSyncStatusStore>;

/**
 * Per-runtime state container.
 *
 * Both fields were previously module-level singletons shared by every runtime
 * in the process. That was not merely shared state — `hydrateGraphFromStorage`
 * clears the pending set before repopulating it, so a second runtime hydrating
 * erased the first runtime's un-settled actions. On an account or practice
 * switch that is silent write loss, which is why this is scoped per runtime
 * (ADR-009 G1).
 */
export interface RuntimeScope {
  pendingActions: Map<string, GraphActionRecord>;
  statusStore: GraphSyncStatusStore;
}

/** Create an isolated runtime scope. */
export function createRuntimeScope(): RuntimeScope {
  return {
    pendingActions: new Map<string, GraphActionRecord>(),
    statusStore: createGraphSyncStatusStore(),
  };
}
