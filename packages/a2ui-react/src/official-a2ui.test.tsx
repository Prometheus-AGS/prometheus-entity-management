import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import { z } from "zod";
import {
  DEFAULT_PROMETHEUS_A2UI_FUNCTIONS,
  ENTITY_GRAPH_A2UI_ACTIONS,
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  PrometheusA2uiError,
  PrometheusA2uiProvider,
  PrometheusA2uiSurface,
  PrometheusA2uiSurfaces,
  createA2uiActionPolicy,
  createEntityGraphA2uiActionPolicy,
  createPrometheusA2uiCatalog,
  createPrometheusA2uiRuntime,
  usePrometheusA2ui,
  usePrometheusA2uiRuntime,
} from "./index.js";

afterEach(() => cleanup());

const action = (
  name: string,
  context: Record<string, unknown>,
) => ({
  name,
  context,
  surfaceId: "main",
  sourceComponentId: "action-button",
  timestamp: "2026-08-01T19:00:00.000Z",
});

const messages = [
  {
    version: "v0.9.1",
    createSurface: {
      surfaceId: "main",
      catalogId: PROMETHEUS_A2UI_CATALOG_ID,
      sendDataModel: true,
    },
  },
  {
    version: "v0.9.1",
    updateComponents: {
      surfaceId: "main",
      components: [
        { id: "root", component: "Column", children: ["heading", "body"] },
        { id: "heading", component: "Text", text: { path: "/heading" }, variant: "h2" },
        { id: "body", component: "Text", text: { path: "/body" }, variant: "body" },
      ],
    },
  },
  {
    version: "v0.9.1",
    updateDataModel: {
      surfaceId: "main",
      path: "/",
      value: { heading: "Official surface", body: "Versioned data model" },
    },
  },
] as const;

