/**
 * Application-owned A2UI 1.0 surface messages for the deterministic task
 * board. The golden fixtures replay these exact bytes; the interactive
 * buttons route through the Prometheus action policy, so the agent can never
 * write outside the declared action catalog.
 */
import {
  PROMETHEUS_A2UI_V1_CATALOG_ID,
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
} from "@prometheus-ags/a2ui-react";
import { DEMO_TENANT } from "../lib/demo-data";

export const TASK_BOARD_SURFACE_ID = "surface-task-sync";

export interface TaskBoardSurfaceInput {
  taskId: string;
  title: string;
  status: string;
  tenantId?: string;
}

/**
 * The `mark-done` button upserts an allowlisted field; the `delete` button
 * requests an action that is intentionally not allowlisted so the denial path
 * is visible in the rendered surface itself; the `replace` button is
 * destructive and routes through the human approval dialog.
 */
export function createTaskBoardSurfaceMessages(
  input: TaskBoardSurfaceInput,
): readonly Record<string, unknown>[] {
  const tenantId = input.tenantId ?? DEMO_TENANT;
  return [
    {
      version: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
      createSurface: {
        surfaceId: TASK_BOARD_SURFACE_ID,
        catalogId: PROMETHEUS_A2UI_V1_CATALOG_ID,
        sendDataModel: true,
      },
    },
    {
      version: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
      updateComponents: {
        surfaceId: TASK_BOARD_SURFACE_ID,
        components: [
          { id: "root", component: "Card", child: "layout" },
          {
            id: "layout",
            component: "Column",
            children: ["heading", "status", "actions"],
          },
          {
            id: "heading",
            component: "Text",
            text: { "@path": "/title" },
          },
          {
            id: "status",
            component: "Text",
            text: { "@path": "/status" },
            variant: "body",
          },
          {
            id: "actions",
            component: "Row",
            children: ["mark_done", "replace_task", "delete_task"],
          },
          {
            id: "mark_done",
            component: "Button",
            child: "mark_done_label",
            action: {
              event: {
                name: "prometheus.entity.upsert",
                context: {
                  entityType: "Task",
                  entityId: input.taskId,
                  tenantId,
                  data: { "@path": "/markDoneData" },
                },
              },
            },
          },
          {
            id: "mark_done_label",
            component: "Text",
            text: "Mark done",
            variant: "body",
          },
          {
            id: "replace_task",
            component: "Button",
            child: "replace_task_label",
            action: {
              event: {
                name: "prometheus.entity.replace",
                context: {
                  entityType: "Task",
                  entityId: input.taskId,
                  tenantId,
                  data: { "@path": "/replaceData" },
                },
              },
            },
          },
          {
            id: "replace_task_label",
            component: "Text",
            text: "Reset task (approval)",
            variant: "body",
          },
          {
            id: "delete_task",
            component: "Button",
            child: "delete_task_label",
            action: {
              event: {
                name: "prometheus.entity.remove",
                context: {
                  entityType: "Task",
                  entityId: input.taskId,
                  tenantId,
                },
              },
            },
          },
          {
            id: "delete_task_label",
            component: "Text",
            text: "Delete task",
            variant: "body",
          },
        ],
      },
    },
    {
      version: PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
      updateDataModel: {
        surfaceId: TASK_BOARD_SURFACE_ID,
        path: "/",
        value: {
          title: input.title,
          status: `Status: ${input.status}`,
          markDoneData: { status: "done" },
          replaceData: {
            id: input.taskId,
            tenantId,
            projectId: "project-atlas",
            title: input.title,
            status: "todo",
            version: 1,
          },
        },
      },
    },
  ];
}
