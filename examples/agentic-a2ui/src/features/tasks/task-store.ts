/**
 * Task feature store: owns all graph writes for the console's task flows
 * (optimistic confirm, realtime coalescing, lifecycle demonstration).
 * Hooks read through this store; components never touch the graph directly.
 */
import { graphStore } from "@prometheus-ags/entity-graph-core";
import {
  getRealtimeManager,
  resetRealtimeManager,
} from "@prometheus-ags/prometheus-entity-management";
import { create } from "zustand";
import { LIST_KEYS, demoTasks } from "../../lib/demo-data";
import { auditLog } from "../../lib/audit-store";
import { DemoRealtimeAdapter } from "./demo-realtime-adapter";

export interface RealtimeDemoStats {
  queuedEvents: number;
  coalescedEntities: number;
  flushCount: number;
}

interface TaskFeatureState {
  realtime: RealtimeDemoStats;
  setRealtime: (stats: RealtimeDemoStats) => void;
}

export const useTaskFeatureStore = create<TaskFeatureState>((set) => ({
  realtime: { queuedEvents: 0, coalescedEntities: 0, flushCount: 0 },
  setRealtime: (realtime) => set({ realtime }),
}));

let adapterRegistered = false;
const demoAdapter = new DemoRealtimeAdapter();

function ensureRealtimeRegistered(): void {
  if (adapterRegistered) return;
  adapterRegistered = true;
  resetRealtimeManager();
  getRealtimeManager({
    flushInterval: 16,
    onChangeReceived: () => {
      const current = useTaskFeatureStore.getState().realtime;
      useTaskFeatureStore
        .getState()
        .setRealtime({ ...current, queuedEvents: current.queuedEvents + 1 });
    },
  }).register(demoAdapter, [{ type: "Task" }]);
}

/** Optimistic confirm: patch is visible everywhere immediately, canonical data lags until confirm. */
export function optimisticCompleteTask(taskId: string): void {
  auditLog.recordLifecycle("stale");
  auditLog.recordLifecycle("fetching");
  graphStore.getState().patchEntity("Task", taskId, { status: "done" });

  // Demo "server" confirm: canonical write lands a beat later, then the patch clears.
  setTimeout(() => {
    const canonical = graphStore.getState().readEntity<{ version?: number }>("Task", taskId);
    graphStore.getState().upsertEntity("Task", taskId, {
      status: "done",
      version: (canonical?.version ?? 1) + 1,
    });
    graphStore.getState().setEntityFetched("Task", taskId);
    graphStore.getState().clearPatch("Task", taskId);
    auditLog.recordLifecycle("success");
  }, 400);
}

/** Demonstrate the terminal-error lifecycle event with a failing demo fetch. */
export function demonstrateTerminalError(): void {
  auditLog.recordLifecycle("stale");
  auditLog.recordLifecycle("fetching");
  setTimeout(() => {
    graphStore.getState().setEntityError("Task", "task-foreign", "Demo transport refused the request.");
    auditLog.recordLifecycle("terminal-error");
  }, 200);
}

/**
 * Realtime coalescing burst: three events (two updates to task-sync, one
 * comment insert) in one 16 ms window collapse into one flush window; every
 * joined view re-renders once.
 */
export function runRealtimeBurst(): void {
  ensureRealtimeRegistered();
  const task = demoTasks.find((candidate) => candidate.id === "task-sync")!;
  const base = graphStore.getState().readEntity<Record<string, unknown>>("Task", task.id) ?? {
    ...task,
  };

  demoAdapter.emit({
    changes: [
      { op: "upsert", type: "Task", id: task.id, data: { ...base, status: "in-progress", version: 2 } },
      { op: "upsert", type: "Task", id: task.id, data: { ...base, status: "in-progress", version: 3 } },
      {
        op: "insert",
        type: "Comment",
        id: "comment-sync-live",
        data: {
          id: "comment-sync-live",
          tenantId: "tenant-a",
          taskId: task.id,
          body: "Coalesced realtime insert from the demo adapter.",
        },
      },
    ],
    affectedListKeys: [LIST_KEYS.projectTasks, LIST_KEYS.taskComments],
  });

  // After the coalesced flush lands, reconcile list membership (the manager
  // owns entity writes; list IDs remain an application concern).
  setTimeout(() => {
    const state = graphStore.getState();
    const list = state.lists[LIST_KEYS.taskComments];
    if (list && !list.ids.includes("comment-sync-live")) {
      state.appendListResult(LIST_KEYS.taskComments, ["comment-sync-live"], {});
    }
    const current = useTaskFeatureStore.getState().realtime;
    useTaskFeatureStore.getState().setRealtime({
      ...current,
      coalescedEntities: 2,
      flushCount: current.flushCount + 1,
    });
  }, 40);
}
