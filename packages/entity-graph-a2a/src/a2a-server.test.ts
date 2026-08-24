import { beforeEach, describe, expect, it } from "vitest";
import {
  A2A_VERSION_HEADER,
  HTTP_EXTENSION_HEADER,
  Role,
  SendMessageRequest,
  TaskState,
  type Message,
  type Part,
} from "@a2a-js/sdk";
import { graphStore } from "@prometheus-ags/entity-graph-core";
import {
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_GRAPH_EXTENSION_URI,
  buildAgentCard,
  createA2AServer,
  createBearerTokenAuthenticator,
  createEntityGraphA2APolicy,
  createExternalA2AExecutor,
  type A2ACaller,
  type A2AJsonRpcResponse,
  type A2AServer,
  type EntityGraphA2ARequest,
} from "./index.js";
import { createLegacyA2AAdapter } from "./legacy/index.js";

const ENDPOINT = "http://localhost/a2a";
const FIXED_TIME = "2026-08-01T00:00:00.000Z";

interface JsonRpcError {
  code: number;
  message: string;
}

interface JsonRpcEnvelope extends A2AJsonRpcResponse {
  result?: Record<string, any>;
  error?: JsonRpcError;
}

function deterministicOptions(stepDelayMs = 0) {
  let id = 0;
  return {
    clock: () => FIXED_TIME,
    idFactory: () => `deterministic-${++id}`,
    stepDelayMs,
  };
}

function allowProjectPolicy(options: { approveDestructive?: boolean } = {}) {
  return createEntityGraphA2APolicy({
    entities: {
      Project: {
        actions: ["upsert", "replace", "remove", "patch", "clearPatch", "query", "snapshot"],
        fields: ["id", "name", "status"],
      },
      "*": { actions: ["snapshot"], fields: [] },
    },
    requestApproval: () => ({ allowed: options.approveDestructive ?? false }),
  });
}

function makeServer(options: {
  policy?: ReturnType<typeof allowProjectPolicy>;
  stepDelayMs?: number;
} = {}): A2AServer {
  return createA2AServer({
    card: buildAgentCard({ url: ENDPOINT }),
    policy: options.policy,
    deterministicExecutor: deterministicOptions(options.stepDelayMs),
  });
}

function textPart(text: string): Part {
  return {
    content: { $case: "text", value: text },
    mediaType: "text/plain",
    filename: "",
    metadata: {},
  };
}

function dataPart(data: unknown): Part {
  return {
    content: { $case: "data", value: data },
    mediaType: "application/json",
    filename: "",
    metadata: {},
  };
}

function message(
  parts: Part[],
  options: { id?: string; taskId?: string; contextId?: string; extensions?: string[] } = {},
): Message {
  return {
    role: Role.ROLE_USER,
    messageId: options.id ?? "message-1",
    taskId: options.taskId ?? "",
    contextId: options.contextId ?? "",
    parts,
    metadata: {},
    extensions: options.extensions ?? [],
    referenceTaskIds: [],
  };
}

function graphMessage(request: EntityGraphA2ARequest, id = "graph-message"): Message {
  return message([dataPart(request)], {
    id,
    extensions: [PROMETHEUS_GRAPH_EXTENSION_URI],
  });
}

function sendParams(value: Message, historyLength?: number): Record<string, unknown> {
  return SendMessageRequest.toJSON({
    tenant: "",
    message: value,
    configuration:
      historyLength === undefined
        ? undefined
        : {
            acceptedOutputModes: [],
            historyLength,
            blocking: false,
            pushNotificationConfig: undefined,
          },
    metadata: {},
  }) as Record<string, unknown>;
}

function rpc(method: string, params: Record<string, unknown>, id = "request-1") {
  return { jsonrpc: "2.0", id, method, params };
}

async function call(
  server: A2AServer,
  method: string,
  params: Record<string, unknown>,
  options: Parameters<A2AServer["handleRequest"]>[1] = {},
): Promise<JsonRpcEnvelope> {
  const response = await server.handleRequest(rpc(method, params), options);
  if (typeof (response as AsyncGenerator<unknown>)[Symbol.asyncIterator] === "function") {
    throw new Error(`${method} unexpectedly returned a stream.`);
  }
  return response as JsonRpcEnvelope;
}

