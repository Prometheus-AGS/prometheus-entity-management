import type { A2uiActionDecision } from "@prometheus-ags/a2ui-react";
import { createStore } from "zustand/vanilla";
import { DEMO_FIXED_TIME } from "./types";

export interface ActionAuditEntry {
  id: number;
  actionName: string;
  outcome: "executed" | "denied";
  code: string;
  reason: string;
  timestamp: string;
}

interface ActionAuditState {
  entries: ActionAuditEntry[];
  record(decision: A2uiActionDecision): void;
  clear(): void;
}

let nextAuditId = 0;

export const actionAuditStore = createStore<ActionAuditState>((set) => ({
  entries: [],

  record(decision) {
    const entry: ActionAuditEntry = {
      id: ++nextAuditId,
      actionName: decision.action?.name ?? "invalid-action",
      outcome: decision.status,
      code: decision.status === "executed" ? "executed" : decision.code,
      reason:
        decision.status === "executed"
          ? "The application store executed the approved action."
          : decision.reason,
      timestamp: decision.action?.timestamp ?? DEMO_FIXED_TIME,
    };
    set((state) => ({ entries: [entry, ...state.entries].slice(0, 8) }));
  },

  clear() {
    set({ entries: [] });
  },
}));
