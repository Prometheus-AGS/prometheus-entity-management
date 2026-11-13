/**
 * Scratch fixtures for scripts/verify-a2ui-v1.mjs (UPG-1, 2, 4, 5, 6, 7, 8, 13,
 * 17). The verifier writes each one to the run's scratch fixture directory as
 * JSON and records its SHA-256; the browser spec and the headless Node lane read
 * them from there, never from this module, so the evidence names exactly the
 * bytes that were fed to the built package.
 *
 * Catalog ids are written out here; the page reports the package's own
 * constants and the spec requires them to match (a renamed constant fails the
 * run instead of silently testing another catalog).
 */

export const V1 = "1.0";
export const RC = "v1.0";
export const V091 = "v0.9.1";
export const V1_CATALOG = "urn:prometheus-ags:a2ui:catalog:a2ui-1.0";
export const V091_CATALOG = "urn:prometheus-ags:a2ui:catalog:v3";
/** A second 1.0 catalog (Text only) registered by the UPG-4 page slot. */
export const ALT_V1_CATALOG = "urn:prometheus-ags:verify:a2ui-v1:alt";

const v1 = (body) => ({ version: V1, ...body });
const rc = (body) => ({ version: RC, ...body });

function upg1() {
  const surfaceId = "upg1";
  return {
    create: [v1({ createSurface: { surfaceId, catalogId: V1_CATALOG } })],
    components: [
      v1({
        updateComponents: {
          surfaceId,
          components: [
            { id: "root", component: "Column", children: ["greeting", "name"] },
            {
              id: "greeting",
              component: "Text",
              text: { "@call": "formatString", args: { value: "Hello ${/name}" } },
            },
            { id: "name", component: "Text", variant: "caption", text: { "@path": "/name" } },
          ],
        },
      }),
    ],
    dataAda: [v1({ updateDataModel: { surfaceId, path: "/name", value: "Ada" } })],
    dataGrace: [v1({ updateDataModel: { surfaceId, path: "/name", value: "Grace" } })],
    delete: [v1({ deleteSurface: { surfaceId } })],
  };
}

function upg2() {
  const surfaceId = "upg2";
  return {
    surfaceId,
    operations: [
      v1({ createSurface: { surfaceId, catalogId: V1_CATALOG } }),
      v1({
        updateComponents: {
          surfaceId,
          components: [
            { id: "root", component: "Column", children: ["title", "status"] },
            { id: "title", component: "Text", text: "Order 1042" },
            { id: "status", component: "Text", text: { "@path": "/status" } },
          ],
        },
      }),
      v1({ updateDataModel: { surfaceId, path: "/status", value: "Ready to ship" } }),
    ],
    /** What `@ag-ui/a2ui-middleware` puts in a failed render result (recovery exhausted). */
    failedResult: { code: "a2ui_recovery_exhausted", error: "The interface could not be generated.", attempts: [] },
    /** An activity type the runtime does not handle, carrying operations it must not render. */
    unknownActivity: {
      type: "ACTIVITY_SNAPSHOT",
      messageId: "upg2-unknown-activity",
      activityType: "progress-card",
      content: {
        a2ui_operations: [
          v1({
            createSurface: {
              surfaceId: "upg2-unknown",
              catalogId: V1_CATALOG,
              components: [{ id: "root", component: "Text", text: "must not render" }],
            },
          }),
        ],
      },
      replace: true,
    },
  };
}

function upg4() {
  const surfaceId = "upg4";
  const root = { id: "root", component: "Column", children: ["alt", "plain"] };
  const button = (catalogId) => ({
    id: "btn",
    component: "Button",
    ...(catalogId === undefined ? {} : { catalogId }),
    child: "btnLabel",
    action: { event: { name: "noop" } },
  });
  const probe = (catalogId) => [
    v1({
      updateComponents: {
        surfaceId,
        components: [
          { id: "root", component: "Column", children: ["alt", "plain", "btn"] },
          button(catalogId),
          { id: "btnLabel", component: "Text", text: "Go" },
        ],
      },
    }),
  ];
  return {
    surfaceId,
    surface: [
      v1({
        createSurface: {
          surfaceId,
          catalogId: V1_CATALOG,
          components: [
            root,
            { id: "alt", component: "Text", catalogId: ALT_V1_CATALOG, text: "From the alternate 1.0 catalog" },
            { id: "plain", component: "Text", text: "From the surface catalog" },
          ],
        },
      }),
    ],
    /** A Button naming the Text-only alternate catalog: resolution by component catalogId must refuse it. */
    probeComponentCatalog: probe(ALT_V1_CATALOG),
    /** The same Button without catalogId resolves to the surface catalog and is accepted. */
    probeSurfaceCatalog: probe(undefined),
    mismatchSurfaceId: "upg4-mismatch",
    mismatch: [
      v1({
        createSurface: {
          surfaceId: "upg4-mismatch",
          catalogId: V091_CATALOG,
          components: [{ id: "root", component: "Text", text: "never rendered" }],
        },
      }),
    ],
  };
}

function upg5() {
  const surfaceId = "upg5";
  const greeting = (keys) => ({ id: "greeting", component: "Text", ...keys, text: "Hello" });
  const surface = (keys) => [
    v1({
      createSurface: {
        surfaceId,
        catalogId: V1_CATALOG,
        components: [{ id: "root", component: "Column", children: ["greeting"] }, greeting(keys)],
      },
    }),
  ];
  const accessibility = { label: "Greeting", description: "Says hello" };
  return {
    surfaceId,
    prefixed: surface({ "@catalogId": V1_CATALOG, "@accessibility": accessibility }),
    bare: surface({ catalogId: V1_CATALOG, accessibility }),
    both: surface({ catalogId: V1_CATALOG, "@catalogId": V1_CATALOG }),
  };
}