describe("official A2UI v0.9.1 runtime", () => {
  it("creates an official v0.9.1 surface and catalog-backed surface", () => {
    const runtime = createPrometheusA2uiRuntime();
    runtime.processMessages(messages);

    const surface = runtime.getSurface("main");
    expect(runtime.processor.version).toBe("v0.9.1");
    expect(surface?.catalog.id).toBe(PROMETHEUS_A2UI_CATALOG_ID);
    expect(surface?.dataModel.get("/heading")).toBe("Official surface");
    expect(runtime.getClientCapabilities()).toEqual({
      "v0.9.1": { supportedCatalogIds: [PROMETHEUS_A2UI_CATALOG_ID] },
    });
    expect(runtime.getClientDataModel()).toEqual({
      version: "v0.9.1",
      surfaces: { main: { heading: "Official surface", body: "Versioned data model" } },
    });
    runtime.dispose();
  });

  it("renders official component and data-model updates through A2uiSurface", async () => {
    const runtime = createPrometheusA2uiRuntime();
    runtime.processMessages(messages);

    render(
      <PrometheusA2uiProvider runtime={runtime}>
        <PrometheusA2uiSurface surfaceId="main" fallback="Waiting" />
      </PrometheusA2uiProvider>,
    );

    expect(screen.getByText("Official surface")).toBeTruthy();
    expect(screen.getByText("Versioned data model")).toBeTruthy();

    act(() => {
      runtime.processMessages([
        {
          version: "v0.9.1",
          updateDataModel: {
            surfaceId: "main",
            path: "/body",
            value: "Reactive official update",
          },
        },
      ]);
    });

    await waitFor(() => expect(screen.getByText("Reactive official update")).toBeTruthy());
    expect(messages[2].updateDataModel.value.body).toBe("Versioned data model");
    runtime.dispose();
  });

  it("renders collection empty state and all official surfaces", () => {
    const runtime = createPrometheusA2uiRuntime();
    const view = render(
      <PrometheusA2uiProvider runtime={runtime}>
        <PrometheusA2uiSurfaces empty={<p>No surfaces</p>} />
      </PrometheusA2uiProvider>,
    );
    expect(screen.getByText("No surfaces")).toBeTruthy();

    act(() => runtime.processMessages(messages));
    expect(view.container.querySelector('[data-prometheus-a2ui-surface="main"]')).toBeTruthy();
    runtime.dispose();
  });

  it("emits a hydration-safe server fallback before the official client renderer", () => {
    const runtime = createPrometheusA2uiRuntime();
    runtime.processMessages(messages);
    const html = renderToStaticMarkup(
      <PrometheusA2uiProvider runtime={runtime}>
        <PrometheusA2uiSurface surfaceId="main" fallback={<p>Hydrating surface</p>} />
      </PrometheusA2uiProvider>,
    );
    expect(html).toContain('data-prometheus-a2ui-surface="main"');
    expect(html).toContain('data-prometheus-a2ui-client-ready="false"');
    expect(html).toContain("Hydrating surface");
    runtime.dispose();
  });

  it("rejects unsupported protocol versions and unknown components", () => {
    const runtime = createPrometheusA2uiRuntime();
    runtime.processMessages([messages[0]]);

    expect(() => runtime.processMessages([
      { version: "v0.9", deleteSurface: { surfaceId: "main" } },
    ])).toThrowError(expect.objectContaining({ code: "unsupported-protocol-version" }));
    expect(() => runtime.processMessages([
      { version: "v2.0", deleteSurface: { surfaceId: "main" } },
    ])).toThrowError(expect.objectContaining({ code: "invalid-message" }));
    expect(() => runtime.processMessages([
      {
        version: "v0.9.1",
        updateComponents: {
          surfaceId: "main",
          components: [{ id: "unsafe", component: "UnsafeWidget" }],
        },
      },
    ])).toThrowError(expect.objectContaining({ code: "component-not-allowed" }));
    runtime.dispose();
  });

  it("rejects an invalid batch without partially updating an existing surface", () => {
    const runtime = createPrometheusA2uiRuntime();
    runtime.processMessages(messages);

    expect(() =>
      runtime.processMessages([
        {
          version: "v0.9.1",
          updateDataModel: {
            surfaceId: "main",
            path: "/body",
            value: "Must not commit",
          },
        },
        {
          version: "v0.9.1",
          updateComponents: {
            surfaceId: "main",
            components: [{ id: "unsafe", component: "UnsafeWidget" }],
          },
        },
      ]),
    ).toThrowError(expect.objectContaining({ code: "component-not-allowed" }));

    expect(runtime.getSurface("main")?.dataModel.get("/body")).toBe(
      "Versioned data model",
    );
    expect(runtime.getSurface("main")?.componentsModel.get("unsafe")).toBeUndefined();
    runtime.dispose();
  });

  it("rejects malformed messages and disposed runtime usage", () => {
    const runtime = createPrometheusA2uiRuntime();
    expect(() => runtime.processMessages([{ version: "v0.9.1" }])).toThrowError(
      expect.objectContaining({ code: "invalid-message" }),
    );
    runtime.dispose();
    expect(() => runtime.getSurface("main")).toThrowError(
      expect.objectContaining({ code: "runtime-disposed" }),
    );
    expect(new PrometheusA2uiError("invalid-message", "bad").name).toBe(
      "PrometheusA2uiError",
    );
  });

  it("excludes openUrl from the default catalog", () => {
    const catalog = createPrometheusA2uiCatalog();
    expect(DEFAULT_PROMETHEUS_A2UI_FUNCTIONS).not.toContain("openUrl");
    expect(catalog.functions.has("openUrl")).toBe(false);
    expect(createPrometheusA2uiCatalog({ functions: ["openUrl"] }).functions.has("openUrl")).toBe(true);
  });
});

