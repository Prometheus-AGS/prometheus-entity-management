// UPG-9 scenario, copied into the packed consumer by
// scripts/verify-a2a-conformance.mjs and run there, so every import below
// resolves to a packed tarball (or the registry @a2a-js/sdk 1.3.0).
//
// The reference agent (the packed DeterministicEntityGraphExecutor behind
// createA2AServer) listens on a scratch port; the official @a2a-js/sdk client
// talks to it over HTTP JSON-RPC; the packed @prometheus-ags/a2ui-react
// headless runtime builds the surface from the A2UI parts received.
//
// The last stdout line is `A2UI_EXTENSION_RESULT <json>`; any failed
// assertion exits non-zero.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { Readable } from "node:stream";

import { HTTP_EXTENSION_HEADER, SendMessageRequest, TaskState } from "@a2a-js/sdk";
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  ServiceParameters,
  withA2AExtensions,
} from "@a2a-js/sdk/client";
import * as a2a from "@prometheus-ags/entity-graph-a2a";
import { createPrometheusA2uiHeadlessRuntime } from "@prometheus-ags/a2ui-react/headless";

// Oracle values from the official A2UI A2A extension v1.0, not read from the
// package under test.
const OFFICIAL_EXTENSION_URI = "https://a2ui.org/a2a-extension/a2ui/v1.0";
const OFFICIAL_MEDIA_TYPE = "application/a2ui+json";
const CAPABILITIES_KEY = "a2uiRendererCapabilities";
const A2UI_VERSION = "1.0";
const ALLOWED_ACTION = "acknowledge";
const REFUSED_ACTION = "deleteEverything";
const RESULT_MARKER = "A2UI_EXTENSION_RESULT ";

assert.equal(a2a.PROMETHEUS_A2UI_EXTENSION_URI, OFFICIAL_EXTENSION_URI);
assert.equal(a2a.PROMETHEUS_A2UI_MEDIA_TYPE, OFFICIAL_MEDIA_TYPE);
assert.equal(a2a.A2UI_RENDERER_CAPABILITIES_KEY, CAPABILITIES_KEY);
assert.equal(a2a.PROMETHEUS_A2UI_PROTOCOL_VERSION, A2UI_VERSION);

const inboundLog = [];
const a2uiInbound = {
  authorize(message, context) {
    const name = message.action?.name ?? null;
    inboundLog.push({ step: "authorize", name, caller: context.caller.id });
    return name === ALLOWED_ACTION;
  },
  handle(message) {
    const { action } = message;
    inboundLog.push({ step: "handle", name: action?.name ?? null });
    return [
      {
        version: A2UI_VERSION,
        updateDataModel: {
          surfaceId: action.surfaceId,
          path: "/body",
          value: `Acknowledged ${action.name}`,
        },
      },
    ];
  },
};

let a2aServer;
const httpServer = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    for await (const chunk of incoming) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const headers = new Headers();
    for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
      headers.append(incoming.rawHeaders[index], incoming.rawHeaders[index + 1]);
    }
    const { port } = httpServer.address();
    const response = await a2aServer.fetch(new Request(`http://127.0.0.1:${port}${incoming.url ?? "/"}`, {
      method: incoming.method,
      headers,
      ...(body.length > 0 ? { body, duplex: "half" } : {}),
    }));
    outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()));
    if (!response.body) {
      outgoing.end();
      return;
    }
    Readable.fromWeb(response.body).pipe(outgoing);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
    outgoing.writeHead(500, { "content-type": "application/json" });
    outgoing.end(JSON.stringify({ error: "reference-agent-failure" }));
  }
});
await new Promise((resolveListen, rejectListen) => {
  httpServer.once("error", rejectListen);
  httpServer.listen(0, "127.0.0.1", resolveListen);
});
const origin = `http://127.0.0.1:${httpServer.address().port}`;
a2aServer = a2a.createA2AServer({
  card: a2a.buildAgentCard({ url: `${origin}/a2a` }),
  deterministicExecutor: { a2uiInbound },
});

