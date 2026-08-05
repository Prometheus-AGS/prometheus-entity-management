import {
  createA2uiActionPolicy,
  type A2uiActionPolicy,
} from "@prometheus-ags/a2ui-react";
import { z } from "zod";
import { taskCommandStore } from "../tasks/task-command-store";
import { actionAuditStore } from "./action-audit-store";
import { approvalStore } from "./approval-store";

export const TASK_ACTIONS = {
  update: "task.update",
  archive: "task.archive",
  delete: "task.delete",
} as const;

const taskIdentitySchema = z
  .object({
    taskId: z.string().min(1),
    tenantId: z.string().min(1),
  })
  .strict();

const taskUpdateSchema = taskIdentitySchema
  .extend({
    status: z.enum(["todo", "in-progress", "done"]),
  })
  .strict();

function taskIsInAuthorizedTenant(taskId: string, tenantId: string): boolean {
  return taskCommandStore.getState().taskBelongsToTenant(taskId, tenantId);
}

export const agentActionPolicy: A2uiActionPolicy = createA2uiActionPolicy({
  rules: [
    {
      name: TASK_ACTIONS.update,
      contextSchema: taskUpdateSchema,
      authorize: (_action, context) =>
        taskIsInAuthorizedTenant(String(context.taskId), String(context.tenantId)),
      execute: (_action, context) =>
        taskCommandStore
          .getState()
          .updateStatus(String(context.taskId), String(context.status)),
    },
    {
      name: TASK_ACTIONS.archive,
      contextSchema: taskIdentitySchema,
      destructive: true,
      authorize: (_action, context) =>
        taskIsInAuthorizedTenant(String(context.taskId), String(context.tenantId)),
      execute: (_action, context) =>
        taskCommandStore.getState().updateStatus(String(context.taskId), "archived"),
    },
    {
      name: TASK_ACTIONS.delete,
      contextSchema: taskIdentitySchema,
      authorize: () => ({
        allowed: false,
        reason: "The demo member role cannot delete shared-domain tasks.",
      }),
      execute: () => undefined,
    },
  ],
  requestApproval: (request) => approvalStore.getState().request(request),
  onDecision: (decision) => actionAuditStore.getState().record(decision),
});