function upg6() {
  const call = (functionCallId, name) => [
    v1({
      callRendererFunction: {
        functionCallId,
        callFunction: { "@call": name, catalogId: V1_CATALOG, args: { text: "ping" } },
      },
    }),
  ];
  return {
    agentCallable: { functionCallId: "upg6-agent-callable", messages: call("upg6-agent-callable", "agentEcho") },
    rendererOnly: { functionCallId: "upg6-renderer-only", messages: call("upg6-renderer-only", "rendererOnlySecret") },
  };
}

function upg7() {
  const surfaceId = "upg7";
  const upsert = (id, label, dataPath) => [
    {
      id,
      component: "Button",
      child: `${id}Label`,
      action: {
        event: {
          name: "prometheus.entity.upsert",
          context: { entityType: "Order", entityId: "o-1", tenantId: "tenant-a", data: { "@path": dataPath } },
        },
      },
    },
    { id: `${id}Label`, component: "Text", text: label },
  ];
  return {
    surfaceId,
    surface: [
      v1({
        createSurface: {
          surfaceId,
          catalogId: V1_CATALOG,
          components: [
            { id: "root", component: "Column", children: ["total", "approve", "forbid"] },
            { id: "total", component: "Text", text: { "@path": "/total" } },
            ...upsert("approve", "Approve", "/approvePatch"),
            ...upsert("forbid", "Set total", "/forbiddenPatch"),
          ],
          dataModel: { total: "pending", approvePatch: { status: "approved" }, forbiddenPatch: { total: 999 } },
        },
      }),
    ],
    answerCall: { call: "lookupTotal", args: { orderId: "o-1" } },
    answerValue: "42.00 USD",
    answerPath: "/total",
    oversizedCall: { call: "lookupBlob", args: { orderId: "o-1" } },
    oversizedLength: 4096,
    oversizedPath: "/blob",
    lowerLimits: { maxDataModelBytes: 1024 },
  };
}

function upg8() {
  const surfaceId = "upg8";
  return {
    surfaceId,
    componentId: "gesture",
    surface: [
      v1({
        createSurface: {
          surfaceId,
          catalogId: V1_CATALOG,
          components: [
            { id: "root", component: "Column", children: ["gesture"] },
            {
              id: "gesture",
              component: "Button",
              child: "gestureLabel",
              action: { functionCall: { "@call": "gestureEffect", args: { source: "button" } } },
            },
            { id: "gestureLabel", component: "Text", text: "Run" },
          ],
        },
      }),
    ],
  };
}

function upg13() {
  return {
    v1SurfaceId: "upg13",
    v1Surface: [
      v1({
        createSurface: {
          surfaceId: "upg13",
          catalogId: V1_CATALOG,
          sendDataModel: true,
          components: [
            { id: "root", component: "Column", children: ["title", "status"] },
            { id: "title", component: "Text", text: "Shipment" },
            { id: "status", component: "Text", text: { "@path": "/status" } },
          ],
          dataModel: { status: "in transit", items: [{ sku: "A-1", qty: 2 }] },
        },
      }),
    ],
    legacySurfaceId: "upg13-legacy",
    legacyTheme: { primaryColor: "#3366ff" },
    legacySurface: [
      { version: V091, createSurface: { surfaceId: "upg13-legacy", catalogId: V091_CATALOG, theme: { primaryColor: "#3366ff" } } },
      { version: V091, updateComponents: { surfaceId: "upg13-legacy", components: [{ id: "root", component: "Text", text: "Legacy" }] } },
      { version: V091, updateDataModel: { surfaceId: "upg13-legacy", path: "/", value: { note: "kept" } } },
    ],
  };
}

function upg17() {
  const surfaceId = "upg17";
  const components = (binding, action) => [
    { id: "root", component: "Column", children: ["title", "answer", "ask"] },
    { id: "title", component: "Text", text: binding("/title") },
    { id: "answer", component: "Text", text: binding("/answer") },
    { id: "ask", component: "Button", child: "askLabel", action },
    { id: "askLabel", component: "Text", text: "Ask" },
  ];
  const dataModel = { title: "Orders", answer: "none" };
  return {
    surfaceId,
    componentId: "ask",
    responsePath: "/answer",
    callName: "refresh",
    /** RC dialect: `{ path }` bindings, a response-aware action, no catalogId (the RC default). */
    rc: [
      rc({
        createSurface: {
          surfaceId,
          components: components((path) => ({ path }), {
            event: { name: "refresh", wantResponse: true, responsePath: "/answer" },
          }),
          dataModel,
        },
      }),
    ],
    /** Its A2UI 1.0 equivalent: `@path` bindings, a plain event (1.0 has no wantResponse). */
    v1: [
      v1({
        createSurface: {
          surfaceId,
          catalogId: V1_CATALOG,
          components: components((path) => ({ "@path": path }), { event: { name: "refresh" } }),
          dataModel,
        },
      }),
    ],
    finalAnswer: "pong (agentFunctionResponse)",
    rcAnswer: "pong (RC actionResponse)",
  };
}

/** Every fixture, keyed by the file name the verifier writes it under. */
export function buildFixtures() {
  return {
    "constants.json": { V1, RC, V091, V1_CATALOG, V091_CATALOG, ALT_V1_CATALOG },
    "upg1.json": upg1(),
    "upg2.json": upg2(),
    "upg4.json": upg4(),
    "upg5.json": upg5(),
    "upg6.json": upg6(),
    "upg7.json": upg7(),
    "upg8.json": upg8(),
    "upg13.json": upg13(),
    "upg17.json": upg17(),
  };
}