const runtime = createPrometheusA2uiHeadlessRuntime();
const exchanges = [];
const recordingFetch = async (input, init) => {
  const request = new Request(input, init);
  const response = await fetch(request);
  exchanges.push({
    method: request.method,
    path: new URL(request.url).pathname,
    requestedExtensions: request.headers.get(HTTP_EXTENSION_HEADER),
    activatedExtensions: response.headers.get(HTTP_EXTENSION_HEADER),
    status: response.status,
  });
  return response;
};

try {
  const client = await new ClientFactory({
    transports: [new JsonRpcTransportFactory({ fetchImpl: recordingFetch })],
    preferredTransports: ["JSONRPC"],
    cardResolver: new DefaultAgentCardResolver({ fetchImpl: recordingFetch }),
  }).createFromUrl(origin);
  const card = await client.getAgentCard();
  const advertised = card.capabilities?.extensions?.find(({ uri }) => uri === OFFICIAL_EXTENSION_URI);
  assert.ok(advertised, "the agent card must advertise the official A2UI extension");

  // The renderer's own version-keyed capabilities, offered per turn.
  const capabilities = JSON.parse(JSON.stringify(runtime.getClientCapabilities()));
  assert.ok(
    capabilities[A2UI_VERSION]?.supportedCatalogIds?.includes(a2a.PROMETHEUS_A2UI_CATALOG_ID),
    `the headless runtime must offer the agent's catalog ${a2a.PROMETHEUS_A2UI_CATALOG_ID} for A2UI 1.0`,
  );

  let sequence = 0;
  const send = async ({ parts, offerA2ui }) => {
    sequence += 1;
    const before = exchanges.length;
    const result = await client.sendMessage(
      SendMessageRequest.fromJSON({
        message: {
          role: "ROLE_USER",
          messageId: `a2ui-conformance-${sequence}`,
          parts,
          ...(offerA2ui ? { metadata: { [CAPABILITIES_KEY]: capabilities } } : {}),
        },
      }),
      { serviceParameters: ServiceParameters.create(withA2AExtensions(OFFICIAL_EXTENSION_URI)) },
    );
    assert.ok(result && "status" in result && "artifacts" in result, "a blocking send must return a Task");
    const exchange = exchanges.slice(before).filter(({ method }) => method === "POST").at(-1);
    assert.ok(exchange, "the send must reach the agent over HTTP");
    assert.ok(
      exchange.requestedExtensions?.includes(OFFICIAL_EXTENSION_URI),
      "the client must request the official A2UI extension",
    );
    return { task: result, exchange };
  };
  const actionPart = (name, surfaceId) => ({
    data: [
      {
        version: A2UI_VERSION,
        action: {
          name,
          surfaceId,
          sourceComponentId: "body",
          timestamp: new Date().toISOString(),
          context: { entityId: "project-1" },
        },
      },
    ],
    mediaType: OFFICIAL_MEDIA_TYPE,
    metadata: { mimeType: OFFICIAL_MEDIA_TYPE },
  });

  // 1. Oracle: the turn offers A2UI 1.0 -> A2UI DataParts that build the surface.
  const offeredText = "Packed A2UI conformance surface";
  const offered = await send({ parts: [{ text: offeredText }], offerA2ui: true });
  assert.equal(offered.task.status?.state, TaskState.TASK_STATE_COMPLETED);
  const offeredParts = a2uiPartsOf(offered.task);
  assert.ok(offeredParts.length > 0, "a turn that offers A2UI 1.0 must receive A2UI DataParts");
  const offeredMessages = messagesOf(offeredParts);
  const created = offeredMessages.filter((message) => message.createSurface);
  assert.equal(created.length, 1, "the A2UI messages must create exactly one surface");
  const surfaceId = created[0].createSurface.surfaceId;
  assert.equal(created[0].createSurface.catalogId, a2a.PROMETHEUS_A2UI_CATALOG_ID);
  runtime.processMessages(offeredMessages);
  assert.ok(runtime.getSurface(surfaceId), `the headless runtime must hold surface ${surfaceId}`);
  const expected = summarize(offeredMessages);
  const built = summarize(runtime.exportSurfaceMessages(surfaceId).messages);
  assert.deepEqual(built.components, expected.components, "built components must match the received messages");
  assert.deepEqual(built.dataModel, expected.dataModel, "built data model must match the received messages");
  assert.equal(built.dataModel.body, offeredText, "the surface must carry the turn's text");
  assert.equal(built.catalogId, a2a.PROMETHEUS_A2UI_CATALOG_ID);

  // 2. Negative: same request without a2uiRendererCapabilities -> no A2UI parts,
  //    although the extension was requested and activated.
  const absent = await send({ parts: [{ text: offeredText }], offerA2ui: false });
  assert.equal(absent.task.status?.state, TaskState.TASK_STATE_COMPLETED);
  assert.ok(
    absent.exchange.activatedExtensions?.includes(OFFICIAL_EXTENSION_URI),
    "the agent activates the requested extension; activation alone must not offer A2UI",
  );
  assert.equal(a2uiPartsOf(absent.task).length, 0, "a turn without a2uiRendererCapabilities must receive no A2UI parts");

  // 3. Oracle: an inbound action is authorized, handled by a2uiInbound and answered.
  let logStart = inboundLog.length;
  const accepted = await send({ parts: [actionPart(ALLOWED_ACTION, surfaceId)], offerA2ui: true });
  const acceptedLog = inboundLog.slice(logStart);
  assert.deepEqual(
    acceptedLog.map(({ step, name }) => `${step}:${name}`),
    [`authorize:${ALLOWED_ACTION}`, `handle:${ALLOWED_ACTION}`],
    "the action must be authorized before it is handled",
  );
  assert.equal(accepted.task.status?.state, TaskState.TASK_STATE_COMPLETED);
  const answerParts = a2uiPartsOf(accepted.task);
  assert.ok(answerParts.length > 0, "the handled action must be answered with A2UI parts");
  runtime.processMessages(messagesOf(answerParts));
  const answered = summarize(runtime.exportSurfaceMessages(surfaceId).messages);
  assert.equal(answered.dataModel.body, `Acknowledged ${ALLOWED_ACTION}`, "the answer must update the built surface");

  // 4. Negative: authorize refuses -> not handled, task rejected, no answer.
  logStart = inboundLog.length;
  const refused = await send({ parts: [actionPart(REFUSED_ACTION, surfaceId)], offerA2ui: true });
  const refusedLog = inboundLog.slice(logStart);
  assert.deepEqual(
    refusedLog.map(({ step, name }) => `${step}:${name}`),
    [`authorize:${REFUSED_ACTION}`],
    "a refused action must never reach handle",
  );
  assert.equal(refused.task.status?.state, TaskState.TASK_STATE_REJECTED);
  assert.equal(a2uiPartsOf(refused.task).length, 0, "a refused action must not be answered with A2UI");
  const afterRefusal = summarize(runtime.exportSurfaceMessages(surfaceId).messages);
  assert.equal(afterRefusal.dataModel.body, `Acknowledged ${ALLOWED_ACTION}`);

  const result = {
    extensionUri: OFFICIAL_EXTENSION_URI,
    mediaType: OFFICIAL_MEDIA_TYPE,
    agentOrigin: origin,
    offeredCapabilities: capabilities[A2UI_VERSION],
    scenarios: {
      capabilitiesOffered: {
        taskState: stateName(offered.task.status?.state),
        a2uiParts: offeredParts.length,
        partMetadataMimeTypes: offeredParts.map((part) => part.metadata?.mimeType),
        messageKinds: offeredMessages.map(messageKind),
        surfaceId,
        builtComponents: built.components,
        builtDataModel: built.dataModel,
        activatedExtensions: offered.exchange.activatedExtensions,
      },
      capabilitiesAbsent: {
        taskState: stateName(absent.task.status?.state),
        a2uiParts: 0,
        artifactPartKinds: partsOf(absent.task).map((part) => part.content?.$case ?? null),
        requestedExtensions: absent.exchange.requestedExtensions,
        activatedExtensions: absent.exchange.activatedExtensions,
      },
      inboundAuthorized: {
        taskState: stateName(accepted.task.status?.state),
        inboundLog: acceptedLog,
        answerMessageKinds: messagesOf(answerParts).map(messageKind),
        builtDataModelAfterAnswer: answered.dataModel,
      },
      inboundRefused: {
        taskState: stateName(refused.task.status?.state),
        inboundLog: refusedLog,
        a2uiParts: 0,
        statusMessage: textOf(refused.task.status?.message),
      },
    },
  };
  process.stdout.write("[a2a-conformance] packed A2UI extension v1.0 scenarios passed\n");
  process.stdout.write(`${RESULT_MARKER}${JSON.stringify(result)}\n`);
} finally {
  runtime.dispose();
  await new Promise((resolveClose) => httpServer.close(resolveClose));
}

