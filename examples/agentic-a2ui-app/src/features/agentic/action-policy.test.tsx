import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentActionPolicy, TASK_ACTIONS } from "./action-policy";
import { actionAuditStore } from "./action-audit-store";
import { approvalStore } from "./approval-store";
import { useTaskViews } from "./hooks";
import { DEMO_FIXED_TIME, DEMO_TASK_ID, DEMO_TENANT_ID } from "./types";
import { taskCommandStore } from "../tasks/task-command-store";

function action(name: string, context: Record<string, unknown>) {
  return {
    name,
    context,
    surfaceId: "surface-task-sync",
    sourceComponentId: `${name}-button`,
    timestamp: DEMO_FIXED_TIME,
  };
}

beforeEach(() => {
  taskCommandStore.getState().seedSharedScenario();
  actionAuditStore.getState().clear();
  if (approvalStore.getState().pending) approvalStore.getState().resolve(false);
});

afterEach(() => {
  if (approvalStore.getState().pending) approvalStore.getState().resolve(false);
  cleanup();
});

describe("application-owned A2UI action boundary", () => {
  it("routes an approved update through the command store into every graph view", async () => {
    const hook = renderHook(() => useTaskViews());
    expect(hook.result.current.detail?.status).toBe("todo");

    let decision: Awaited<ReturnType<typeof agentActionPolicy.handle>> | undefined;
    await act(async () => {
      decision = await agentActionPolicy.handle(
        action(TASK_ACTIONS.update, {
          taskId: DEMO_TASK_ID,
          tenantId: DEMO_TENANT_ID,
          status: "done",
        }),
      );
    });

    expect(decision?.status).toBe("executed");
    expect(hook.result.current.detail).toMatchObject({ status: "done", version: 2 });
    expect(
      hook.result.current.tasks.find((task) => task.id === DEMO_TASK_ID),
    ).toMatchObject({ status: "done", version: 2 });
    expect(hook.result.current.ids).toEqual(["task-schema", "task-sync"]);
  });

  it("denies unauthorized, malformed, and undeclared actions without mutation", async () => {
    const denied = await agentActionPolicy.handle(
      action(TASK_ACTIONS.delete, {
        taskId: DEMO_TASK_ID,
        tenantId: DEMO_TENANT_ID,
      }),
    );
    const malformed = await agentActionPolicy.handle(
      action(TASK_ACTIONS.update, {
        taskId: DEMO_TASK_ID,
        tenantId: DEMO_TENANT_ID,
      }),
    );
    const undeclared = await agentActionPolicy.handle(
      action("system.run", { command: "ignored" }),
    );

    expect(denied).toMatchObject({ status: "denied", code: "unauthorized" });
    expect(malformed).toMatchObject({ status: "denied", code: "invalid-context" });
    expect(undeclared).toMatchObject({ status: "denied", code: "unknown-action" });
    expect(
      taskCommandStore.getState().taskBelongsToTenant(DEMO_TASK_ID, DEMO_TENANT_ID),
    ).toBe(true);
  });

  it("waits for an explicit human decision before archiving", async () => {
    const deniedPromise = agentActionPolicy.handle(
      action(TASK_ACTIONS.archive, {
        taskId: DEMO_TASK_ID,
        tenantId: DEMO_TENANT_ID,
      }),
    );
    await vi.waitFor(() => expect(approvalStore.getState().pending).not.toBeNull());
    approvalStore.getState().resolve(false);
    await expect(deniedPromise).resolves.toMatchObject({
      status: "denied",
      code: "approval-denied",
    });

    const approvedPromise = agentActionPolicy.handle(
      action(TASK_ACTIONS.archive, {
        taskId: DEMO_TASK_ID,
        tenantId: DEMO_TENANT_ID,
      }),
    );
    await vi.waitFor(() => expect(approvalStore.getState().pending).not.toBeNull());
    const pendingId = approvalStore.getState().pending?.id;
    const overlappingPromise = agentActionPolicy.handle(
      action(TASK_ACTIONS.archive, {
        taskId: DEMO_TASK_ID,
        tenantId: DEMO_TENANT_ID,
      }),
    );
    expect(approvalStore.getState().pending?.id).toBe(pendingId);
    await expect(overlappingPromise).resolves.toMatchObject({
      status: "denied",
      code: "approval-denied",
    });
    approvalStore.getState().resolve(true);
    await expect(approvedPromise).resolves.toMatchObject({ status: "executed" });

    const entries = actionAuditStore.getState().entries;
    expect(entries.map(({ code }) => code)).toEqual([
      "executed",
      "approval-denied",
      "approval-denied",
    ]);
  });
});