function taskFrom(response: JsonRpcEnvelope): Record<string, any> {
  expect(response.error).toBeUndefined();
  expect(response.result?.task).toBeDefined();
  return response.result!.task;
}

function parseSse(text: string): JsonRpcEnvelope[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => JSON.parse(line.slice(5).trim()));
}

async function readFirstSseEvent(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<{ event: JsonRpcEnvelope; remainder: string }> {
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) throw new Error("SSE stream closed before its first event.");
    buffer += decoder.decode(value, { stream: true });
    const boundary = buffer.indexOf("\n\n");
    if (boundary < 0) continue;
    const frame = buffer.slice(0, boundary);
    const data = frame
      .split(/\r?\n/)
      .find((line) => line.startsWith("data:"));
    if (!data) continue;
    return {
      event: JSON.parse(data.slice(5).trim()),
      remainder: buffer.slice(boundary + 2),
    };
  }
}

async function drainSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  initial = "",
): Promise<JsonRpcEnvelope[]> {
  const decoder = new TextDecoder();
  let text = initial;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  return parseSse(text);
}

function taskIdFromStreamEvent(event: JsonRpcEnvelope): string {
  const payload = event.result?.task ?? event.result?.statusUpdate ?? event.result?.artifactUpdate;
  const id = payload?.id ?? payload?.taskId;
  expect(typeof id).toBe("string");
  return id;
}

beforeEach(() => {
  graphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
});

describe("official AgentCard and JSON-RPC binding", () => {
  it("discovers an A2A v1 card that advertises only implemented capabilities", async () => {
    const server = makeServer();
    const response = await server.fetch(
      new Request("http://localhost/.well-known/agent-card.json"),
    );
    const card = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get(A2A_VERSION_HEADER)).toBe("1.0");
    expect(card.supportedInterfaces).toEqual([
      expect.objectContaining({
        url: ENDPOINT,
        protocolBinding: "JSONRPC",
        protocolVersion: "1.0",
      }),
    ]);
    expect(card.capabilities).toMatchObject({
      streaming: true,
      pushNotifications: false,
      extendedAgentCard: false,
    });
    expect(card.signatures).toBeUndefined();
    expect(card.skills.map(({ id }: { id: string }) => id)).toEqual([
      "prometheus.entity-graph.mutate",
      "prometheus.entity-graph.query",
      "prometheus.a2ui.reference-surface",
    ]);
  });

  it("rejects absent versions, wrong media types, and unknown paths", async () => {
    const server = makeServer();
    const body = JSON.stringify(rpc("GetTask", { tenant: "", id: "missing" }));
    const missingVersion = await server.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
      }),
    );
    expect(await missingVersion.json()).toMatchObject({ error: { code: -32009 } });

    const wrongType = await server.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body,
      }),
    );
    expect(wrongType.status).toBe(415);
    expect((await server.fetch(new Request("http://localhost/not-a2a"))).status).toBe(404);
  });

  it("uses official JSON-RPC errors for malformed and unknown calls", async () => {
    const server = makeServer();
    const malformed = (await server.handleRequest("{")) as JsonRpcEnvelope;
    const unknown = await call(server, "MadeUpMethod", {});
    const notFound = await call(server, "GetTask", { tenant: "", id: "missing" });

    expect(malformed.error?.code).toBe(-32700);
    expect(unknown.error?.code).toBe(-32601);
    expect(notFound.error?.code).toBe(-32001);
  });
});

