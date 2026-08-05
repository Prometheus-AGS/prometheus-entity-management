"use server";

import type { Task } from "@/types";
import { demoTasks } from "@/features/demo-backend/demo-seed";

const taskStatuses: ReadonlySet<Task["status"]> = new Set([
  "backlog",
  "todo",
  "in-progress",
  "review",
  "done",
]);

export interface ConfirmTaskUpdateInput {
  id: string;
  status: Task["status"];
}

/** Server Action boundary for the deterministic example transport. */
export async function confirmTaskUpdate({
  id,
  status,
}: ConfirmTaskUpdateInput): Promise<Task> {
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Task id is required");
  }
  if (!taskStatuses.has(status)) {
    throw new Error(`Unsupported task status: ${String(status)}`);
  }

  const current = demoTasks.find((task) => task.id === id);
  if (!current) throw new Error(`Unknown task: ${id}`);

  return {
    ...current,
    status,
    updatedAt: new Date().toISOString(),
  };
}
