import type { ListResponse } from "@prometheus-ags/prometheus-entity-management";
import { delay, useDemoBackendStore } from "@/features/demo-backend/demo-backend-store";
import type { TaskListParams } from "@/features/demo-backend/demo-backend-store";
import type { Task } from "@/types";

export const taskStore = {
  async list(params?: TaskListParams): Promise<ListResponse<Task>> {
    await delay(250);
    const items = useDemoBackendStore.getState().listTasks(params);
    return { items, total: items.length };
  },
  async get(id: string): Promise<Task> {
    await delay(150);
    const task = useDemoBackendStore.getState().getTask(id);
    if (!task) {
      throw new Error(`Task ${id} not found`);
    }
    return task;
  },
  async create(data: Partial<Task>): Promise<Task> {
    await delay();
    return useDemoBackendStore.getState().createTask(data);
  },
  async update(id: string, patch: Partial<Task>): Promise<Task> {
    await delay();
    return useDemoBackendStore.getState().updateTask(id, patch);
  },
  async delete(id: string): Promise<void> {
    await delay();
    useDemoBackendStore.getState().deleteTask(id);
  },
};
