import { useEntity, useEntityCRUD, useEntityList } from "prometheus-entity-management";
import type { ViewDescriptor } from "prometheus-entity-management";
import { projectStore } from "./project-store";
import { taskStore } from "@/features/tasks/task-store";
import type {
  ProjectListParams,
  TaskListParams,
} from "@/features/demo-backend/demo-backend-store";
import type { Project, Task } from "@/types";

const normalizeProject = (project: Project) => ({ id: project.id, data: project });
const normalizeTask = (task: Task) => ({ id: task.id, data: task });

export function useProjectsList(
  queryKey: unknown[] = ["projects"],
  params?: ProjectListParams,
) {
  return useEntityList<Project, Project>({
    type: "Project",
    queryKey,
    fetch: () => projectStore.list(params),
    normalize: normalizeProject,
  });
}

export function useProject(id: string | null | undefined) {
  return useEntity<Project, Project>({
    type: "Project",
    id: id ?? undefined,
    fetch: projectStore.get,
    normalize: (project) => project,
    enabled: !!id,
  });
}

export function useProjectTasks(projectId: string | null | undefined) {
  return useEntityList<Task, Task>({
    type: "Task",
    queryKey: ["tasks", { projectId }],
    fetch: () => taskStore.list({ projectId: projectId ?? undefined }),
    normalize: normalizeTask,
    enabled: !!projectId,
  });
}

interface UseProjectsCrudOptions {
  listQueryKey?: unknown[];
  initialView?: ViewDescriptor;
  createDefaults?: Partial<Project>;
}

export function useProjectsCrud(options: UseProjectsCrudOptions = {}) {
  const {
    listQueryKey = ["projects"],
    initialView = { sort: [{ field: "createdAt", direction: "desc" }] },
    createDefaults = {
      status: "planning",
      priority: "medium",
      budget: 0,
      progress: 0,
      memberIds: [],
      tags: [],
    },
  } = options;

  return useEntityCRUD<Project>({
    type: "Project",
    listQueryKey,
    listFetch: ({ rest }) => projectStore.list(rest as ProjectListParams),
    normalize: normalizeProject,
    detailFetch: projectStore.get,
    onCreate: (data) => projectStore.create(data),
    onUpdate: (id, patch) => projectStore.update(id, patch),
    onDelete: (id) => projectStore.delete(id),
    createDefaults,
    initialView,
    selectAfterCreate: true,
  });
}

export type { ProjectListParams, TaskListParams };
