import type { ProjectEntity, TaskEntity, UserEntity } from "./types";

export const SEED_PROJECTS: ProjectEntity[] = [
  { id: "project-release", name: "3.0 release", accent: "#f5b82e" },
  { id: "project-mobile", name: "Universal runtime", accent: "#40c9a2" },
];

export const SEED_USERS: UserEntity[] = [
  { id: "user-aria", name: "Aria Chen", initials: "AC" },
  { id: "user-malik", name: "Malik Jones", initials: "MJ" },
  { id: "user-rin", name: "Rin Ito", initials: "RI" },
];

export const SEED_TASKS: TaskEntity[] = [
  {
    id: "task-native-persistence",
    title: "Certify native persistence",
    description: "Persist the normalized graph in SQLite and restore it after a process restart.",
    status: "active",
    priority: "high",
    projectId: "project-release",
    assigneeId: "user-aria",
    updatedAt: "2026-08-04T00:00:00.000Z",
  },
  {
    id: "task-mobile-smoke",
    title: "Run Android and iOS smoke lanes",
    description: "Exercise the same application graph and command bridge on both mobile targets.",
    status: "backlog",
    priority: "high",
    projectId: "project-mobile",
    assigneeId: "user-malik",
    updatedAt: "2026-08-04T00:01:00.000Z",
  },
  {
    id: "task-denied-capability",
    title: "Prove destructive commands are denied",
    description: "Keep graph clear and removal permissions outside the main webview capability.",
    status: "review",
    priority: "medium",
    projectId: "project-release",
    assigneeId: "user-rin",
    updatedAt: "2026-08-04T00:02:00.000Z",
  },
  {
    id: "task-deep-link",
    title: "Validate task deep links",
    description: "Accept only the registered scheme, tenant, route, and an ID already in the graph.",
    status: "done",
    priority: "medium",
    projectId: "project-mobile",
    assigneeId: "user-aria",
    updatedAt: "2026-08-04T00:03:00.000Z",
  },
];
