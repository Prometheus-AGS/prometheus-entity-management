/**
 * Append-only UI state for the console: A2A task timeline, policy decisions,
 * and lifecycle events. This is view state, not business state — the entity
 * graph remains the single source of truth for domain data.
 */
import { create } from "zustand";

export interface TaskTimelineEntry {
  taskId: string;
  state: string;
  detail: string;
  at: string;
}

export interface PolicyDecisionEntry {
  channel: "a2a" | "a2ui";
  action: string;
  allowed: boolean;
  reason: string;
  at: string;
}

export type LifecycleEventName = "stale" | "fetching" | "success" | "terminal-error";

interface AuditState {
  timeline: TaskTimelineEntry[];
  decisions: PolicyDecisionEntry[];
  lifecycle: LifecycleEventName[];
  recordTask: (entry: TaskTimelineEntry) => void;
  recordDecision: (entry: PolicyDecisionEntry) => void;
  recordLifecycle: (event: LifecycleEventName) => void;
  reset: () => void;
}

export const useAuditStore = create<AuditState>((set) => ({
  timeline: [],
  decisions: [],
  lifecycle: [],
  recordTask: (entry) => set((state) => ({ timeline: [...state.timeline, entry] })),
  recordDecision: (entry) =>
    set((state) => ({ decisions: [...state.decisions, entry] })),
  recordLifecycle: (event) =>
    set((state) =>
      state.lifecycle.includes(event)
        ? state
        : { lifecycle: [...state.lifecycle, event] },
    ),
  reset: () => set({ timeline: [], decisions: [], lifecycle: [] }),
}));

/** Non-React access for agent/policy modules. */
export const auditLog = {
  recordTask: (entry: TaskTimelineEntry) => useAuditStore.getState().recordTask(entry),
  recordDecision: (entry: PolicyDecisionEntry) =>
    useAuditStore.getState().recordDecision(entry),
  recordLifecycle: (event: LifecycleEventName) =>
    useAuditStore.getState().recordLifecycle(event),
};
