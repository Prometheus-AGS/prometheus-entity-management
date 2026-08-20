/**
 * Per-request demo data source (server-only).
 *
 * Every read deep-clones from the static demo seed, so concurrent requests can
 * never observe or mutate each other's data. When a `tenant` is supplied the
 * seed is projected into a tenant-unique slice (`project-<tenant>` plus that
 * tenant's tasks) — this is what the concurrent SSR isolation tests use to
 * prove that two simultaneous requests cannot contaminate one another.
 *
 * Import discipline: relative imports only. This module is imported by root
 * node:test isolation tests, so it must not rely on the app's `@/` alias.
 */

import { demoProjects, demoTasks, demoUsers } from "../../features/demo-backend/demo-seed";
import type { Project, Task, User } from "../../types";

export interface RequestSeed {
  users: User[];
  projects: Project[];
  tasks: Task[];
}

const cloneUser = (user: User): User => ({ ...user });
const cloneProject = (project: Project): Project => ({
  ...project,
  memberIds: [...project.memberIds],
  tags: [...project.tags],
});
const cloneTask = (task: Task): Task => ({ ...task, tags: [...task.tags] });

function cloneFullSeed(): RequestSeed {
  return {
    users: demoUsers.map(cloneUser),
    projects: demoProjects.map(cloneProject),
    tasks: demoTasks.map(cloneTask),
  };
}

function tenantSlice(tenant: string): RequestSeed {
  const seed = cloneFullSeed();
  const project: Project = {
    ...cloneProject(demoProjects[0] as Project),
    id: `project-${tenant}`,
    name: `${tenant[0]?.toUpperCase() ?? ""}${tenant.slice(1)} Program`,
  };
  const tasks = demoTasks.slice(0, 3).map((task, index) => ({
    ...cloneTask(task),
    id: `${tenant}-t${index + 1}`,
    projectId: project.id,
  }));
  return { users: seed.users, projects: [project], tasks };
}

/**
 * Returns a request-owned seed. Without a tenant this is a full deep clone of
 * the demo seed; with a tenant it is a tenant-unique slice.
 */
export function getRequestSeed(tenant?: string): RequestSeed {
  return tenant ? tenantSlice(tenant) : cloneFullSeed();
}

/** Simulated server data latency so route-level Suspense fallbacks are exercised. */
export function simulateRequestLatency(minMs = 40): Promise<void> {
  const jitter = Math.floor(Math.random() * 100);
  return new Promise((resolve) => setTimeout(resolve, minMs + jitter));
}
