import {
  useEntity,
  useEntityCRUD,
  useEntityList,
  useEntityMutation,
} from "@prometheus-ags/prometheus-entity-management";
import type { ViewDescriptor } from "@prometheus-ags/prometheus-entity-management";
import { taskStore } from "./task-store";
import type { TaskListParams } from "@/features/demo-backend/demo-backend-store";
import type { Task } from "@/types";

const normalizeTask = (task: Task) => ({ id: task.id, data: task });

export function useTasksList(
  queryKey: unknown[] = ["tasks"],
  params?: TaskListParams,
) {
  return useEntityList<Task, Task>({
    type: "Task",
    queryKey,
    fetch: () => taskStore.list(params),
    normalize: normalizeTask,
  });
}

export function useTask(id: string | null | undefined) {
  return useEntity<Task, Task>({
    type: "Task",
    id: id ?? undefined,
    fetch: taskStore.get,
    normalize: (task) => task,
    enabled: !!id,
  });
}

interface UseTasksCrudOptions {
  listQueryKey?: unknown[];
  initialView?: ViewDescriptor;
  createDefaults?: Partial<Task>;
}

export function useTasksCrud(options: UseTasksCrudOptions = {}) {
  const {
    listQueryKey = ["tasks"],
    initialView = { sort: [{ field: "updatedAt", direction: "desc" }] },
    createDefaults = {
      status: "backlog",
      priority: "medium",
      tags: [],
      projectId: "p1",
      loggedHours: 0,
    },
  } = options;

  return useEntityCRUD<Task>({
    type: "Task",
    listQueryKey,
    listFetch: ({ rest }) => taskStore.list(rest as TaskListParams),
    normalize: normalizeTask,
    detailFetch: taskStore.get,
    onCreate: (data) => taskStore.create(data),
    onUpdate: (id, patch) => taskStore.update(id, patch),
    onDelete: (id) => taskStore.delete(id),
    createDefaults,
    initialView,
  });
}

export function useTaskStatusMutation() {
  return useEntityMutation<{ id: string; status: Task["status"] }, Task, Task>({
    type: "Task",
    mutate: ({ id, status }) => taskStore.update(id, { status }),
    optimistic: ({ id, status }) => ({ id, patch: { status } }),
    normalize: (task) => normalizeTask(task),
  });
}
