export const DEMO_TENANT_ID = "tenant-prometheus-demo";
export const DEMO_TASK_ID = "task-sync";
export const DEMO_LIST_KEY = "tasks:project-atlas";
export const DEMO_SURFACE_ID = "surface-task-sync";
export const DEMO_FIXED_TIME = "2030-01-15T12:00:00.000Z";

export type AgentScenario = "happy" | "malformed" | "cancelled";

export type AgentLifecycle =
  | "idle"
  | "submitted"
  | "working"
  | "cancelling"
  | "completed"
  | "rejected"
  | "cancelled"
  | "validation-failed"
  | "failed";

export interface TaskEntity extends Record<string, unknown> {
  id: string;
  tenantId: string;
  projectId: string;
  assigneeId: string;
  title: string;
  status: string;
  priority: string;
  version: number;
  updatedAt: string;
}

export interface AgentArtifactReceipt {
  artifactId: string;
  name: string;
  mediaType: string;
  messageCount: number;
}

export interface AgentTransportConfiguration {
  mode: "deterministic" | "external";
  endpoint: string;
}