describe("A2UI v1.0 RC and AG-UI 0.0.59 compatibility", () => {
  const v1Surface = {
    version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
    createSurface: {
      surfaceId: "rc-main",
      catalogId: PROMETHEUS_A2UI_CATALOG_ID,
      components: [
        { id: "root", component: "Column", children: ["heading", "action-button"] },
        { id: "heading", component: "Text", text: { path: "/heading" } },
        {
          id: "action-button",
          component: "Button",
          child: "action-label",
          action: {
            event: {
              name: "test.confirm",
              context: { value: "approved" },
              wantResponse: true,
              responsePath: "/result",
            },
          },
        },
        { id: "action-label", component: "Text", text: "Confirm" },
      ],
      dataModel: { heading: "RC surface", result: "pending" },
    },
  } as const;

  it("renders a v1.0 RC single-message surface through the official renderer", () => {
    const runtime = createPrometheusA2uiRuntime();
    runtime.processMessages([v1Surface]);

    expect(runtime.getSurface("rc-main")?.dataModel.get("/heading")).toBe("RC surface");
    expect(runtime.getSurface("rc-main")?.componentsModel.get("heading")?.type).toBe("Text");
    runtime.dispose();
  });

  it("round-trips response-aware v1.0 actions into the surface data model", async () => {
    const rendererMessages: unknown[] = [];
    const runtime = createPrometheusA2uiRuntime({
      actionPolicy: createA2uiActionPolicy({
        rules: [{
          name: "test.confirm",
          contextSchema: z.object({ value: z.string() }),
          authorize: () => true,
          execute: () => "confirmed",
        }],
      }),
      onRendererMessage: (message) => rendererMessages.push(message),
    });
    runtime.processMessages([v1Surface]);
    await runtime.getSurface("rc-main")!.dispatchAction(
      { event: { name: "test.confirm", context: { value: "approved" } } },
      "action-button",
    );

    expect(rendererMessages).toHaveLength(1);
    const emitted = rendererMessages[0] as {
      action: { actionId: string; wantResponse: boolean };
    };
    expect(emitted.action.wantResponse).toBe(true);
    runtime.processMessages([{
      version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
      actionId: emitted.action.actionId,
      actionResponse: { value: "complete" },
    }]);
    expect(runtime.getSurface("rc-main")?.dataModel.get("/result")).toBe("complete");
    runtime.dispose();
  });

  it("routes v1.0 function calls to application authority and emits a response", async () => {
    const rendererMessages: unknown[] = [];
    const runtime = createPrometheusA2uiRuntime({
      onFunctionCall: (message) => ({ echoed: message.callFunction.args?.value }),
      onRendererMessage: (message) => rendererMessages.push(message),
    });
    runtime.processMessages([{
      version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
      functionCallId: "function-1",
      callFunction: { call: "app.echo", args: { value: "hello" } },
    }]);

    await vi.waitFor(() => expect(rendererMessages).toEqual([{
      version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
      functionResponse: {
        functionCallId: "function-1",
        call: "app.echo",
        value: { echoed: "hello" },
      },
    }]));
    runtime.dispose();
  });

  it("consumes AG-UI A2UI activity snapshots and honors replacement", () => {
    const runtime = createPrometheusA2uiRuntime();
    expect(runtime.processAgUiEvent({ type: "TEXT_MESSAGE_CONTENT", content: "ignored" })).toBe(false);
    expect(runtime.processAgUiEvent({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "a2ui-surface",
      messageId: "activity-1",
      replace: true,
      content: {
        a2ui_operations: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: "ag-ui-main",
              catalogId: PROMETHEUS_A2UI_CATALOG_ID,
            },
          },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: "ag-ui-main",
              components: [{ id: "root", component: "Text", text: "First" }],
            },
          },
        ],
      },
    })).toBe(true);
    expect(runtime.getSurface("ag-ui-main")?.componentsModel.get("root")?.properties.text).toBe("First");

    runtime.processAgUiEvent({
      type: "ACTIVITY_SNAPSHOT",
      activityType: "a2ui-surface",
      messageId: "activity-1",
      replace: true,
      content: {
        a2ui_operations: [
          {
            version: "v0.9",
            createSurface: {
              surfaceId: "ag-ui-replacement",
              catalogId: PROMETHEUS_A2UI_CATALOG_ID,
            },
          },
          {
            version: "v0.9",
            updateComponents: {
              surfaceId: "ag-ui-replacement",
              components: [{ id: "root", component: "Text", text: "Replacement" }],
            },
          },
        ],
      },
    });
    expect(runtime.getSurface("ag-ui-main")).toBeUndefined();
    expect(runtime.getSurface("ag-ui-replacement")).toBeDefined();
    runtime.dispose();
  });
});

