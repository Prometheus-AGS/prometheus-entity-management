/**
 * In-page A2A v1 JSON-RPC client for the deterministic showcase agent.
 * Speaks the official wire shapes through `A2AServer.handleRequest`; no HTTP
 * hop and no model credential are involved.
 */
import { Role, SendMessageRequest } from "@a2a-js/sdk";
import {
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_GRAPH_EXTENSION_URI,
  type A2ACaller,
  type A2AJsonRpcResponse,
  type A2AServer,
  type EntityGraphA2ARequest,
  type Message,
  type Part,
} from "@prometheus-ags/entity-graph-a2a";

export interface AgentStreamEvent {
  kind: "task" | "status" | "artifact";
  state?: string;
  artifact?: Record<string, unknown>;
  raw: A2AJsonRpcResponse;
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

let messageCounter = 0;

export function graphRequestMessage(
  request: EntityGraphA2ARequest,
  options: { taskId?: string } = {},
): Message {
  messageCounter += 1;
  return {
    role: Role.ROLE_USER,
    messageId: `ui-message-${messageCounter}`,
    taskId: options.taskId ?? "",
    contextId: "",
    parts: [dataPart(request)],
    metadata: {},
    extensions: [PROMETHEUS_GRAPH_EXTENSION_URI],
    referenceTaskIds: [],
  };
}

export function surfaceRequestMessage(text: string): Message {
  messageCounter += 1;
  return {
    role: Role.ROLE_USER,
    messageId: `ui-message-${messageCounter}`,
    taskId: "",
    contextId: "",
    parts: [textPart(text)],
    metadata: {},
    extensions: [PROMETHEUS_A2UI_EXTENSION_URI],
    referenceTaskIds: [],
  };
}

function sendParams(message: Message): Record<string, unknown> {
  return SendMessageRequest.toJSON({
    tenant: "",
    message,
    configuration: undefined,
    metadata: {},
  }) as Record<string, unknown>;
}

function extensionsFor(message: Message): readonly string[] {
  return message.extensions ?? [];
}

function classifyEvent(raw: A2AJsonRpcResponse): AgentStreamEvent {
  const result = raw.result as Record<string, any> | undefined;
  if (result?.artifactUpdate) {
    return { kind: "artifact", artifact: result.artifactUpdate.artifact, raw };
  }
  const state: string | undefined =
    result?.statusUpdate?.status?.state ?? result?.task?.status?.state;
  return { kind: result?.task ? "task" : "status", state, raw };
}

/** Run a streaming task; invokes `onEvent` for every official stream event. */
export async function runStreamingTask(
  server: A2AServer,
  message: Message,
  caller: A2ACaller,
  onEvent: (event: AgentStreamEvent) => void,
): Promise<{ taskId: string | undefined; finalState: string | undefined }> {
  const response = await server.handleRequest(
    { jsonrpc: "2.0", id: `stream-${message.messageId}`, method: "SendStreamingMessage", params: sendParams(message) },
    { caller, requestedExtensions: extensionsFor(message) },
  );
  if (typeof (response as AsyncGenerator)[Symbol.asyncIterator] !== "function") {
    const envelope = response as A2AJsonRpcResponse;
    throw new Error(
      `Streaming request failed: ${JSON.stringify(envelope.error ?? envelope.result)}`,
    );
  }

  let taskId: string | undefined;
  let finalState: string | undefined;
  for await (const event of response as AsyncGenerator<A2AJsonRpcResponse, void, undefined>) {
    const classified = classifyEvent(event);
    const result = event.result as Record<string, any> | undefined;
    taskId =
      taskId ??
      result?.task?.id ??
      result?.statusUpdate?.taskId ??
      result?.artifactUpdate?.taskId;
    if (classified.state) finalState = classified.state;
    onEvent(classified);
  }
  return { taskId, finalState };
}

/** Cancel an in-flight task through the official CancelTask operation. */
export async function cancelTask(
  server: A2AServer,
  taskId: string,
  caller: A2ACaller,
): Promise<void> {
  await server.handleRequest(
    {
      jsonrpc: "2.0",
      id: `cancel-${taskId}`,
      method: "CancelTask",
      params: { tenant: "", id: taskId, metadata: {} },
    },
    { caller },
  );
}
