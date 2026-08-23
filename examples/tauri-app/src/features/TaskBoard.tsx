/**
 * features/TaskBoard.tsx
 *
 * Task board: list + detail + edit/create via `useEntityCRUD`. Optimistic
 * saves roll back when the bridge denies the native mirror (fail-closed), and
 * every confirmed mutation cascades invalidation through the registered
 * schemas (design D-1/D-2).
 */
import { useEffect, useMemo, useState } from "react";
import {
  useEntityCRUD,
  useEntityList,
  useGraphStore,
} from "@prometheus-ags/prometheus-entity-management";
import type { Task, TaskStatus } from "../domain/types";
import { SEED_PROJECTS } from "../domain/seed";
import { advanceTaskStatus, listTasks, mirrorTask, mirrorTaskRemoval, simulateRemoteTaskChange } from "./task-service";

const STATUS_ORDER: TaskStatus[] = ["todo", "in-progress", "done"];

export function TaskBoard({ onDenial }: { onDenial: (message: string) => void }) {
  const [projectFilter, setProjectFilter] = useState<string>("all");

  const crud = useEntityCRUD<Task>({
    type: "Task",
    listQueryKey: ["tasks"],
    listFetch: () =>
      Promise.resolve({
        items: listTasks(),
        total: listTasks().length,
        nextCursor: null,
      }),
    normalize: (raw) => ({ id: raw.id, data: raw }),
    onUpdate: async (id, patch) => {
      const current = useGraphStore.getState().readEntity<Task>("Task", id);
      const next = { ...current, ...patch, updatedAt: Date.now() } as Task;
      await mirrorTask(next);
      return next;
    },
    onCreate: async (data) => {
      const task = {
        id: `task-${Date.now()}`,
        title: "Untitled task",
        status: "todo",
        projectId: "project-atlas",
        assigneeId: "user-ada",
        reporterId: "user-ada",
        tenantId: "tenant-a",
        ...data,
        updatedAt: Date.now(),
      } as Task;
      await mirrorTask(task);
      return task;
    },
    onDelete: async (id) => {
      await mirrorTaskRemoval(String(id));
    },
    onError: (_op, error) => onDenial(error.message),
  });

  // Board list reads the reactive graph join (Tier-A pure subscription): any
  // canonical write — optimistic save, realtime tick, hydration — re-renders
  // every joined view without an imperative refetch.
  const { items: tasks } = useEntityList<Task, Task>({ type: "Task", queryKey: ["tasks"] });
  const visible = useMemo(
    () => (projectFilter === "all" ? tasks : tasks.filter((t) => t.projectId === projectFilter)),
    [tasks, projectFilter],
  );

  useEffect(() => {
    document.title = `Tasks (${tasks.length}) · Tauri Universal`;
  }, [tasks.length]);

  return (
    <section aria-label="Task board" className="board">
      <header className="board-header">
        <h2>Task board</h2>
        <label>
          Project{" "}
          <select
            aria-label="Filter by project"
            value={projectFilter}
            onChange={(event) => setProjectFilter(event.target.value)}
          >
            <option value="all">All projects</option>
            {SEED_PROJECTS.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
      </header>

      <ul className="task-list" aria-label="Tasks">
        {visible.map((task) => (
          <li key={task.id} className={`task-row status-${task.status}`}>
            <button type="button" className="task-title" onClick={() => crud.openDetail(task.id)}>
              {task.title}
            </button>
            <span className="task-status">{task.status}</span>
            <button
              type="button"
              aria-label={`Advance ${task.title}`}
              onClick={() => {
                const next =
                  STATUS_ORDER[(STATUS_ORDER.indexOf(task.status) + 1) % STATUS_ORDER.length];
                advanceTaskStatus(task.id, next).catch((error: unknown) =>
                  onDenial(error instanceof Error ? error.message : String(error)),
                );
              }}
            >
              Advance
            </button>
            <button
              type="button"
              aria-label={`Simulate remote update for ${task.title}`}
              onClick={() => simulateRemoteTaskChange(task.id, { title: `${task.title} ⟳` })}
            >
              Remote tick
            </button>
          </li>
        ))}
      </ul>

      {crud.mode !== "list" && crud.detail ? (
        <aside className="task-detail" aria-label="Task detail">
          <h3>{crud.detail.title}</h3>
          <p>
            Project: <strong>{crud.detail.projectId}</strong> · Assignee:{" "}
            <strong>{crud.detail.assigneeId}</strong>
          </p>
          <label>
            Title{" "}
            <input
              aria-label="Edit title"
              value={String(crud.editBuffer.title ?? "")}
              onChange={(event) => {
                crud.startEdit(crud.detail!.id);
                crud.setField("title", event.target.value);
              }}
            />
          </label>
          <div className="detail-actions">
            <button type="button" disabled={crud.isSaving} onClick={() => void crud.save()}>
              {crud.isSaving ? "Saving…" : "Save (optimistic)"}
            </button>
            <button type="button" onClick={() => crud.cancelEdit()}>
              Close
            </button>
            <button
              type="button"
              className="danger"
              disabled={crud.isDeleting}
              onClick={() => void crud.deleteEntity(crud.detail!.id)}
            >
              Delete
            </button>
          </div>
          {crud.saveError ? <p role="alert">{crud.saveError}</p> : null}
        </aside>
      ) : null}
    </section>
  );
}
