import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrometheusA2uiError } from "@prometheus-ags/a2ui-react";
import {
  agentSessionStore,
  classifyAgentFailure,
} from "./agent-session-store";
import { canCancelAgentTask } from "./hooks";
import { agentActionPolicy, TASK_ACTIONS } from "./action-policy";
import { approvalStore } from "./approval-store";
import { agentA2uiRuntime } from "./runtime";
import {
  DEMO_FIXED_TIME,
  DEMO_SURFACE_ID,
  DEMO_TASK_ID,
  DEMO_TENANT_ID,
} from "./types";

beforeEach(() => {
  agentSessionStore.getState().reset();
});

describe("A2A stream to A2UI runtime integration", () => {
  it("streams submitted, working, artifact, and completed state without a model key", async () => {
    expect(canCancelAgentTask("submitted", null)).toBe(false);
    expect(canCancelAgentTask("submitted", "task-known")).toBe(true);
    expect(canCancelAgentTask("working", "task-known")).toBe(true);

    await agentSessionStore.getState().run("happy");

    const state = agentSessionStore.getState();
    expect(state.lifecycle).toBe("completed");
    expect(state.taskId).toEqual(expect.any(String));
    expect(state.taskId?.length).toBeGreaterThan(0);
    expect(state.error).toBeNull();
    expect(state.artifacts).toEqual([
      expect.objectContaining({
        name: "Shared-domain task review",
        mediaType: "application/json+a2ui",
        messageCount: 3,
      }),
    ]);
    expect(agentA2uiRuntime.getSurface(DEMO_SURFACE_ID)?.catalog.id).toBe(
      "urn:prometheus-ags:a2ui:catalog:v3",
    );
  });

  it("rejects a malformed agent component before rendering or graph mutation", async () => {
    expect(classifyAgentFailure(new Error("transport failed"))).toBe("failed");
    expect(
      classifyAgentFailure(
        new PrometheusA2uiError("component-not-allowed", "component rejected"),
      ),
    ).toBe("validation-failed");

    await agentSessionStore.getState().run("happy");
    expect(agentA2uiRuntime.getSurface(DEMO_SURFACE_ID)).toBeDefined();

    await agentSessionStore.getState().run("malformed");

    const state = agentSessionStore.getState();
    expect(state.lifecycle).toBe("validation-failed");
    expect(state.error).toMatch(/not allowed|UntrustedShellCommand/i);
    expect(state.artifacts).toEqual([]);
    expect(agentA2uiRuntime.getSurface(DEMO_SURFACE_ID)).toBeUndefined();
    expect(agentA2uiRuntime.getSurface("surface-malformed")).toBeUndefined();
  });

  it("denies pending destructive approvals before a new run or reset", async () => {
    const requestArchive = () =>
      agentActionPolicy.handle({
        name: TASK_ACTIONS.archive,
        context: { taskId: DEMO_TASK_ID, tenantId: DEMO_TENANT_ID },
        surfaceId: DEMO_SURFACE_ID,
        sourceComponentId: "archive-task-button",
        timestamp: DEMO_FIXED_TIME,
      });

    const pendingBeforeRun = requestArchive();
    await vi.waitFor(() => expect(approvalStore.getState().pending).not.toBeNull());
    const run = agentSessionStore.getState().run("malformed");
    const approvalAfterRun = approvalStore.getState().pending;
    if (approvalAfterRun) approvalStore.getState().resolve(false);
    expect(approvalAfterRun).toBeNull();
    await expect(pendingBeforeRun).resolves.toMatchObject({
      status: "denied",
      code: "approval-denied",
    });
    await run;

    const pendingBeforeReset = requestArchive();
    await vi.waitFor(() => expect(approvalStore.getState().pending).not.toBeNull());
    agentSessionStore.getState().reset();
    const approvalAfterReset = approvalStore.getState().pending;
    if (approvalAfterReset) approvalStore.getState().resolve(false);
    expect(approvalAfterReset).toBeNull();
    await expect(pendingBeforeReset).resolves.toMatchObject({
      status: "denied",
      code: "approval-denied",
    });
  });

  it("cancels a working task before artifact delivery", async () => {
    const run = agentSessionStore.getState().run("cancelled");
    await vi.waitFor(
      () => expect(agentSessionStore.getState().lifecycle).toBe("working"),
      { timeout: 1_000 },
    );
    await agentSessionStore.getState().cancel();
    await run;

    const state = agentSessionStore.getState();
    expect(state.lifecycle).toBe("cancelled");
    expect(state.error).toBeNull();
    expect(state.artifacts).toEqual([]);
  }, 5_000);
});