function partsOf(task) {
  return [
    ...(task.artifacts ?? []).flatMap((artifact) => artifact.parts ?? []),
    ...(task.status?.message?.parts ?? []),
  ];
}

/** A2UI DataParts by the extension's marker, checked independently of the package's own helper. */
function a2uiPartsOf(task) {
  const parts = partsOf(task).filter(
    (part) =>
      part.mediaType === OFFICIAL_MEDIA_TYPE ||
      part.metadata?.mimeType === OFFICIAL_MEDIA_TYPE ||
      a2a.isA2UIDataPart(part),
  );
  for (const part of parts) {
    assert.equal(part.content?.$case, "data", "an A2UI part must be a DataPart");
    assert.equal(part.metadata?.mimeType, OFFICIAL_MEDIA_TYPE, "DataPart metadata.mimeType must be the A2UI media type");
    assert.ok(Array.isArray(part.content.value), "DataPart data must be the A2UI message list");
    for (const message of part.content.value) assert.equal(message?.version, A2UI_VERSION);
  }
  return parts;
}

function messagesOf(parts) {
  return parts.flatMap((part) => part.content.value);
}

function messageKind(message) {
  return Object.keys(message).find((key) => key !== "version") ?? null;
}

/** Component ids -> component names, the root data model, and the catalog of A2UI 1.0 messages. */
function summarize(messages) {
  const components = {};
  let dataModel = {};
  let catalogId = null;
  for (const message of messages) {
    if (message.createSurface) catalogId = message.createSurface.catalogId ?? catalogId;
    // A 1.0 createSurface may carry its components and data model inline; exportSurfaceMessages
    // exports a 1.0 surface that way.
    for (const component of message.createSurface?.components ?? []) {
      components[component.id] = component.component;
    }
    if (message.createSurface?.dataModel !== undefined) {
      dataModel = setPointer(dataModel, "/", message.createSurface.dataModel);
    }
    for (const component of message.updateComponents?.components ?? []) {
      components[component.id] = component.component;
    }
    if (message.updateDataModel) {
      dataModel = setPointer(dataModel, message.updateDataModel.path ?? "/", message.updateDataModel.value);
    }
  }
  return { components: sortKeys(components), dataModel, catalogId };
}

function setPointer(model, pointer, value) {
  const segments = pointer
    .split("/")
    .slice(1)
    .filter((segment) => segment !== "")
    .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
  if (segments.length === 0) return structuredClone(value);
  const [head, ...rest] = segments;
  const current = model && typeof model === "object" ? model : {};
  return {
    ...current,
    [head]: rest.length === 0 ? structuredClone(value) : setPointer(current[head], `/${rest.join("/")}`, value),
  };
}

function sortKeys(record) {
  return Object.fromEntries(Object.entries(record).sort(([a], [b]) => a.localeCompare(b)));
}

function stateName(state) {
  return Object.keys(TaskState).find((key) => TaskState[key] === state) ?? state ?? null;
}

function textOf(message) {
  return (message?.parts ?? [])
    .map((part) => (part.content?.$case === "text" ? part.content.value : ""))
    .join(" ")
    .trim();
}
