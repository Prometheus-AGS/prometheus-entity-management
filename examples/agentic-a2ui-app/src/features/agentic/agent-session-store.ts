import { createStore } from "zustand/vanilla";
import { PrometheusA2uiError } from "@prometheus-ags/a2ui-react";
import { taskCommandStore } from "../tasks/task-command-store";
import { actionAuditStore } from "./action-audit-store";
import { a2aClientService } from "./a2a-client-service";
import { agentTransportConfiguration } from "./agent-server";
import { approvalStore } from "./approval-store";
import { clearAgentSurfaces, processAgentSurface } from "./runtime";
import type {
  AgentArtifactReceipt,
  AgentLifecycle,
  AgentScenario,
} from "./types";

interface AgentSessionState {
  lifecycle: AgentLifecycle;
  scenario: AgentScenario | null;
  taskId: string | null;
  artifacts: AgentArtifactReceipt[];
  error: string | null;
  run(scenario: AgentScenario): Promise<void>;
  cancel(): Promise<void>;
  reset(): void;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown agent transport failure.";
}

export function classifyAgentFailure(error: unknown): AgentLifecycle {
  return error instanceof PrometheusA2uiError ? "validation-failed" : "failed";
}

export const agentSessionStore = createStore<AgentSessionState>((set) => ({
  lifecycle: "idle",
  scenario: null,
  taskId: null,
  artifacts: [],
  error: null,

  async run(scenario) {
    approvalStore.getState().resolve(false);
    clearAgentSurfaces();
    set({
      lifecycle: "submitted",
      scenario,
      taskId: null,
      artifacts: [],
      error: null,
    });
    try {
      await a2aClientService.run(scenario, {
        onTask: (taskId) => set({ taskId }),
        onLifecycle: (lifecycle) => set({ lifecycle }),
        onArtifact: (messages, receipt) => {
          processAgentSurface(messages);
          set((state) => ({ artifacts: [...state.artifacts, receipt] }));
        },
      });
    } catch (error) {
      set({
        lifecycle: classifyAgentFailure(error),
        error: errorMessage(error),
      });
    }
  },

  async cancel() {
    set({ lifecycle: "cancelling", error: null });
    try {
      const accepted = await a2aClientService.cancel();
      if (!accepted) {
        set({
          lifecycle: "failed",
          error: "No active A2A task was available to cancel.",
        });
      }
    } catch (error) {
      set({ lifecycle: "failed", error: errorMessage(error) });
    }
  },

  reset() {
    approvalStore.getState().resolve(false);
    clearAgentSurfaces();
    taskCommandStore.getState().seedSharedScenario();
    actionAuditStore.getState().clear();
    set({
      lifecycle: "idle",
      scenario: null,
      taskId: null,
      artifacts: [],
      error: null,
    });
  },
}));

export { agentTransportConfiguration };
