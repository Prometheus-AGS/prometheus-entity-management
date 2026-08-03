import {
  A2A_VERSION_HEADER,
  HTTP_EXTENSION_HEADER,
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_A2UI_MEDIA_TYPE,
  PROMETHEUS_A2UI_PROTOCOL_VERSION,
  Role,
  type Message,
  type Part,
  type PrometheusA2UIMessage,
} from "@prometheus-ags/entity-graph-a2a";
import { SendMessageRequest } from "@a2a-js/sdk";
import { agentServer, LOCAL_A2A_ENDPOINT } from "./agent-server";
import type {
  AgentArtifactReceipt,
  AgentLifecycle,
  AgentScenario,
} from "./types";

interface StreamObserver {
  onTask(taskId: string): void;
  onLifecycle(lifecycle: AgentLifecycle): void;
  onArtifact(
    messages: readonly PrometheusA2UIMessage[],
    receipt: AgentArtifactReceipt,
  ): void;
}

interface JsonRecord {
  [key: string]: unknown;
}

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringField(record: JsonRecord, key: string): string | undefined {
  return typeof record[key] === "string" ? record[key] : undefined;
}

function textPart(text: string): Part {
  return {
    content: { $case: "text", value: text },
    mediaType: "text/plain",
    filename: "",
    metadata: {},
  };
}

function requestMessage(scenario: AgentScenario, messageId: string): Message {
  return {
    role: Role.ROLE_USER,
    messageId,
    taskId: "",
    contextId: "",
    parts: [textPart(`scenario:${scenario} review task-sync`)],
    metadata: {},
    extensions: [PROMETHEUS_A2UI_EXTENSION_URI],
    referenceTaskIds: [],
  };
}

function requestBody(scenario: AgentScenario, requestId: string): string {
  const params = SendMessageRequest.toJSON({
    tenant: "",
    message: requestMessage(scenario, `message-${requestId}`),
    configuration: {
      acceptedOutputModes: [PROMETHEUS_A2UI_MEDIA_TYPE],
      historyLength: 0,
      returnImmediately: false,
      taskPushNotificationConfig: undefined,
    },
    metadata: {},
  });
  return JSON.stringify({
    jsonrpc: "2.0",
    id: requestId,
    method: "SendStreamingMessage",
    params,
  });
}

function cancelBody(taskId: string, requestId: string): string {
  return JSON.stringify({
    jsonrpc: "2.0",
    id: requestId,
    method: "CancelTask",
    params: { tenant: "", id: taskId, metadata: {} },
  });
}

function frameBoundary(buffer: string): { index: number; length: number } | null {
  const lf = buffer.indexOf("\n\n");
  const crlf = buffer.indexOf("\r\n\r\n");
  if (lf < 0 && crlf < 0) return null;
  if (crlf >= 0 && (lf < 0 || crlf < lf)) return { index: crlf, length: 4 };
  return { index: lf, length: 2 };
}

function parseFrame(frame: string): unknown | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trimStart())
    .join("\n");
  return data ? JSON.parse(data) : null;
}

async function* readSse(response: Response): AsyncGenerator<unknown> {
  if (!response.ok || !response.body) {
    throw new Error(`A2A stream failed with HTTP ${response.status}.`);
  }
  if (!response.headers.get("content-type")?.includes("text/event-stream")) {
    throw new Error("A2A streaming response did not use text/event-stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary = frameBoundary(buffer);
      while (boundary) {
        const frame = buffer.slice(0, boundary.index);
        buffer = buffer.slice(boundary.index + boundary.length);
        const parsed = parseFrame(frame);
        if (parsed !== null) yield parsed;
        boundary = frameBoundary(buffer);
      }
    }
    buffer += decoder.decode();
    const parsed = parseFrame(buffer);
    if (parsed !== null) yield parsed;
  } finally {
    reader.releaseLock();
  }
}

function lifecycleFromWire(value: string | undefined): AgentLifecycle | null {
  switch (value) {
    case "TASK_STATE_SUBMITTED":
      return "submitted";
    case "TASK_STATE_WORKING":
      return "working";
    case "TASK_STATE_COMPLETED":
      return "completed";
    case "TASK_STATE_REJECTED":
      return "rejected";
    case "TASK_STATE_CANCELED":
      return "cancelled";
    default:
      return null;
  }
}

