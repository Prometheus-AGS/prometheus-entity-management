/**
 * domain/seed.ts
 *
 * Deterministic seed shared with the other 3.0 showcases: the task-sync board
 * on project-atlas inside tenant-a (design D-1). Fixed timestamps keep
 * screenshots and receipts reproducible.
 */
import type { Project, Task, User } from "./types";
import { TENANT_ID } from "./types";

export const SEED_USERS: User[] = [
  { id: "user-ada", name: "Ada Lovelace", email: "ada@prometheus.dev", tenantId: TENANT_ID },
  { id: "user-grace", name: "Grace Hopper", email: "grace@prometheus.dev", tenantId: TENANT_ID },
];

export const SEED_PROJECTS: Project[] = [
  { id: "project-atlas", name: "Atlas", ownerId: "user-ada", tenantId: TENANT_ID },
  { id: "project-beacon", name: "Beacon", ownerId: "user-grace", tenantId: TENANT_ID },
];

export const SEED_TASKS: Task[] = [
  {
    id: "task-sync",
    title: "Sync engine cutover",
    status: "in-progress",
    projectId: "project-atlas",
    assigneeId: "user-ada",
    reporterId: "user-grace",
    tenantId: TENANT_ID,
    updatedAt: 1_756_000_000_000,
  },
  {
    id: "task-offline",
    title: "Offline restart proof",
    status: "todo",
    projectId: "project-atlas",
    assigneeId: "user-grace",
    reporterId: "user-ada",
    tenantId: TENANT_ID,
    updatedAt: 1_756_000_100_000,
  },
  {
    id: "task-mobile",
    title: "Mobile layout pass",
    status: "done",
    projectId: "project-beacon",
    assigneeId: "user-ada",
    reporterId: "user-ada",
    tenantId: TENANT_ID,
    updatedAt: 1_756_000_200_000,
  },
];
