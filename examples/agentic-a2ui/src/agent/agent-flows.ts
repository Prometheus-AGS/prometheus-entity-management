/**
 * Demo agent flows: deterministic, keyless orchestrations over the A2A
 * server and the A2UI runtime. Each flow maps to one acceptance behavior.
 */
import type { A2AServer } from "@prometheus-ags/entity-graph-a2a";
import type { PrometheusA2uiRuntime } from "@prometheus-ags/a2ui-react";
import { auditLog } from "../lib/audit-store";
import { demoCaller } from "./agent-server";
import {
  cancelTask,
  graphRequestMessage,
  runStreamingTask,
  surfaceRequestMessage,
} from "./agent-client";
import { createTaskBoardSurfaceMessages } from "./surface-messages";
import { DEMO_TENANT } from "../lib/demo-data";

function now(): string {
  return new Date().toISOString();
}

/** Happy path: authorized patch streams submitted → working → completed. */
export async function runHappyUpdate(server: A2AServer, tenantId: string): Promise<string> {
  const message = graphRequestMessage({
    kind: "prometheus.entity-graph.request",
    version: "1.0",
    operation: "mutate",
    mutations: [
      {
        op: "upsert",
        entityType: "Task",
        id: "task-schema",
        data: { status: "done" },
      },
    ],
  });
  const { finalState } = await runStreamingTask(server, message, demoCaller(tenantId), (event) => {
    auditLog.recordTask({
      taskId: "happy",
      state: event.state ?? event.kind,
      detail: event.kind === "artifact" ? "graph result artifact" : "status update",
      at: now(),
    });
  });
  return finalState ?? "unknown";
}

/** Denied path: remove is not allowlisted; the task ends rejected. */
export async function runDeniedDelete(server: A2AServer, tenantId: string): Promise<string> {
  const message = graphRequestMessage({
    kind: "prometheus.entity-graph.request",
    version: "1.0",
    operation: "mutate",
    mutations: [{ op: "remove", entityType: "Task", id: "task-sync" }],
  });
  const { finalState } = await runStreamingTask(server, message, demoCaller(tenantId), (event) => {
    auditLog.recordTask({
      taskId: "denied",
      state: event.state ?? event.kind,
      detail: "remove is outside the Task allowlist",
      at: now(),
    });
  });
  return finalState ?? "unknown";
}

/** Malformed path: invalid JSON-RPC payloads are rejected before dispatch. */
export async function runMalformedPayload(
  server: A2AServer,
  tenantId: string,
): Promise<{ code: number | null }> {
  const response = await server.handleRequest(
    { jsonrpc: "2.0", id: "malformed-1", method: "SendMessage", params: { nope: true } },
    { caller: demoCaller(tenantId) },
  );
  const envelope = response as { error?: { code?: number } };
  auditLog.recordTask({
    taskId: "malformed",
    state: "rejected",
    detail: `JSON-RPC error ${envelope.error?.code ?? "unknown"}`,
    at: now(),
  });
  return { code: envelope.error?.code ?? null };
}

/** Cancellation path: a working task is cancelled mid-stream via CancelTask. */
export async function runCancellableStream(
  server: A2AServer,
  tenantId: string,
): Promise<string> {
  const caller = demoCaller(tenantId);
  const message = surfaceRequestMessage("Render the task board surface.");
  let cancelled = false;
  const result = await runStreamingTask(server, message, caller, (event) => {
    auditLog.recordTask({
      taskId: "cancellable",
      state: event.state ?? event.kind,
      detail: event.kind,
      at: now(),
    });
    const resultPayload = event.raw.result as Record<string, any> | undefined;
    const streamTaskId: string | undefined =
      resultPayload?.task?.id ??
      resultPayload?.statusUpdate?.taskId ??
      resultPayload?.artifactUpdate?.taskId;
    // Cancel once, while the task is still in its working window.
    if (!cancelled && streamTaskId && event.state === "TASK_STATE_WORKING") {
      cancelled = true;
      void cancelTask(server, streamTaskId, caller);
    }
  });
  return result.finalState ?? "unknown";
}

/**
 * Surface path: the A2A wire path returns the executor's deterministic A2UI
 * artifact; the app-owned planner then projects the fixed task-board surface
 * (`surface-task-sync`) into the same runtime.
 */
export async function runSurfaceProjection(
  server: A2AServer,
  runtime: PrometheusA2uiRuntime,
  tenantId: string,
): Promise<void> {
  const message = surfaceRequestMessage("Render the task board surface.");
  await runStreamingTask(server, message, demoCaller(tenantId), (event) => {
    auditLog.recordTask({
      taskId: "surface",
      state: event.state ?? event.kind,
      detail: event.kind === "artifact" ? "A2UI artifact over A2A" : "status update",
      at: now(),
    });
  });
  runtime.processMessages(
    createTaskBoardSurfaceMessages({
      taskId: "task-sync",
      title: "Wire realtime sync",
      status: "todo",
      tenantId: tenantId === DEMO_TENANT ? DEMO_TENANT : tenantId,
    }),
  );
}