describe("official task lifecycle", () => {
  it("supports SendMessage, GetTask, ListTasks, history limits, and terminal guards", async () => {
    const server = makeServer();
    const sent = await call(
      server,
      "SendMessage",
      sendParams(message([textPart("Hello deterministic agent")]), 10),
    );
    const task = taskFrom(sent);

    expect(task.status.state).toBe("TASK_STATE_COMPLETED");
    expect(task.history).toHaveLength(2);
    expect(task.history.some(({ role }: { role: string }) => role === "ROLE_USER")).toBe(true);
    expect(task.artifacts[0].parts[0].text).toContain("Prometheus A2A v1 is ready");

    const fetched = await call(server, "GetTask", {
      tenant: "",
      id: task.id,
      historyLength: 0,
    });
    expect(fetched.result?.id).toBe(task.id);
    expect(fetched.result?.history ?? []).toHaveLength(0);

    const listed = await call(server, "ListTasks", {
      tenant: "",
      contextId: task.contextId,
      status: "TASK_STATE_COMPLETED",
      pageSize: 25,
      pageToken: "",
      statusTimestampAfter: "",
      includeArtifacts: true,
    });
    expect(listed.result).toMatchObject({ pageSize: 25, totalSize: 1 });
    expect(listed.result?.tasks).toHaveLength(1);

    const cancelTerminal = await call(server, "CancelTask", {
      tenant: "",
      id: task.id,
      metadata: {},
    });
    expect(cancelTerminal.error?.code).toBe(-32002);

    const continueTerminal = await call(
      server,
      "SendMessage",
      sendParams(
        message([textPart("Continue")], {
          id: "message-continue",
          taskId: task.id,
          contextId: task.contextId,
        }),
      ),
    );
    expect(continueTerminal.error).toBeDefined();
  });

  it("streams ordered task, working, artifact, and terminal envelopes over SSE", async () => {
    const server = makeServer();
    const response = await server.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [A2A_VERSION_HEADER]: "1.0",
          [HTTP_EXTENSION_HEADER]: PROMETHEUS_A2UI_EXTENSION_URI,
        },
        body: JSON.stringify(
          rpc(
            "SendStreamingMessage",
            sendParams(message([textPart("Build the deterministic surface")], { id: "stream-message" })),
            "stream-request",
          ),
        ),
      }),
    );
    const events = parseSse(await response.text());

    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get(HTTP_EXTENSION_HEADER)).toBe(
      PROMETHEUS_A2UI_EXTENSION_URI,
    );
    expect(events).toHaveLength(4);
    expect(events.every(({ jsonrpc, id }) => jsonrpc === "2.0" && id === "stream-request")).toBe(true);
    expect(events[0].result?.task.status.state).toBe("TASK_STATE_SUBMITTED");
    expect(events[1].result?.statusUpdate.status.state).toBe("TASK_STATE_WORKING");
    expect(events[2].result?.artifactUpdate.artifact.parts[0]).toMatchObject({
      mediaType: "application/json+a2ui",
      data: expect.objectContaining({ protocol: "v0.9.1" }),
    });
    expect(events[3].result?.statusUpdate.status.state).toBe("TASK_STATE_COMPLETED");
  });

  it("cancels a working task and exposes the terminal update to subscribers", async () => {
    const server = makeServer({ stepDelayMs: 100 });
    const response = await server.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [A2A_VERSION_HEADER]: "1.0",
        },
        body: JSON.stringify(
          rpc(
            "SendStreamingMessage",
            sendParams(message([textPart("Long deterministic operation")], { id: "cancel-message" })),
            "cancel-stream",
          ),
        ),
      }),
    );
    const reader = response.body!.getReader();
    const first = await readFirstSseEvent(reader);
    const taskId = taskIdFromStreamEvent(first.event);

    const subscriptionResponse = await server.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [A2A_VERSION_HEADER]: "1.0",
        },
        body: JSON.stringify(
          rpc("SubscribeToTask", { tenant: "", id: taskId }, "subscription"),
        ),
      }),
    );
    const cancelled = await call(server, "CancelTask", {
      tenant: "",
      id: taskId,
      metadata: {},
    });
    const originalEvents = [first.event, ...(await drainSse(reader, first.remainder))];
    const subscriptionEvents = parseSse(await subscriptionResponse.text());

    expect(cancelled.result?.id).toBe(taskId);
    expect(cancelled.result?.status.state).toBe("TASK_STATE_CANCELED");
    expect(originalEvents.at(-1)?.result?.statusUpdate.status.state).toBe(
      "TASK_STATE_CANCELED",
    );
    expect(subscriptionEvents[0].result?.task.id).toBe(taskId);
    expect(subscriptionEvents.at(-1)?.result?.statusUpdate.status.state).toBe(
      "TASK_STATE_CANCELED",
    );
  });
});

