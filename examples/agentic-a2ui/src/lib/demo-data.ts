/**
 * Deterministic demo domain for the agentic A2UI showcase.
 *
 * Names and identifiers mirror `examples/shared/scenario-contract.json` so the
 * scenario expectations (project-atlas, task-schema, task-sync,
 * surface-task-sync, task.update/task.delete) stay verifiable end to end.
 */

export interface DemoProject {
  id: string;
  tenantId: string;
  name: string;
  status: "active" | "paused" | "archived";
}

export interface DemoTask {
  id: string;
  tenantId: string;
  projectId: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  version: number;
}

export interface DemoComment {
  id: string;
  tenantId: string;
  taskId: string;
  body: string;
}

export const DEMO_TENANT = "tenant-a";
export const OTHER_TENANT = "tenant-b";

export const demoProjects: readonly DemoProject[] = [
  { id: "project-atlas", tenantId: DEMO_TENANT, name: "Atlas 3.0", status: "active" },
  { id: "project-hermes", tenantId: DEMO_TENANT, name: "Hermes Relay", status: "paused" },
];

export const demoTasks: readonly DemoTask[] = [
  {
    id: "task-schema",
    tenantId: DEMO_TENANT,
    projectId: "project-atlas",
    title: "Ship the graph schema",
    status: "in-progress",
    version: 1,
  },
  {
    id: "task-sync",
    tenantId: DEMO_TENANT,
    projectId: "project-atlas",
    title: "Wire realtime sync",
    status: "todo",
    version: 1,
  },
  {
    id: "task-foreign",
    tenantId: OTHER_TENANT,
    projectId: "project-hermes",
    title: "Foreign tenant task",
    status: "todo",
    version: 1,
  },
];

export const demoComments: readonly DemoComment[] = [
  {
    id: "comment-sync-1",
    tenantId: DEMO_TENANT,
    taskId: "task-sync",
    body: "Realtime coalescing is verified by the agent run.",
  },
];

export const LIST_KEYS = {
  activeProjects: "projects:active",
  projectTasks: "tasks:by-project:project-atlas",
  taskComments: "comments:by-task:task-sync",
} as const;
