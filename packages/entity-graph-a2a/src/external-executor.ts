import type {
  Artifact,
  Message,
  StreamResponse,
  Task,
  TaskArtifactUpdateEvent,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import {
  ClientFactory,
  DefaultAgentCardResolver,
  JsonRpcTransportFactory,
  type Client,
  type RequestOptions,
} from "@a2a-js/sdk/client";
import {
  AgentEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from "@a2a-js/sdk/server";
import type { ExternalA2AExecutorOptions } from "./types.js";

function remapMessage(
  message: Message,
  taskId: string,
  contextId: string,
  taskBound: boolean,
): Message {
  return {
    ...message,
    taskId: taskBound ? taskId : "",
    contextId,
  };
}

function remapArtifact(artifact: Artifact): Artifact {
  return structuredClone(artifact);
}

function remapTask(task: Task, taskId: string, contextId: string): Task {
  return {
    ...task,
    id: taskId,
    contextId,
    status: task.status
      ? {
          ...task.status,
          message: task.status.message
            ? remapMessage(task.status.message, taskId, contextId, true)
            : undefined,
        }
      : undefined,
    artifacts: task.artifacts.map(remapArtifact),
    history: task.history.map((message) =>
      remapMessage(message, taskId, contextId, true),
    ),
  };
}

/**
 * Optional remote-agent seam. It discovers an official v1 AgentCard, selects
 * JSON-RPC only, and maps remote lifecycle IDs onto the local task boundary.
 */
export class ExternalA2AExecutor implements AgentExecutor {
  private readonly options: ExternalA2AExecutorOptions;
  private clientPromise?: Promise<Client>;
  private readonly remoteTaskIds = new Map<string, string>();

  constructor(options: ExternalA2AExecutorOptions) {
    this.options = options;
    const baseUrl = new URL(options.baseUrl);
    if (baseUrl.protocol !== "https:" && baseUrl.hostname !== "localhost" && baseUrl.hostname !== "127.0.0.1") {
      throw new Error("External A2A endpoints must use HTTPS outside local development.");
    }
  }

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const client = await this.getClient();
    const requestOptions: RequestOptions = {
      serviceParameters: { ...(this.options.serviceParameters ?? {}) },
    };
    const remoteRequest = {
      ...requestContext.request,
      tenant: "",
      message: {
        ...requestContext.userMessage,
        taskId: "",
        contextId: "",
      },
    };

    try {
      for await (const response of client.sendMessageStream(remoteRequest, requestOptions)) {
        this.publishMapped(response, requestContext, eventBus);
      }
    } finally {
      this.remoteTaskIds.delete(requestContext.taskId);
    }
  }

  async cancelTask(taskId: string, _eventBus: ExecutionEventBus): Promise<void> {
    const remoteTaskId = this.remoteTaskIds.get(taskId);
    if (!remoteTaskId) return;
    const client = await this.getClient();
    await client.cancelTask(
      { tenant: "", id: remoteTaskId, metadata: {} },
      { serviceParameters: { ...(this.options.serviceParameters ?? {}) } },
    );
  }

  private getClient(): Promise<Client> {
    this.clientPromise ??= new ClientFactory({
      transports: [new JsonRpcTransportFactory({ fetchImpl: this.options.fetch })],
      preferredTransports: ["JSONRPC"],
      cardResolver: new DefaultAgentCardResolver({
        fetchImpl: this.options.fetch,
      }),
    }).createFromUrl(this.options.baseUrl);
    return this.clientPromise;
  }

  private publishMapped(
    response: StreamResponse,
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): void {
    const payload = response.payload;
    if (!payload) return;
    const localTaskId = requestContext.taskId;
    const localContextId = requestContext.contextId;

    switch (payload.$case) {
      case "message":
        eventBus.publish(AgentEvent.message(
          remapMessage(payload.value, localTaskId, localContextId, false),
        ));
        return;
      case "task":
        this.remoteTaskIds.set(localTaskId, payload.value.id);
        eventBus.publish(AgentEvent.task(
          remapTask(payload.value, localTaskId, localContextId),
        ));
        return;
      case "statusUpdate": {
        this.remoteTaskIds.set(localTaskId, payload.value.taskId);
        const update: TaskStatusUpdateEvent = {
          ...payload.value,
          taskId: localTaskId,
          contextId: localContextId,
          status: payload.value.status
            ? {
                ...payload.value.status,
                message: payload.value.status.message
                  ? remapMessage(
                      payload.value.status.message,
                      localTaskId,
                      localContextId,
                      true,
                    )
                  : undefined,
              }
            : undefined,
        };
        eventBus.publish(AgentEvent.statusUpdate(update));
        return;
      }
      case "artifactUpdate": {
        this.remoteTaskIds.set(localTaskId, payload.value.taskId);
        const update: TaskArtifactUpdateEvent = {
          ...payload.value,
          taskId: localTaskId,
          contextId: localContextId,
          artifact: payload.value.artifact
            ? remapArtifact(payload.value.artifact)
            : undefined,
        };
        eventBus.publish(AgentEvent.artifactUpdate(update));
        return;
      }
    }
  }
}

export function createExternalA2AExecutor(
  options: ExternalA2AExecutorOptions,
): ExternalA2AExecutor {
  return new ExternalA2AExecutor(options);
}
