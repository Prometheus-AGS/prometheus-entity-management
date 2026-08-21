/**
 * domain/types.ts
 *
 * Shared release-wide domain: the same Task/Project/User shape used by the
 * Vite, Next.js, agentic-A2UI, and Flutter showcases (design D-1).
 */

export interface User {
  id: string;
  name: string;
  email: string;
  tenantId: string;
}

export interface Project {
  id: string;
  name: string;
  ownerId: string;
  tenantId: string;
}

export type TaskStatus = "todo" | "in-progress" | "done";

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  projectId: string;
  assigneeId: string;
  reporterId: string;
  tenantId: string;
  updatedAt: number;
}

export const TENANT_ID = "tenant-a";