describe("application-owned A2UI entity graph policy", () => {
  const policyFor = (overrides: {
    authorize?: (context: { tenantId?: string }) => boolean;
    requestApproval?: () => boolean;
  } = {}) => {
    const store = createGraphStore();
    const policy = createEntityGraphA2uiActionPolicy({
      graphStore: store,
      entities: {
        Order: {
          actions: [
            ENTITY_GRAPH_A2UI_ACTIONS.upsert,
            ENTITY_GRAPH_A2UI_ACTIONS.patch,
            ENTITY_GRAPH_A2UI_ACTIONS.replace,
            ENTITY_GRAPH_A2UI_ACTIONS.remove,
          ],
          fields: ["status", "total"],
        },
      },
      authorize: (context) =>
        overrides.authorize?.(context) ?? context.tenantId === "tenant-a",
      requestApproval: overrides.requestApproval
        ? () => overrides.requestApproval!()
        : undefined,
    });
    return { store, policy };
  };

  it("executes an allowlisted tenant graph action", async () => {
    const { store, policy } = policyFor();
    const decision = await policy.handle(action(ENTITY_GRAPH_A2UI_ACTIONS.upsert, {
      entityType: "Order",
      entityId: "order-1",
      tenantId: "tenant-a",
      data: { status: "approved", total: 42 },
    }));

    expect(decision.status).toBe("executed");
    expect(store.getState().readEntity("Order", "order-1")).toEqual({
      status: "approved",
      total: 42,
    });
  });

  it("denies unknown actions, tenants, entity types, and fields", async () => {
    const { policy } = policyFor();
    const decisions = await Promise.all([
      policy.handle(action("prometheus.entity.unknown", {})),
      policy.handle(action(ENTITY_GRAPH_A2UI_ACTIONS.upsert, {
        entityType: "Order", entityId: "o1", tenantId: "tenant-b", data: { status: "no" },
      })),
      policy.handle(action(ENTITY_GRAPH_A2UI_ACTIONS.upsert, {
        entityType: "Secret", entityId: "s1", tenantId: "tenant-a", data: { status: "no" },
      })),
      policy.handle(action(ENTITY_GRAPH_A2UI_ACTIONS.upsert, {
        entityType: "Order", entityId: "o2", tenantId: "tenant-a", data: { secret: "no" },
      })),
    ]);

    expect(decisions.map((decision) =>
      decision.status === "denied" ? decision.code : "executed",
    )).toEqual(["unknown-action", "unauthorized", "unauthorized", "unauthorized"]);
  });

  it("requires out-of-band approval for destructive actions", async () => {
    const withoutApproval = policyFor();
    withoutApproval.store.getState().upsertEntity("Order", "order-1", { status: "open" });
    const required = await withoutApproval.policy.handle(
      action(ENTITY_GRAPH_A2UI_ACTIONS.remove, {
        entityType: "Order", entityId: "order-1", tenantId: "tenant-a",
      }),
    );
    expect(required).toMatchObject({ status: "denied", code: "approval-required" });
    expect(withoutApproval.store.getState().readEntity("Order", "order-1")).not.toBeNull();

    const deniedPolicy = policyFor({ requestApproval: () => false });
    deniedPolicy.store.getState().upsertEntity("Order", "order-2", { status: "open" });
    const denied = await deniedPolicy.policy.handle(
      action(ENTITY_GRAPH_A2UI_ACTIONS.remove, {
        entityType: "Order", entityId: "order-2", tenantId: "tenant-a",
      }),
    );
    expect(denied).toMatchObject({ status: "denied", code: "approval-denied" });

    const approvedPolicy = policyFor({ requestApproval: () => true });
    approvedPolicy.store.getState().upsertEntity("Order", "order-3", { status: "open" });
    const approved = await approvedPolicy.policy.handle(
      action(ENTITY_GRAPH_A2UI_ACTIONS.remove, {
        entityType: "Order", entityId: "order-3", tenantId: "tenant-a",
      }),
    );
    expect(approved.status).toBe("executed");
    expect(approvedPolicy.store.getState().readEntity("Order", "order-3")).toBeNull();
  });

  it("dispatches an official rendered button action through policy", async () => {
    const { store, policy } = policyFor();
    const runtime = createPrometheusA2uiRuntime({ actionPolicy: policy });
    runtime.processMessages([
      {
        version: "v0.9.1",
        createSurface: { surfaceId: "main", catalogId: PROMETHEUS_A2UI_CATALOG_ID },
      },
      {
        version: "v0.9.1",
        updateComponents: {
          surfaceId: "main",
          components: [
            { id: "root", component: "Column", children: ["action-button", "button-label"] },
            {
              id: "action-button",
              component: "Button",
              child: "button-label",
              action: {
                event: {
                  name: ENTITY_GRAPH_A2UI_ACTIONS.upsert,
                  context: {
                    entityType: "Order",
                    entityId: "order-rendered",
                    tenantId: "tenant-a",
                    data: { status: "rendered" },
                  },
                },
              },
            },
            { id: "button-label", component: "Text", text: "Save official order" },
          ],
        },
      },
    ]);

    render(
      <PrometheusA2uiProvider runtime={runtime}>
        <PrometheusA2uiSurface surfaceId="main" />
      </PrometheusA2uiProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Save official order" }));

    await waitFor(() => {
      expect(store.getState().readEntity("Order", "order-rendered")).toEqual({
        status: "rendered",
      });
    });
    runtime.dispose();
  });
});

describe("React orchestration boundary", () => {
  it("exposes official message processing through the hook", () => {
    const runtime = createPrometheusA2uiRuntime();
    function Harness() {
      const a2ui = usePrometheusA2ui();
      return (
        <button onClick={() => a2ui.processMessages([messages[0]])}>
          {a2ui.surfaces.length}
        </button>
      );
    }
    render(
      <PrometheusA2uiProvider runtime={runtime}>
        <Harness />
      </PrometheusA2uiProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    expect(screen.getByRole("button", { name: "1" })).toBeTruthy();
    runtime.dispose();
  });

  it("rejects hooks outside the provider", () => {
    function Invalid() {
      usePrometheusA2uiRuntime();
      return null;
    }
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => render(<Invalid />)).toThrow(/PrometheusA2uiProvider/);
    consoleError.mockRestore();
  });
});
