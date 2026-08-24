import { useEffect, useMemo } from "react";
import { useGraphStore, useGraphSyncStatus } from "@prometheus-ags/prometheus-entity-management";
import { useShallow } from "zustand/react/shallow";
import {
  ENTITY_TYPES,
  TASK_LIST_KEY,
  type ProjectEntity,
  type TaskEntity,
  type TaskStatus,
  type TaskView,
  type UserEntity,
} from "@/features/tasks/types";
import { usePlatformStore } from "./stores/platform-store";

const EMPTY_IDS: string[] = [];
const EMPTY_ROWS: Record<string, Record<string, unknown>> = {};

export function useUniversalPlatform() {
  const state = usePlatformStore(
    useShallow((store) => ({
      phase: store.phase,
      error: store.error,
      platform: store.platform,
      connection: store.connection,
      storage: store.storage,
      pendingMutations: store.pendingMutations,
      lastPersistedAt: store.lastPersistedAt,
      lifecycle: store.lifecycle,
      deepLink: store.deepLink,
      capabilityProof: store.capabilityProof,
      relationshipProof: store.relationshipProof,
      realtimeProof: store.realtimeProof,
      selectedTaskId: store.selectedTaskId,
      initialize: store.initialize,
      selectTask: store.selectTask,
      setConnection: store.setConnection,
      updateTaskStatus: store.updateTaskStatus,
      reassignTaskProject: store.reassignTaskProject,
      runRealtimeBurst: store.runRealtimeBurst,
      persist: store.persist,
      restore: store.restore,
      proveDestructiveCommandDenied: store.proveDestructiveCommandDenied,
    })),
  );
  const graphSync = useGraphSyncStatus();
  const { initialize } = state;

  useEffect(() => {
    void initialize();
  }, [initialize]);

  return { ...state, graphSync };
}

export function useTaskBoard() {
  const ids = useGraphStore((state) => state.lists[TASK_LIST_KEY]?.ids ?? EMPTY_IDS);
  const tasksById = useGraphStore((state) => state.entities[ENTITY_TYPES.task] ?? EMPTY_ROWS);
  const taskPatches = useGraphStore((state) => state.patches[ENTITY_TYPES.task] ?? EMPTY_ROWS);
  const projectsById = useGraphStore((state) => state.entities[ENTITY_TYPES.project] ?? EMPTY_ROWS);
  const usersById = useGraphStore((state) => state.entities[ENTITY_TYPES.user] ?? EMPTY_ROWS);
  const {
    selectedTaskId,
    selectTask,
    updateTaskStatus,
    reassignTaskProject,
    runRealtimeBurst,
  } = usePlatformStore(
    useShallow((state) => ({
      selectedTaskId: state.selectedTaskId,
      selectTask: state.selectTask,
      updateTaskStatus: state.updateTaskStatus,
      reassignTaskProject: state.reassignTaskProject,
      runRealtimeBurst: state.runRealtimeBurst,
    })),
  );

  const tasks = useMemo<TaskView[]>(
    () =>
      ids.flatMap((id) => {
        const base = tasksById[id] as unknown as TaskEntity | undefined;
        if (!base) return [];
        const patch = taskPatches[id] as Partial<TaskEntity> | undefined;
        const task = { ...base, ...patch };
        return [
          {
            ...task,
            project: (projectsById[task.projectId] as unknown as ProjectEntity | undefined) ?? null,
            assignee: (usersById[task.assigneeId] as unknown as UserEntity | undefined) ?? null,
          },
        ];
      }),
    [ids, projectsById, taskPatches, tasksById, usersById],
  );

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? tasks[0] ?? null;

  useEffect(() => {
    if (!selectedTaskId && selectedTask) selectTask(selectedTask.id);
  }, [selectTask, selectedTask, selectedTaskId]);

  const counts = useMemo(
    () => ({
      all: tasks.length,
      active: tasks.filter((task) => task.status === "active").length,
      pending: tasks.filter((task) => task.pendingSync).length,
      done: tasks.filter((task) => task.status === "done").length,
    }),
    [tasks],
  );

  return {
    tasks,
    selectedTask,
    counts,
    selectTask,
    updateStatus: (status: TaskStatus) =>
      selectedTask ? updateTaskStatus(selectedTask.id, status) : Promise.resolve(),
    reassignProject: (projectId: string) =>
      selectedTask ? reassignTaskProject(selectedTask.id, projectId) : Promise.resolve(),
    runRealtimeBurst: () =>
      selectedTask ? runRealtimeBurst(selectedTask.id) : Promise.resolve(),
  };
}
