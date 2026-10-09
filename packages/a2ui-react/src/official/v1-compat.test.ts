import {
  A2uiMessageListSchema,
  MessageProcessor,
} from "@a2ui/web_core/v0_9";
import { describe, expect, it } from "vitest";
import {
  PROMETHEUS_A2UI_CATALOG_ID,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  createPrometheusA2uiCatalog,
} from "./catalog.js";
import type { PrometheusA2uiComponentImplementation } from "./types.js";
import {
  PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  normalizeA2uiV1Message,
} from "./v1-compat.js";

const noCatalogs = new Map<string, string>();

const rcSurface = {
  version: PROMETHEUS_A2UI_RC_PROTOCOL_VERSION,
  createSurface: {
    surfaceId: "rc",
    catalogId: PROMETHEUS_A2UI_CATALOG_ID,
    sendDataModel: true,
    components: [
      { id: "root", component: "Column", children: ["title", "confirm"] },
      { id: "title", component: "Text", text: { path: "/title" } },
      {
        id: "confirm",
        component: "Button",
        child: "confirm-label",
        action: {
          event: {
            name: "test.confirm",
            context: { value: "approved" },
            wantResponse: true,
            responsePath: "/result",
          },
        },
      },
      { id: "confirm-label", component: "Text", text: "Confirm" },
    ],
    dataModel: { title: "RC", result: "pending" },
  },
} as const;

describe("A2UI v1.0 RC bridge over official @a2ui/web_core 0.12.0", () => {
  it("decomposes createSurface into v0.9.1 messages the official schema accepts", () => {
    const normalized = normalizeA2uiV1Message(rcSurface, PROMETHEUS_A2UI_CATALOG_ID, noCatalogs);

    expect(normalized.renderMessages.map((message) => Object.keys(message)[1])).toEqual([
      "createSurface",
      "updateComponents",
      "updateDataModel",
    ]);
    for (const message of normalized.renderMessages) {
      expect(message.version).toBe(PROMETHEUS_A2UI_PROTOCOL_VERSION);
    }
    expect(A2uiMessageListSchema.safeParse(normalized.renderMessages).success).toBe(true);
    expect(normalized.renderMessages[0]).toEqual({
      version: "v0.9.1",
      createSurface: { surfaceId: "rc", catalogId: PROMETHEUS_A2UI_CATALOG_ID, sendDataModel: true },
    });
    expect(normalized.renderMessages[2]).toEqual({
      version: "v0.9.1",
      updateDataModel: { surfaceId: "rc", path: "/", value: { title: "RC", result: "pending" } },
    });
  });

  it("strips v1.0-only action fields and reports them as metadata", () => {
    const normalized = normalizeA2uiV1Message(rcSurface, PROMETHEUS_A2UI_CATALOG_ID, noCatalogs);
    const update = normalized.renderMessages[1] as {
      updateComponents: { components: Array<Record<string, unknown>> };
    };
    const button = update.updateComponents.components.find((c) => c.id === "confirm");

    expect(button?.action).toEqual({
      event: { name: "test.confirm", context: { value: "approved" } },
    });
    expect(normalized.actions).toEqual([
      { surfaceId: "rc", sourceComponentId: "confirm", wantResponse: true, responsePath: "/result" },
    ]);
    expect(rcSurface.createSurface.components[2].action.event.wantResponse).toBe(true);
  });

  it("is accepted by the official 0.12.0 MessageProcessor with the Prometheus catalog", () => {
    const processor = new MessageProcessor<PrometheusA2uiComponentImplementation>(
      [createPrometheusA2uiCatalog()],
      async () => undefined,
    );
    const normalized = normalizeA2uiV1Message(rcSurface, PROMETHEUS_A2UI_CATALOG_ID, noCatalogs);

    expect(() => processor.processMessages(normalized.renderMessages)).not.toThrow();
    const surface = processor.model.getSurface("rc");
    expect(surface?.defaultCatalog.id).toBe(PROMETHEUS_A2UI_CATALOG_ID);
    expect(surface?.componentsModel.get("confirm")?.type).toBe("Button");
    expect(surface?.dataModel.get("/title")).toBe("RC");
    processor.model.dispose();
  });

  it("maps updateComponents, updateDataModel and deleteSurface one-to-one", () => {
    const catalogs = new Map([["rc", "urn:custom"]]);
    const update = normalizeA2uiV1Message(
      {
        version: "v1.0",
        updateComponents: {
          surfaceId: "rc",
          components: [{ id: "title", component: "Text", text: "x", catalogId: "urn:custom" }],
        },
      },
      PROMETHEUS_A2UI_CATALOG_ID,
      catalogs,
    );
    const data = normalizeA2uiV1Message(
      { version: "v1.0", updateDataModel: { surfaceId: "rc", value: { a: 1 } } },
      PROMETHEUS_A2UI_CATALOG_ID,
      noCatalogs,
    );
    const remove = normalizeA2uiV1Message(
      { version: "v1.0", deleteSurface: { surfaceId: "rc" } },
      PROMETHEUS_A2UI_CATALOG_ID,
      noCatalogs,
    );
    const rendered = [...update.renderMessages, ...data.renderMessages, ...remove.renderMessages];

    expect(rendered).toEqual([
      {
        version: "v0.9.1",
        updateComponents: { surfaceId: "rc", components: [{ id: "title", component: "Text", text: "x" }] },
      },
      { version: "v0.9.1", updateDataModel: { surfaceId: "rc", value: { a: 1 }, path: "/" } },
      { version: "v0.9.1", deleteSurface: { surfaceId: "rc" } },
    ]);
    expect(A2uiMessageListSchema.safeParse(rendered).success).toBe(true);
  });

  it("passes function calls and action responses through without render messages", () => {
    const call = {
      version: "v1.0",
      functionCallId: "f-1",
      callFunction: { call: "lookup", args: { id: 1 } },
    } as const;
    const response = { version: "v1.0", actionId: "a-1", actionResponse: { value: 2 } } as const;

    expect(normalizeA2uiV1Message(call, PROMETHEUS_A2UI_CATALOG_ID, noCatalogs)).toEqual({
      renderMessages: [],
      protocolMessage: call,
      actions: [],
    });
    expect(normalizeA2uiV1Message(response, PROMETHEUS_A2UI_CATALOG_ID, noCatalogs)).toEqual({
      renderMessages: [],
      protocolMessage: response,
      actions: [],
    });
  });

  it("rejects foreign catalogs, other versions and unknown fields", () => {
    expect(() =>
      normalizeA2uiV1Message(
        {
          version: "v1.0",
          updateComponents: {
            surfaceId: "rc",
            components: [{ id: "t", component: "Text", catalogId: "urn:other" }],
          },
        },
        PROMETHEUS_A2UI_CATALOG_ID,
        noCatalogs,
      ),
    ).toThrowError("requests unsupported catalog urn:other");
    expect(() =>
      normalizeA2uiV1Message(
        { version: "v0.9.1", deleteSurface: { surfaceId: "rc" } },
        PROMETHEUS_A2UI_CATALOG_ID,
        noCatalogs,
      ),
    ).toThrow();
    expect(() =>
      normalizeA2uiV1Message(
        { version: "v1.0", deleteSurface: { surfaceId: "rc", extra: true } },
        PROMETHEUS_A2UI_CATALOG_ID,
        noCatalogs,
      ),
    ).toThrow();
  });
});
