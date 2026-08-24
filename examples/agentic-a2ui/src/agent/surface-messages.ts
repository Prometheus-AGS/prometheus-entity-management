/**
 * Application-owned A2UI v0.9.1 surface messages for the deterministic task
 * board. The golden fixtures replay these exact bytes; the interactive
 * buttons route through the Prometheus action policy, so the agent can never
 * write outside the declared action catalog.
 */
import { PROMETHEUS_A2UI_CATALOG_ID } from "@prometheus-ags/a2ui-react";
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
      version: "v0.9.1",
      createSurface: {
        surfaceId: TASK_BOARD_SURFACE_ID,
        catalogId: PROMETHEUS_A2UI_CATALOG_ID,
        sendDataModel: true,
      },
    },
    {
      version: "v0.9.1",
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
            text: { path: "/title" },
            variant: "h2",
          },
          {
            id: "status",
            component: "Text",
            text: { path: "/status" },
            variant: "body",
          },
          {
            id: "actions",
            component: "Row",
            children: ["mark-done", "replace-task", "delete-task"],
          },
          {
            id: "mark-done",
            component: "Button",
            child: "mark-done-label",
            action: {
              event: {
                name: "prometheus.entity.upsert",
                context: {
                  entityType: "Task",
                  entityId: input.taskId,
                  tenantId,
                  data: { path: "/markDoneData" },
                },
              },
            },
          },
          {
            id: "mark-done-label",
            component: "Text",
            text: "Mark done",
            variant: "body",
          },
          {
            id: "replace-task",
            component: "Button",
            child: "replace-task-label",
            action: {
              event: {
                name: "prometheus.entity.replace",
                context: {
                  entityType: "Task",
                  entityId: input.taskId,
                  tenantId,
                  data: { path: "/replaceData" },
                },
              },
            },
          },
          {
            id: "replace-task-label",
            component: "Text",
            text: "Reset task (approval)",
            variant: "body",
          },
          {
            id: "delete-task",
            component: "Button",
            child: "delete-task-label",
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
            id: "delete-task-label",
            component: "Text",
            text: "Delete task",
            variant: "body",
          },
        ],
      },
    },
    {
      version: "v0.9.1",
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