function inspectStatus(
  value: unknown,
  observer: StreamObserver,
): void {
  if (!isRecord(value)) return;
  const lifecycle = lifecycleFromWire(stringField(value, "state"));
  if (lifecycle) observer.onLifecycle(lifecycle);
}

function inspectTaskLike(value: unknown, observer: StreamObserver): void {
  if (!isRecord(value)) return;
  const taskId = stringField(value, "id") ?? stringField(value, "taskId");
  if (taskId) observer.onTask(taskId);
  inspectStatus(value.status, observer);
}

function readArtifact(
  value: unknown,
): {
  messages: readonly PrometheusA2UIMessage[];
  receipt: AgentArtifactReceipt;
} | null {
  if (!isRecord(value)) return null;
  const parts = Array.isArray(value.parts) ? value.parts : [];
  const part = parts.find(
    (candidate) =>
      isRecord(candidate) && candidate.mediaType === PROMETHEUS_A2UI_MEDIA_TYPE,
  );
  if (!isRecord(part) || !isRecord(part.data)) return null;
  const payload = part.data;
  if (payload.protocol !== PROMETHEUS_A2UI_PROTOCOL_VERSION) {
    throw new Error("A2UI artifact protocol is not v0.9.1.");
  }
  if (!Array.isArray(payload.messages)) {
    throw new Error("A2UI artifact messages must be an array.");
  }
  const messages = payload.messages as PrometheusA2UIMessage[];
  return {
    messages,
    receipt: {
      artifactId: stringField(value, "artifactId") ?? "unknown-artifact",
      name: stringField(value, "name") ?? "A2UI artifact",
      mediaType: PROMETHEUS_A2UI_MEDIA_TYPE,
      messageCount: messages.length,
    },
  };
}

function inspectEnvelope(envelope: unknown, observer: StreamObserver): void {
  if (!isRecord(envelope)) return;
  if (isRecord(envelope.error)) {
    throw new Error("The A2A agent returned a JSON-RPC error.");
  }
  if (!isRecord(envelope.result)) return;
  const result = envelope.result;
  inspectTaskLike(result.task, observer);
  inspectTaskLike(result.statusUpdate, observer);

  if (!isRecord(result.artifactUpdate)) return;
  const taskId = stringField(result.artifactUpdate, "taskId");
  if (taskId) observer.onTask(taskId);
  const artifact = readArtifact(result.artifactUpdate.artifact);
  if (artifact) observer.onArtifact(artifact.messages, artifact.receipt);
}

class A2AClientService {
  private nextRequestId = 0;
  private activeTaskId: string | null = null;

  async run(scenario: AgentScenario, observer: StreamObserver): Promise<void> {
    const requestId = this.requestId("stream");
    const response = await agentServer.fetch(
      new Request(LOCAL_A2A_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [A2A_VERSION_HEADER]: "1.0",
          [HTTP_EXTENSION_HEADER]: PROMETHEUS_A2UI_EXTENSION_URI,
        },
        body: requestBody(scenario, requestId),
      }),
    );

    try {
      for await (const envelope of readSse(response)) {
        inspectEnvelope(envelope, {
          ...observer,
          onTask: (taskId) => {
            this.activeTaskId = taskId;
            observer.onTask(taskId);
          },
        });
      }
    } finally {
      this.activeTaskId = null;
    }
  }

  async cancel(): Promise<boolean> {
    const taskId = this.activeTaskId;
    if (!taskId) return false;
    const response = await agentServer.fetch(
      new Request(LOCAL_A2A_ENDPOINT, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          [A2A_VERSION_HEADER]: "1.0",
        },
        body: cancelBody(taskId, this.requestId("cancel")),
      }),
    );
    if (!response.ok) {
      throw new Error(`A2A cancellation failed with HTTP ${response.status}.`);
    }
    const envelope: unknown = await response.json();
    if (!isRecord(envelope) || isRecord(envelope.error)) {
      throw new Error("The A2A server rejected cancellation.");
    }
    return true;
  }

  private requestId(kind: string): string {
    this.nextRequestId += 1;
    return `${kind}-${this.nextRequestId}`;
  }
}

export const a2aClientService = new A2AClientService();
