import {
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  type PrometheusA2UIMessage,
} from "@prometheus-ags/entity-graph-a2a";
import {
  DEMO_SURFACE_ID,
  DEMO_TASK_ID,
  DEMO_TENANT_ID,
} from "./types";

const VERSION = PROMETHEUS_A2UI_PROTOCOL_VERSION;

export function createTaskReviewSurface(): readonly PrometheusA2UIMessage[] {
  return [
    {
      version: VERSION,
      createSurface: {
        surfaceId: DEMO_SURFACE_ID,
        catalogId: PROMETHEUS_A2UI_CATALOG_ID,
        sendDataModel: true,
      },
    },
    {
      version: VERSION,
      updateComponents: {
        surfaceId: DEMO_SURFACE_ID,
        components: [
          { id: "root", component: "Card", child: "content" },
          {
            id: "content",
            component: "Column",
            children: [
              "eyebrow",
              "heading",
              "summary",
              "update-button",
              "update-label",
              "archive-button",
              "archive-label",
              "delete-button",
              "delete-label",
              "invalid-button",
              "invalid-label",
              "unknown-button",
              "unknown-label",
            ],
          },
          { id: "eyebrow", component: "Text", text: "AGENT RECOMMENDATION", variant: "caption" },
          { id: "heading", component: "Text", text: { path: "/heading" }, variant: "h2" },
          { id: "summary", component: "Text", text: { path: "/summary" }, variant: "body" },
          {
            id: "update-button",
            component: "Button",
            child: "update-label",
            action: {
              event: {
                name: "task.update",
                context: {
                  taskId: DEMO_TASK_ID,
                  tenantId: DEMO_TENANT_ID,
                  status: "done",
                },
              },
            },
          },
          { id: "update-label", component: "Text", text: "Mark task done" },
          {
            id: "archive-button",
            component: "Button",
            child: "archive-label",
            action: {
              event: {
                name: "task.archive",
                context: {
                  taskId: DEMO_TASK_ID,
                  tenantId: DEMO_TENANT_ID,
                },
              },
            },
          },
          { id: "archive-label", component: "Text", text: "Archive with approval" },
          {
            id: "delete-button",
            component: "Button",
            child: "delete-label",
            action: {
              event: {
                name: "task.delete",
                context: {
                  taskId: DEMO_TASK_ID,
                  tenantId: DEMO_TENANT_ID,
                },
              },
            },
          },
          { id: "delete-label", component: "Text", text: "Attempt denied delete" },
          {
            id: "invalid-button",
            component: "Button",
            child: "invalid-label",
            action: {
              event: {
                name: "task.update",
                context: {
                  taskId: DEMO_TASK_ID,
                  tenantId: DEMO_TENANT_ID,
                },
              },
            },
          },
          { id: "invalid-label", component: "Text", text: "Send invalid update" },
          {
            id: "unknown-button",
            component: "Button",
            child: "unknown-label",
            action: {
              event: {
                name: "system.run",
                context: { command: "ignored" },
              },
            },
          },
          { id: "unknown-label", component: "Text", text: "Attempt undeclared action" },
        ],
      },
    },
    {
      version: VERSION,
      updateDataModel: {
        surfaceId: DEMO_SURFACE_ID,
        path: "/",
        value: {
          heading: "Review: Prove offline convergence",
          summary:
            "This official A2UI surface can update the canonical task, request human approval, and prove that denied or malformed actions do not mutate the graph.",
        },
      },
    },
  ];
}

export function createMalformedSurface(): readonly PrometheusA2UIMessage[] {
  return [
    {
      version: VERSION,
      createSurface: {
        surfaceId: "surface-malformed",
        catalogId: PROMETHEUS_A2UI_CATALOG_ID,
      },
    },
    {
      version: VERSION,
      updateComponents: {
        surfaceId: "surface-malformed",
        components: [
          { id: "root", component: "UntrustedShellCommand", command: "ignored" },
        ],
      },
    },
  ];
}
