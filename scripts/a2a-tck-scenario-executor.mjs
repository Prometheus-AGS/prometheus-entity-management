import { createRequire } from "node:module";
import { resolve } from "node:path";

const requireFromPackage = createRequire(
  resolve(import.meta.dirname, "../packages/entity-graph-a2a/package.json"),
);
const { Role, TaskState } = requireFromPackage("@a2a-js/sdk");
const { AgentEvent } = requireFromPackage("@a2a-js/sdk/server");

const FIXED_TIME = "2026-08-01T00:00:00.000Z";

function textPart(text) {
  return {
    content: { $case: "text", value: text },
    mediaType: "text/plain",
    filename: "",
    metadata: {},
  };
}

function rawPart() {
  return {
    content: { $case: "raw", value: new TextEncoder().encode("tck") },
    mediaType: "text/plain",
    filename: "output.txt",
    metadata: {},
  };
}

function urlPart() {
  return {
    content: { $case: "url", value: "https://example.com/output.txt" },
    mediaType: "text/plain",
    filename: "output.txt",
    metadata: {},
  };
}

function dataPart() {
  return {
    content: { $case: "data", value: { key: "value", count: 42 } },
    mediaType: "application/json",
    filename: "",
    metadata: {},
  };
}

export class A2ATckScenarioExecutor {
  #sequence = 0;
  #contexts = new Map();

  #id(prefix) {
    this.#sequence += 1;
    return `${prefix}-${this.#sequence}`;
  }

  #message(context, text, taskBound = true) {
    return {
      role: Role.ROLE_AGENT,
      messageId: this.#id("tck-agent-message"),
      taskId: taskBound ? context.taskId : "",
      contextId: context.contextId,
      parts: [textPart(text)],
      metadata: {},
      extensions: [],
      referenceTaskIds: [],
    };
  }

  #task(context) {
    return context.task ?? {
      id: context.taskId,
      contextId: context.contextId,
      status: {
        state: TaskState.TASK_STATE_SUBMITTED,
        timestamp: FIXED_TIME,
        message: undefined,
      },
      artifacts: [],
      history: [context.userMessage],
      metadata: {},
    };
  }

  #status(context, state, text) {
    return AgentEvent.statusUpdate({
      taskId: context.taskId,
      contextId: context.contextId,
      status: {
        state,
        timestamp: FIXED_TIME,
        message: text ? this.#message(context, text) : undefined,
      },
      metadata: {},
    });
  }

  #artifact(context, parts, options = {}) {
    return AgentEvent.artifactUpdate({
      taskId: context.taskId,
      contextId: context.contextId,
      artifact: {
        artifactId: options.artifactId ?? this.#id("tck-artifact"),
        name: "TCK scenario artifact",
        description: "Artifact emitted by the pinned TCK scenario fixture.",
        parts,
        metadata: {},
        extensions: [],
      },
      append: options.append ?? false,
      lastChunk: options.lastChunk ?? true,
      metadata: {},
    });
  }

  async execute(context, eventBus) {
    const prefix = context.userMessage.messageId;
    this.#contexts.set(context.taskId, context.contextId);

    if (prefix.startsWith("tck-message-response")) {
      eventBus.publish(AgentEvent.message(this.#message(context, "Direct message response", false)));
      this.#contexts.delete(context.taskId);
      return;
    }

    eventBus.publish(AgentEvent.task(this.#task(context)));

    if (prefix.startsWith("tck-input-required")) {
      eventBus.publish(
        this.#status(
          context,
          TaskState.TASK_STATE_INPUT_REQUIRED,
          "Additional input is required.",
        ),
      );
      return;
    }

    if (prefix.startsWith("tck-reject-task")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_REJECTED, "rejected"));
      this.#contexts.delete(context.taskId);
      return;
    }

    if (prefix.startsWith("tck-artifact-file-url")) {
      eventBus.publish(this.#artifact(context, [urlPart()]));
    } else if (prefix.startsWith("tck-artifact-file")) {
      eventBus.publish(this.#artifact(context, [rawPart()]));
    } else if (prefix.startsWith("tck-artifact-data")) {
      eventBus.publish(this.#artifact(context, [dataPart()]));
    } else if (prefix.startsWith("tck-artifact-text")) {
      eventBus.publish(this.#artifact(context, [textPart("Generated text content")]));
    } else if (prefix.startsWith("tck-stream-artifact-file")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_WORKING));
      eventBus.publish(this.#artifact(context, [rawPart()]));
    } else if (prefix.startsWith("tck-stream-artifact-chunked")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_WORKING));
      const artifactId = this.#id("tck-chunked-artifact");
      eventBus.publish(
        this.#artifact(context, [textPart("chunk-1 ")], {
          artifactId,
          append: false,
          lastChunk: false,
        }),
      );
      eventBus.publish(
        this.#artifact(context, [textPart("chunk-2")], {
          artifactId,
          append: true,
          lastChunk: true,
        }),
      );
    } else if (prefix.startsWith("tck-stream-artifact-text")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_WORKING));
      eventBus.publish(this.#artifact(context, [textPart("Streamed text content")]));
    } else if (prefix.startsWith("tck-stream-ordering-001")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_WORKING));
      eventBus.publish(this.#artifact(context, [textPart("Ordered output")]));
    } else if (prefix.startsWith("tck-stream-001")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_WORKING));
      eventBus.publish(this.#artifact(context, [textPart("Stream hello from TCK")]));
    } else if (prefix.startsWith("tck-stream-003")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_WORKING));
      eventBus.publish(this.#artifact(context, [textPart("Stream task lifecycle")]));
    } else if (prefix.startsWith("test-resubscribe-message-id")) {
      eventBus.publish(this.#status(context, TaskState.TASK_STATE_WORKING));
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 4_000));
    }

    eventBus.publish(
      this.#status(
        context,
        TaskState.TASK_STATE_COMPLETED,
        prefix.startsWith("tck-complete-task") ? "Hello from TCK" : undefined,
      ),
    );
    this.#contexts.delete(context.taskId);
  }

  async cancelTask(taskId, eventBus) {
    const contextId = this.#contexts.get(taskId);
    if (!contextId) return;
    eventBus.publish(
      AgentEvent.statusUpdate({
        taskId,
        contextId,
        status: {
          state: TaskState.TASK_STATE_CANCELED,
          timestamp: FIXED_TIME,
          message: undefined,
        },
        metadata: {},
      }),
    );
    this.#contexts.delete(taskId);
  }
}
