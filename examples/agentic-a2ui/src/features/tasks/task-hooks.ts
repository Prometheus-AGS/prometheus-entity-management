/**
 * Component-facing hooks for the task feature. Components read joined views
 * through these hooks only — never the graph store directly.
 *
 * Selectors return stable graph slices (IDs, entity maps, patch maps); the
 * read-time merge happens in `useMemo` so Zustand snapshots stay referentially
 * stable between unrelated writes.
 */
import { useMemo } from "react";
import { useGraphStore } from "@prometheus-ags/prometheus-entity-management";
import { LIST_KEYS, type DemoComment, type DemoProject, type DemoTask } from "../../lib/demo-data";
import { useTaskFeatureStore, type RealtimeDemoStats } from "./task-store";

type Patched<T> = T & Record<string, unknown>;
type EntityMap = Record<string, Record<string, unknown>> | undefined;

function joinList<T>(
  ids: readonly string[] | undefined,
  entities: EntityMap,
  patches: EntityMap,
): Patched<T>[] {
  if (!ids) return [];
  const out: Patched<T>[] = [];
  for (const id of ids) {
    const canonical = entities?.[id];
    if (!canonical) continue;
    out.push({ ...canonical, ...patches?.[id] } as Patched<T>);
  }
  return out;
}

export function useActiveProjects(): Patched<DemoProject>[] {
  const ids = useGraphStore((state) => state.lists[LIST_KEYS.activeProjects]?.ids);
  const entities = useGraphStore((state) => state.entities.Project);
  const patches = useGraphStore((state) => state.patches.Project);
  return useMemo(() => joinList<DemoProject>(ids, entities, patches), [ids, entities, patches]);
}

export function useProjectTasks(): Patched<DemoTask>[] {
  const ids = useGraphStore((state) => state.lists[LIST_KEYS.projectTasks]?.ids);
  const entities = useGraphStore((state) => state.entities.Task);
  const patches = useGraphStore((state) => state.patches.Task);
  return useMemo(() => joinList<DemoTask>(ids, entities, patches), [ids, entities, patches]);
}

export function useTaskDetail(taskId: string): Patched<DemoTask> | null {
  const canonical = useGraphStore((state) => state.entities.Task?.[taskId]);
  const patch = useGraphStore((state) => state.patches.Task?.[taskId]);
  return useMemo(
    () => (canonical ? ({ ...canonical, ...patch } as Patched<DemoTask>) : null),
    [canonical, patch],
  );
}

/** Canonical (server-confirmed) read — used to prove patches never touch canonical data. */
export function useCanonicalTask(taskId: string): DemoTask | null {
  const canonical = useGraphStore((state) => state.entities.Task?.[taskId]);
  return useMemo(
    () => (canonical ? ({ ...(canonical as unknown as DemoTask) }) : null),
    [canonical],
  );
}

export function useTaskComments(): DemoComment[] {
  const ids = useGraphStore((state) => state.lists[LIST_KEYS.taskComments]?.ids);
  const entities = useGraphStore((state) => state.entities.Comment);
  return useMemo(
    () =>
      (ids ?? [])
        .map((id) => entities?.[id] as unknown as DemoComment | undefined)
        .filter((comment): comment is DemoComment => comment !== undefined),
    [ids, entities],
  );
}

export function useRealtimeStats(): RealtimeDemoStats {
  return useTaskFeatureStore((state) => state.realtime);
}
