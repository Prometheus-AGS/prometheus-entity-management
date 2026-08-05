import { useStore } from "zustand";
import { useGraphStore } from "@prometheus-ags/prometheus-entity-management";
import { actionAuditStore } from "./action-audit-store";
import { agentSessionStore, agentTransportConfiguration } from "./agent-session-store";
import { approvalStore } from "./approval-store";
import {
  DEMO_LIST_KEY,
  DEMO_TASK_ID,
  type AgentLifecycle,
  type AgentScenario,
  type TaskEntity,
} from "./types";

const EMPTY_IDS: string[] = [];
const EMPTY_TASKS: Record<string, Record<string, unknown>> = {};

export function canCancelAgentTask(
  lifecycle: AgentLifecycle,
  taskId: string | null,
): boolean {
  return (
    taskId !== null && (lifecycle === "submitted" || lifecycle === "working")
  );
}

export function useAgentSession() {
  const lifecycle = useStore(agentSessionStore, (state) => state.lifecycle);
  const scenario = useStore(agentSessionStore, (state) => state.scenario);
  const taskId = useStore(agentSessionStore, (state) => state.taskId);
  const artifacts = useStore(agentSessionStore, (state) => state.artifacts);
  const error = useStore(agentSessionStore, (state) => state.error);
  const run = useStore(agentSessionStore, (state) => state.run);
  const cancel = useStore(agentSessionStore, (state) => state.cancel);
  const reset = useStore(agentSessionStore, (state) => state.reset);

  return {
    lifecycle,
    scenario,
    taskId,
    artifacts,
    error,
    configuration: agentTransportConfiguration,
    canCancel: canCancelAgentTask(lifecycle, taskId),
    isRunning:
      lifecycle === "submitted" ||
      lifecycle === "working" ||
      lifecycle === "cancelling",
    run: (nextScenario: AgentScenario) => run(nextScenario),
    cancel,
    reset,
  };
}

export function useApproval() {
  const pending = useStore(approvalStore, (state) => state.pending);
  const resolve = useStore(approvalStore, (state) => state.resolve);
  return { pending, approve: () => resolve(true), deny: () => resolve(false) };
}

export function useActionAudit() {
  return useStore(actionAuditStore, (state) => state.entries);
}

export function useTaskViews() {
  const ids = useGraphStore(
    (state) => state.lists[DEMO_LIST_KEY]?.ids ?? EMPTY_IDS,
  );
  const taskBucket = useGraphStore(
    (state) => state.entities.Task ?? EMPTY_TASKS,
  );
  const patchBucket = useGraphStore(
    (state) => state.patches.Task ?? EMPTY_TASKS,
  );

  const tasks = ids
    .map((id) => {
      const task = taskBucket[id];
      if (!task) return null;
      return { ...task, ...patchBucket[id] } as TaskEntity;
    })
    .filter((task): task is TaskEntity => task !== null);
  const detail = tasks.find((task) => task.id === DEMO_TASK_ID) ?? null;
  return { ids, tasks, detail };
}
