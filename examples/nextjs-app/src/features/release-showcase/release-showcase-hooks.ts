import { useCallback, useEffect, useMemo } from "react";
import {
  useEntity,
  useEntityAugment,
  useEntityQuery,
  useGraphDevTools,
  useSuspenseEntity,
} from "@prometheus-ags/prometheus-entity-management";
import { useProjectsList } from "@/features/projects/project-hooks";
import { taskStore } from "@/features/tasks/task-store";
import type { Task } from "@/types";
import { useReleaseShowcaseStore } from "./release-showcase-store";

const normalizeTask = (task: Task) => task;

export function useReleaseShowcase() {
  const state = useReleaseShowcaseStore();
  const initialView = useMemo(
    () => ({
      sort: [{ field: "updatedAt", direction: "desc" as const }],
      search: { query: "", fields: ["title", "description"] },
    }),
    [],
  );
  const view = useEntityQuery<Task>("Task", {
    mode: state.viewMode,
    view: initialView,
    remoteDebounce: 80,
  });
  const selected = useEntity<Task, Task>({
    type: "Task",
    id: state.selectedTaskId,
    fetch: taskStore.get,
    normalize: normalizeTask,
  });
  const augment = useEntityAugment<Task>("Task", state.selectedTaskId);
  const projects = useProjectsList();
  const devtools = useGraphDevTools();
  const { setSearch: setViewSearch } = view;

  useEffect(() => {
    setViewSearch(state.search);
  }, [state.search, setViewSearch]);

  const runOptimistic = useCallback(
    async (reject: boolean) => {
      const status: Task["status"] = reject ? "done" : "in-progress";
      augment.augment({ status });
      try {
        await state.updateStatus(state.selectedTaskId, status, reject);
        augment.clear();
        state.setMutationProof({
          outcome: "confirmed",
          message: `Server confirmed ${state.selectedTaskId} as ${status}`,
        });
      } catch (error) {
        augment.clear();
        state.setMutationProof({
          outcome: "rolled-back",
          message: error instanceof Error ? error.message : String(error),
        });
      }
    },
    [augment, state],
  );

  const reassign = useCallback(async () => {
    const current = selected.data?.projectId;
    const nextProject = projects.items.find((project) => project.id !== current);
    if (nextProject) await state.reassign(state.selectedTaskId, nextProject.id);
  }, [projects.items, selected.data?.projectId, state]);

  return {
    state,
    view,
    selected,
    patch: augment.patch,
    projects: projects.items,
    devtools,
    runOptimistic,
    reassign,
  };
}

export function useShowcaseSuspenseTask(errorRun: number) {
  const id = errorRun > 0 ? `missing-showcase-task-${errorRun}` : "t1";
  return useSuspenseEntity<Task, Task>({
    type: "Task",
    id,
    fetch: taskStore.get,
    normalize: normalizeTask,
  });
}
