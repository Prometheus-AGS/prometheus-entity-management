import { graphStore } from "@prometheus-ags/entity-graph-core";
import { createStore } from "zustand/vanilla";
import scenarioContract from "../../../../shared/scenario-contract.json";
import {
  DEMO_FIXED_TIME,
  DEMO_LIST_KEY,
  DEMO_TENANT_ID,
  type TaskEntity,
} from "../agentic/types";

interface TaskCommandState {
  seedSharedScenario(): void;
  taskBelongsToTenant(taskId: string, tenantId: string): boolean;
  updateStatus(taskId: string, status: string): TaskEntity;
}

function sharedTasks(): TaskEntity[] {
  return scenarioContract.domain.seed.Task.map((task) => ({ ...task }));
}

export const taskCommandStore = createStore<TaskCommandState>(() => ({
  seedSharedScenario() {
    const state = graphStore.getState();
    state.upsertEntities(
      "Task",
      sharedTasks().map((task) => ({ id: task.id, data: task })),
    );
    const ids = scenarioContract.domain.lists[DEMO_LIST_KEY];
    state.setListResult(DEMO_LIST_KEY, [...ids], {
      total: ids.length,
      hasNextPage: false,
      nextCursor: null,
    });
  },

  taskBelongsToTenant(taskId, tenantId) {
    const task = graphStore.getState().readEntity<TaskEntity>("Task", taskId);
    return task?.tenantId === tenantId;
  },

  updateStatus(taskId, status) {
    const state = graphStore.getState();
    const current = state.readEntity<TaskEntity>("Task", taskId);
    if (!current) {
      throw new Error(`Task is not present in the canonical graph: ${taskId}`);
    }
    if (current.tenantId !== DEMO_TENANT_ID) {
      throw new Error(`Task is outside the demo tenant boundary: ${taskId}`);
    }
    state.upsertEntity("Task", taskId, {
      status,
      version: current.version + 1,
      updatedAt: DEMO_FIXED_TIME,
    });
    return state.readEntity<TaskEntity>("Task", taskId) ?? {
      ...current,
      status,
    };
  },
}));