describe("authorization before graph mutation", () => {
  it("fails closed by default and never applies a denied graph request", async () => {
    const server = makeServer();
    const response = await call(
      server,
      "SendMessage",
      sendParams(
        graphMessage({
          kind: "prometheus.entity-graph.request",
          version: "1.0",
          operation: "mutate",
          mutations: [
            {
              op: "upsert",
              entityType: "Project",
              id: "denied-project",
              data: { id: "denied-project", name: "Denied" },
            },
          ],
        }),
      ),
    );

    expect(taskFrom(response).status.state).toBe("TASK_STATE_REJECTED");
    expect(graphStore.getState().entities.Project?.["denied-project"]).toBeUndefined();
  });

  it("preauthorizes the entire batch so a forbidden field rolls back every mutation", async () => {
    const server = makeServer({ policy: allowProjectPolicy() });
    const response = await call(
      server,
      "SendMessage",
      sendParams(
        graphMessage({
          kind: "prometheus.entity-graph.request",
          version: "1.0",
          operation: "mutate",
          mutations: [
            {
              op: "upsert",
              entityType: "Project",
              id: "would-have-passed",
              data: { id: "would-have-passed", name: "Allowed shape" },
            },
            {
              op: "upsert",
              entityType: "Project",
              id: "forbidden-field",
              data: { id: "forbidden-field", name: "No", secret: "blocked" },
            },
          ],
        }),
      ),
    );

    expect(taskFrom(response).status.state).toBe("TASK_STATE_REJECTED");
    expect(graphStore.getState().entities.Project).toBeUndefined();
  });

  it("requires approval for replacement and preserves the original on denial", async () => {
    graphStore.getState().upsertEntity("Project", "project-1", {
      id: "project-1",
      name: "Original",
    });
    const deniedServer = makeServer({ policy: allowProjectPolicy() });
    const replaceRequest: EntityGraphA2ARequest = {
      kind: "prometheus.entity-graph.request",
      version: "1.0",
      operation: "mutate",
      mutations: [
        {
          op: "replace",
          entityType: "Project",
          id: "project-1",
          data: { id: "project-1", name: "Replacement" },
        },
      ],
    };
    const denied = await call(
      deniedServer,
      "SendMessage",
      sendParams(graphMessage(replaceRequest, "replace-denied")),
    );
    expect(taskFrom(denied).status.state).toBe("TASK_STATE_REJECTED");
    expect(graphStore.getState().entities.Project["project-1"].name).toBe("Original");

    const approvedServer = makeServer({
      policy: allowProjectPolicy({ approveDestructive: true }),
    });
    const approved = await call(
      approvedServer,
      "SendMessage",
      sendParams(graphMessage(replaceRequest, "replace-approved")),
    );
    expect(taskFrom(approved).status.state).toBe("TASK_STATE_COMPLETED");
    expect(graphStore.getState().entities.Project["project-1"].name).toBe("Replacement");
  });

  it("returns 401 before dispatch and cannot mutate when authentication fails", async () => {
    const server = createA2AServer({
      card: buildAgentCard({ url: ENDPOINT, authentication: "bearer" }),
      policy: allowProjectPolicy(),
      authenticator: createBearerTokenAuthenticator({ verify: () => null }),
      deterministicExecutor: deterministicOptions(),
    });
    const denied = await server.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [A2A_VERSION_HEADER]: "1.0",
          authorization: "Bearer invalid",
        },
        body: JSON.stringify(
          rpc(
            "SendMessage",
            sendParams(
              graphMessage({
                kind: "prometheus.entity-graph.request",
                version: "1.0",
                operation: "mutate",
                mutations: [
                  {
                    op: "upsert",
                    entityType: "Project",
                    id: "auth-denied",
                    data: { id: "auth-denied", name: "Denied" },
                  },
                ],
              }),
            ),
          ),
        ),
      }),
    );

    expect(denied.status).toBe(401);
    expect(denied.headers.get("www-authenticate")).toBe("Bearer");
    expect(graphStore.getState().entities.Project?.["auth-denied"]).toBeUndefined();
  });

  it("makes hidden and nonexistent tasks indistinguishable across caller scopes", async () => {
    const server = makeServer();
    const alice: A2ACaller = {
      id: "alice",
      isAuthenticated: true,
      scopes: ["a2a"],
    };
    const bob: A2ACaller = {
      id: "bob",
      isAuthenticated: true,
      scopes: ["a2a"],
    };
    const task = taskFrom(
      await call(
        server,
        "SendMessage",
        sendParams(message([textPart("Alice task")], { id: "alice-message" })),
        { caller: alice },
      ),
    );

    const hidden = await call(
      server,
      "GetTask",
      { tenant: "", id: task.id },
      { caller: bob },
    );
    const absent = await call(
      server,
      "GetTask",
      { tenant: "", id: "does-not-exist" },
      { caller: bob },
    );
    expect(hidden.error?.code).toBe(-32001);
    expect(absent.error?.code).toBe(-32001);
    expect((hidden.error as any).details).toEqual((absent.error as any).details);
    expect(hidden.error?.message).toBe(`Task not found: ${task.id}`);
    expect(absent.error?.message).toBe("Task not found: does-not-exist");
  });
});

