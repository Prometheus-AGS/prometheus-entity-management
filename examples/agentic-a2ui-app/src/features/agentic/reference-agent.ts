import {
  AgentEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from "@a2a-js/sdk/server";
import {
  PROMETHEUS_A2UI_EXTENSION_URI,
  Role,
  TaskState,
  createA2UIArtifact,
  type Message,
  type Part,
  type Task,
} from "@prometheus-ags/entity-graph-a2a";
import { createMalformedSurface, createTaskReviewSurface } from "./reference-surfaces";
import { DEMO_FIXED_TIME, type AgentScenario } from "./types";

function textPart(text: string): Part {
  return {
    content: { $case: "text", value: text },
    mediaType: "text/plain",
    filename: "",
    metadata: {},
  };
}

function agentMessage(
  requestContext: RequestContext,
  messageId: string,
  text: string,
): Message {
  return {
    role: Role.ROLE_AGENT,
    messageId,
    taskId: requestContext.taskId,
    contextId: requestContext.contextId,
    parts: [textPart(text)],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  };
}

function initialTask(requestContext: RequestContext): Task {
  return requestContext.task ?? {
    id: requestContext.taskId,
    contextId: requestContext.contextId,
    status: {
      state: TaskState.TASK_STATE_SUBMITTED,
      timestamp: DEMO_FIXED_TIME,
      message: undefined,
    },
    artifacts: [],
    history: [requestContext.userMessage],
    metadata: requestContext.userMessage.metadata,
  };
}

function scenarioFrom(requestContext: RequestContext): AgentScenario {
  const prompt = requestContext.userMessage.parts
    .filter((part) => part.content?.$case === "text")
    .map((part) => (part.content?.$case === "text" ? part.content.value : ""))
    .join(" ");
  if (prompt.includes("scenario:malformed")) return "malformed";
  if (prompt.includes("scenario:cancelled")) return "cancelled";
  return "happy";
}

export class SharedDomainReferenceAgent implements AgentExecutor {
  private readonly cancelledTaskIds = new Set<string>();
  private nextId = 0;

  async cancelTask(taskId: string): Promise<void> {
    this.cancelledTaskIds.add(taskId);
  }

  async execute(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
  ): Promise<void> {
    const { taskId, contextId } = requestContext;
    const scenario = scenarioFrom(requestContext);
    requestContext.context.addActivatedExtension(PROMETHEUS_A2UI_EXTENSION_URI);

    eventBus.publish(AgentEvent.task(initialTask(requestContext)));
    eventBus.publish(
      AgentEvent.statusUpdate({
        taskId,
        contextId,
        status: {
          state: TaskState.TASK_STATE_WORKING,
          timestamp: DEMO_FIXED_TIME,
          message: agentMessage(
            requestContext,
            this.id("working"),
            "Building an application-authorized task review surface.",
          ),
        },
        metadata: {},
      }),
    );

    const delayMs = scenario === "cancelled" ? 2_500 : 180;
    await new Promise<void>((resolve) => globalThis.setTimeout(resolve, delayMs));

    if (this.cancelledTaskIds.has(taskId)) {
      this.publishTerminal(
        requestContext,
        eventBus,
        TaskState.TASK_STATE_CANCELED,
        "The caller cancelled the task before artifact delivery.",
      );
      this.cancelledTaskIds.delete(taskId);
      return;
    }

    const messages =
      scenario === "malformed" ? createMalformedSurface() : createTaskReviewSurface();
    eventBus.publish(
      AgentEvent.artifactUpdate({
        taskId,
        contextId,
        artifact: createA2UIArtifact(messages, {
          artifactId: this.id("artifact"),
          name: "Shared-domain task review",
          description: "Deterministic official A2UI messages for the shared task domain.",
        }),
        append: false,
        lastChunk: true,
        metadata: {},
      }),
    );
    this.publishTerminal(
      requestContext,
      eventBus,
      TaskState.TASK_STATE_COMPLETED,
    );
    this.cancelledTaskIds.delete(taskId);
  }

  private id(kind: string): string {
    this.nextId += 1;
    return `reference-${kind}-${this.nextId}`;
  }

  private publishTerminal(
    requestContext: RequestContext,
    eventBus: ExecutionEventBus,
    state: TaskState,
    text?: string,
  ): void {
    eventBus.publish(
      AgentEvent.statusUpdate({
        taskId: requestContext.taskId,
        contextId: requestContext.contextId,
        status: {
          state,
          timestamp: DEMO_FIXED_TIME,
          message: text
            ? agentMessage(requestContext, this.id("terminal"), text)
            : undefined,
        },
        metadata: {},
      }),
    );
  }
}
