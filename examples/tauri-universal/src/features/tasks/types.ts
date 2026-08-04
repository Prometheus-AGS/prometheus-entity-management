export const TASK_LIST_KEY = "tauri-universal:tasks";
export const ENTITY_TYPES = {
  task: "Task",
  project: "Project",
  user: "User",
} as const;

export const TASK_STATUSES = ["backlog", "active", "review", "done"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface TaskEntity {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: "low" | "medium" | "high";
  projectId: string;
  assigneeId: string;
  updatedAt: string;
  pendingSync?: boolean;
}

export interface ProjectEntity {
  id: string;
  name: string;
  accent: string;
}

export interface UserEntity {
  id: string;
  name: string;
  initials: string;
}

export interface TaskView extends TaskEntity {
  project: ProjectEntity | null;
  assignee: UserEntity | null;
}