describe("optional external agent executor", () => {
  it("discovers an opt-in external JSON-RPC agent through the injected fetch and remaps its lifecycle", async () => {
    const remoteEndpoint = "http://127.0.0.1:43119/a2a";
    const remoteServer = createA2AServer({
      card: buildAgentCard({ url: remoteEndpoint }),
      deterministicExecutor: deterministicOptions(),
    });
    const observedRequests: Array<{
      method: string;
      pathname: string;
      externalToken: string | null;
    }> = [];
    const remoteStreamBodies: Array<Promise<string>> = [];
    const injectedFetch: typeof fetch = async (input, init) => {
      const request = new Request(input, init);
      observedRequests.push({
        method: request.method,
        pathname: new URL(request.url).pathname,
        externalToken: request.headers.get("x-external-token"),
      });
      const response = await remoteServer.fetch(request);
      if (request.method === "POST") remoteStreamBodies.push(response.clone().text());
      return response;
    };
    const localServer = createA2AServer({
      card: buildAgentCard({ url: ENDPOINT }),
      executor: createExternalA2AExecutor({
        baseUrl: "http://127.0.0.1:43119",
        fetch: injectedFetch,
        serviceParameters: { "x-external-token": "scoped-test-token" },
      }),
    });

    const response = await localServer.fetch(
      new Request(ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [A2A_VERSION_HEADER]: "1.0",
        },
        body: JSON.stringify(
          rpc(
            "SendStreamingMessage",
            sendParams(message([textPart("Delegate deterministically")], { id: "external-message" })),
            "external-stream",
          ),
        ),
      }),
    );
    const localEvents = parseSse(await response.text());
    const remoteEvents = parseSse(await remoteStreamBodies[0]);
    const localTaskId = taskIdFromStreamEvent(localEvents[0]);
    const remoteTaskId = taskIdFromStreamEvent(remoteEvents[0]);
    const localContextId = localEvents[0].result?.task.contextId;

    expect(localEvents).toHaveLength(4);
    expect(localEvents.at(-1)?.result?.statusUpdate.status.state).toBe(
      "TASK_STATE_COMPLETED",
    );
    expect(localTaskId).not.toBe(remoteTaskId);
    expect(
      localEvents.every((event) => {
        const payload =
          event.result?.task ?? event.result?.statusUpdate ?? event.result?.artifactUpdate;
        return (payload.id ?? payload.taskId) === localTaskId && payload.contextId === localContextId;
      }),
    ).toBe(true);
    expect(observedRequests).toEqual([
      {
        method: "GET",
        pathname: "/.well-known/agent-card.json",
        externalToken: null,
      },
      {
        method: "POST",
        pathname: "/a2a",
        externalToken: "scoped-test-token",
      },
    ]);
  });

  it("rejects plaintext external endpoints outside loopback development", () => {
    expect(() =>
      createExternalA2AExecutor({ baseUrl: "http://agents.example.test" }),
    ).toThrow("External A2A endpoints must use HTTPS outside local development.");
  });

  it("rejects non-HTTP schemes even when the endpoint hostname is loopback", () => {
    expect(() =>
      createExternalA2AExecutor({ baseUrl: "ftp://localhost/a2a" }),
    ).toThrow("External A2A endpoints must use HTTPS outside local development.");
    expect(() =>
      createExternalA2AExecutor({ baseUrl: "ws://127.0.0.1/a2a" }),
    ).toThrow("External A2A endpoints must use HTTPS outside local development.");
  });

  it("rejects credential-bearing external endpoints before discovery", () => {
    expect(() =>
      createExternalA2AExecutor({ baseUrl: "https://token@agents.example.test/a2a" }),
    ).toThrow("External A2A endpoints must not embed credentials.");
    expect(() =>
      createExternalA2AExecutor({
        baseUrl: "https://service:secret@agents.example.test/a2a",
      }),
    ).toThrow("External A2A endpoints must not embed credentials.");
  });

  it("allows HTTP only for IPv4, IPv6, and named loopback development", () => {
    expect(() =>
      createExternalA2AExecutor({ baseUrl: "http://localhost/a2a" }),
    ).not.toThrow();
    expect(() =>
      createExternalA2AExecutor({ baseUrl: "http://127.0.0.1/a2a" }),
    ).not.toThrow();
    expect(() =>
      createExternalA2AExecutor({ baseUrl: "http://[::1]/a2a" }),
    ).not.toThrow();
  });
});

describe("deterministic A2UI and compatibility seams", () => {
  it("emits repeatable A2UI v0.9.1 metadata without a model credential", async () => {
    const server = makeServer();
    const response = await call(
      server,
      "SendMessage",
      sendParams(message([textPart("Show project status")], { id: "a2ui-message" })),
      { requestedExtensions: [PROMETHEUS_A2UI_EXTENSION_URI] },
    );
    const task = taskFrom(response);
    const artifact = task.artifacts[0];
    const payload = artifact.parts[0].data;

    expect(task.status.state).toBe("TASK_STATE_COMPLETED");
    expect(artifact.extensions).toEqual([PROMETHEUS_A2UI_EXTENSION_URI]);
    expect(artifact.parts[0].mediaType).toBe("application/json+a2ui");
    expect(payload).toMatchObject({
      protocol: "v0.9.1",
      extensionUri: PROMETHEUS_A2UI_EXTENSION_URI,
    });
    expect(payload.messages).toEqual([
      expect.objectContaining({ version: "v0.9.1", createSurface: expect.any(Object) }),
      expect.objectContaining({ version: "v0.9.1", updateComponents: expect.any(Object) }),
      expect.objectContaining({ version: "v0.9.1", updateDataModel: expect.any(Object) }),
    ]);
  });

  it("translates retained slash methods only through the explicit legacy adapter", async () => {
    const server = makeServer({ policy: allowProjectPolicy() });
    const legacy = createLegacyA2AAdapter({
      server,
      idFactory: () => "legacy-message-id",
    });
    const sent = await legacy.handleRequest({
      jsonrpc: "2.0",
      id: "legacy-send",
      method: "tasks/send",
      params: {
        id: "legacy-project-task",
        message: {
          role: "user",
          parts: [
            {
              type: "graph/mutation",
              mutations: [
                {
                  op: "upsert",
                  entityType: "Project",
                  id: "legacy-project",
                  data: { id: "legacy-project", name: "Translated" },
                },
              ],
            },
          ],
        },
      },
    });
    const task = taskFrom(sent as JsonRpcEnvelope);
    const fetched = await legacy.handleRequest({
      jsonrpc: "2.0",
      id: "legacy-get",
      method: "tasks/get",
      params: { id: "legacy-project-task" },
    });
    const subscription = await legacy.handleRequest({
      jsonrpc: "2.0",
      id: "legacy-stream",
      method: "tasks/sendSubscribe",
      params: {},
    });

    expect(graphStore.getState().entities.Project["legacy-project"].name).toBe("Translated");
    expect(fetched.result?.id).toBe(task.id);
    expect((subscription.error as JsonRpcError).code).toBe(-32601);
  });

  it("uses official enum values in the deterministic lifecycle", () => {
    expect(TaskState.TASK_STATE_SUBMITTED).toBeDefined();
    expect(TaskState.TASK_STATE_WORKING).toBeDefined();
    expect(TaskState.TASK_STATE_COMPLETED).toBeDefined();
    expect(TaskState.TASK_STATE_CANCELED).toBeDefined();
  });
});
