import {
  Role,
  TaskState,
  type Artifact,
  type Message,
  type Part,
  type Task,
} from "@a2a-js/sdk";
import {
  AgentEvent,
  type AgentExecutor,
  type ExecutionEventBus,
  type RequestContext,
} from "@a2a-js/sdk/server";
import {
  createGraphTransaction,
  graphStore,
  type GraphState,
} from "@prometheus-ags/entity-graph-core";
import {
  createA2UIArtifact,
  createDeterministicA2UIMessages,
} from "./a2ui-artifact.js";
import { createDefaultDenyA2APolicy } from "./policy.js";
import {
  PROMETHEUS_A2UI_EXTENSION_URI,
  PROMETHEUS_GRAPH_EXTENSION_URI,
  type A2AApplicationPolicy,
  type A2ACaller,
  type A2AGraphPolicyContext,
  type DeterministicExecutorOptions,
  type EntityGraphA2ARequest,
  type EntityGraphMutationResult,
  type EntityGraphQueryResult,
  type GraphMutation,
  type GraphQueryRequest,
} from "./types.js";

export const A2A_CALLER_STATE_KEY = "prometheus.a2a.caller";

class GraphRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraphRequestError";
  }
}

class GraphPolicyDeniedError extends Error {
  constructor() {
    super("The requested graph operation is not accessible.");
    this.name = "GraphPolicyDeniedError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  value: unknown,
  path: string,
  options: { allowEmpty?: boolean } = {},
): string {
  if (typeof value !== "string" || (!options.allowEmpty && value.length === 0)) {
    throw new GraphRequestError(`${path} must be a non-empty string.`);
  }
  return value;
}

function parseMutation(value: unknown, index: number): GraphMutation {
  if (!isRecord(value)) {
    throw new GraphRequestError(`mutations[${index}] must be an object.`);
  }
  const op = requireString(value.op, `mutations[${index}].op`);
  const entityType = requireString(value.entityType, `mutations[${index}].entityType`);
  const id = requireString(value.id, `mutations[${index}].id`);

  switch (op) {
    case "upsert":
    case "replace":
      if (!isRecord(value.data)) {
        throw new GraphRequestError(`mutations[${index}].data must be an object.`);
      }
      return { op, entityType, id, data: value.data };
    case "patch":
      if (!isRecord(value.patch)) {
        throw new GraphRequestError(`mutations[${index}].patch must be an object.`);
      }
      return { op, entityType, id, patch: value.patch };
    case "remove":
    case "clearPatch":
      return { op, entityType, id };
    default:
      throw new GraphRequestError(`Unsupported graph mutation: ${op}.`);
  }
}

function parseEntityGraphRequest(value: unknown): EntityGraphA2ARequest | null {
  if (!isRecord(value) || value.kind !== "prometheus.entity-graph.request") {
    return null;
  }
  if (value.version !== "1.0") {
    throw new GraphRequestError("Entity graph request version must be 1.0.");
  }
  const operation = requireString(value.operation, "operation");
  switch (operation) {
    case "mutate": {
      if (!Array.isArray(value.mutations) || value.mutations.length === 0) {
        throw new GraphRequestError("mutations must be a non-empty array.");
      }
      return {
        kind: "prometheus.entity-graph.request",
        version: "1.0",
        operation,
        mutations: value.mutations.map(parseMutation),
      };
    }
    case "query": {
      const limit = value.limit;
      if (
        limit !== undefined &&
        (!Number.isInteger(limit) || (limit as number) < 1 || (limit as number) > 1000)
      ) {
        throw new GraphRequestError("limit must be an integer from 1 through 1000.");
      }
      return {
        kind: "prometheus.entity-graph.request",
        version: "1.0",
        operation,
        entityType: requireString(value.entityType, "entityType"),
        ...(value.id === undefined ? {} : { id: requireString(value.id, "id") }),
        ...(value.listKey === undefined
          ? {}
          : { listKey: requireString(value.listKey, "listKey") }),
        ...(limit === undefined ? {} : { limit: limit as number }),
      };
    }
    case "snapshot": {
      if (
        value.entityTypes !== undefined &&
        (!Array.isArray(value.entityTypes) ||
          value.entityTypes.some((item) => typeof item !== "string" || item.length === 0))
      ) {
        throw new GraphRequestError("entityTypes must be an array of non-empty strings.");
      }
      return {
        kind: "prometheus.entity-graph.request",
        version: "1.0",
        operation,
        ...(value.entityTypes === undefined
          ? {}
          : { entityTypes: value.entityTypes as string[] }),
      };
    }
    default:
      throw new GraphRequestError(`Unsupported entity graph operation: ${operation}.`);
  }
}

function extractEntityGraphRequests(message: Message): EntityGraphA2ARequest[] {
  const requests: EntityGraphA2ARequest[] = [];
  for (const part of message.parts) {
    if (part.content?.$case !== "data") continue;
    const request = parseEntityGraphRequest(part.content.value);
    if (!request) continue;
    if (!message.extensions.includes(PROMETHEUS_GRAPH_EXTENSION_URI)) {
      throw new GraphRequestError(
        `Entity graph messages must declare ${PROMETHEUS_GRAPH_EXTENSION_URI}.`,
      );
    }
    requests.push(request);
  }
  return requests;
}

function callerFrom(requestContext: RequestContext): A2ACaller {
  const stored = requestContext.context.state.get(A2A_CALLER_STATE_KEY);
  if (isRecord(stored) && typeof stored.id === "string") {
    return stored as unknown as A2ACaller;
  }
  return {
    id: requestContext.context.user?.userName || "anonymous",
    isAuthenticated: requestContext.context.user?.isAuthenticated ?? false,
    scopes: [],
  };
}

function fieldsForMutation(mutation: GraphMutation): string[] {
  if (mutation.op === "upsert" || mutation.op === "replace") {
    return Object.keys(mutation.data);
  }
  if (mutation.op === "patch") return Object.keys(mutation.patch);
  return [];
}

async function authorizeGraphRequests(
  requests: readonly EntityGraphA2ARequest[],
  message: Message,
  caller: A2ACaller,
  tenantId: string | undefined,
  policy: A2AApplicationPolicy,
): Promise<void> {
  const contexts: A2AGraphPolicyContext[] = [];
  for (const request of requests) {
    if (request.operation === "mutate") {
      for (const mutation of request.mutations) {
        contexts.push({
          caller,
          tenantId,
          operation: mutation.op,
          entityType: mutation.entityType,
          entityId: mutation.id,
          fields: fieldsForMutation(mutation),
          message,
        });
      }
    } else if (request.operation === "query") {
      contexts.push({
        caller,
        tenantId,
        operation: "query",
        entityType: request.entityType,
        entityId: request.id,
        fields: [],
        message,
      });
    } else {
      for (const entityType of request.entityTypes ?? [undefined]) {
        contexts.push({
          caller,
          tenantId,
          operation: "snapshot",
          entityType,
          fields: [],
          message,
        });
      }
    }
  }

  for (const context of contexts) {
    const decision = await policy.authorizeGraphOperation(context);
    if (!decision.allowed) throw new GraphPolicyDeniedError();
    if (context.operation === "replace" || context.operation === "remove") {
      const approval = await policy.requestApproval?.(context);
      if (!approval?.allowed) throw new GraphPolicyDeniedError();
    }
  }
}

function applyMutation(
  transaction: ReturnType<typeof createGraphTransaction>,
  mutation: GraphMutation,
): void {
  switch (mutation.op) {
    case "upsert":
      transaction.upsertEntity(mutation.entityType, mutation.id, mutation.data);
      return;
    case "replace":
      transaction.replaceEntity(mutation.entityType, mutation.id, mutation.data);
      return;
    case "remove":
      transaction.removeEntity(mutation.entityType, mutation.id);
      return;
    case "patch":
      transaction.patchEntity(mutation.entityType, mutation.id, mutation.patch);
      return;
    case "clearPatch":
      transaction.clearPatch(mutation.entityType, mutation.id);
      return;
  }
}

function resolveGraphQuery(request: GraphQueryRequest, state: GraphState): EntityGraphQueryResult {
  const bucket = state.entities[request.entityType] ?? {};
  if (request.id) {
    const entity = state.readEntity<Record<string, unknown>>(request.entityType, request.id);
    return {
      kind: "prometheus.entity-graph.result",
      version: "1.0",
      operation: "query",
      entities: entity ? [entity] : [],
      total: entity ? 1 : 0,
    };
  }

  const ids = request.listKey
    ? (state.lists[request.listKey]?.ids ?? [])
    : Object.keys(bucket);
  const selected = request.limit ? ids.slice(0, request.limit) : ids;
  const entities = selected
    .map((id) => state.readEntity<Record<string, unknown>>(request.entityType, id))
    .filter((entity): entity is Record<string, unknown> => entity !== null);
  return {
    kind: "prometheus.entity-graph.result",
    version: "1.0",
    operation: "query",
    entities,
    total: request.listKey
      ? (state.lists[request.listKey]?.total ?? entities.length)
      : Object.keys(bucket).length,
  };
}

function resolveGraphSnapshot(
  entityTypes: readonly string[] | undefined,
  state: GraphState,
): EntityGraphQueryResult {
  const result: Record<string, Record<string, unknown>> = {};
  for (const entityType of entityTypes ?? Object.keys(state.entities)) {
    const entities: Record<string, unknown> = {};
    for (const id of Object.keys(state.entities[entityType] ?? {})) {
      const entity = state.readEntity<Record<string, unknown>>(entityType, id);
      if (entity) entities[id] = entity;
    }
    result[entityType] = entities;
  }
  return {
    kind: "prometheus.entity-graph.result",
    version: "1.0",
    operation: "snapshot",
    entities: result,
    total: Object.values(result).reduce(
      (total, bucket) => total + Object.keys(bucket).length,
      0,
    ),
  };
}

function processGraphRequests(
  requests: readonly EntityGraphA2ARequest[],
): Array<EntityGraphMutationResult | EntityGraphQueryResult> {
  const results: Array<EntityGraphMutationResult | EntityGraphQueryResult> = [];
  const mutations = requests.flatMap((request) =>
    request.operation === "mutate" ? request.mutations : [],
  );
  if (mutations.length > 0) {
    const transaction = createGraphTransaction();
    try {
      for (const mutation of mutations) applyMutation(transaction, mutation);
      transaction.commit();
    } catch (error) {
      transaction.rollback();
      throw error;
    }
  }

  for (const request of requests) {
    if (request.operation === "mutate") {
      results.push({
        kind: "prometheus.entity-graph.result",
        version: "1.0",
        operation: "mutate",
        applied: request.mutations.length,
        affectedEntityIds: request.mutations.map(
          (mutation) => `${mutation.entityType}:${mutation.id}`,
        ),
      });
    } else if (request.operation === "query") {
      results.push(resolveGraphQuery(request, graphStore.getState()));
    } else {
      results.push(resolveGraphSnapshot(request.entityTypes, graphStore.getState()));
    }
  }
  return results;
}

function dataArtifact(
  result: EntityGraphMutationResult | EntityGraphQueryResult,
  artifactId: string,
): Artifact {
  return {
    artifactId,
    name: "Prometheus entity graph result",
    description: "Application-authorized result from the canonical normalized graph.",
    parts: [
      {
        content: { $case: "data", value: result },
        mediaType: "application/json",
        filename: "",
        metadata: { extensionUri: PROMETHEUS_GRAPH_EXTENSION_URI },
      },
    ],
    metadata: { extensionUri: PROMETHEUS_GRAPH_EXTENSION_URI },
    extensions: [PROMETHEUS_GRAPH_EXTENSION_URI],
  };
}

function makeTextPart(text: string): Part {
  return {
    content: { $case: "text", value: text },
    mediaType: "text/plain",
    filename: "",
    metadata: {},
  };
}

function makeAgentMessage(
  requestContext: RequestContext,
  messageId: string,
  text: string,
): Message {
  return {
    role: Role.ROLE_AGENT,
    messageId,
    taskId: requestContext.taskId,
    contextId: requestContext.contextId,
    parts: [makeTextPart(text)],
    metadata: {},
    extensions: [],
    referenceTaskIds: [],
  };
}

function initialTask(requestContext: RequestContext, timestamp: string): Task {
  return requestContext.task ?? {
    id: requestContext.taskId,
    contextId: requestContext.contextId,
    status: {
      state: TaskState.TASK_STATE_SUBMITTED,
      timestamp,
      message: undefined,
    },
    artifacts: [],
    history: [requestContext.userMessage],
    metadata: requestContext.userMessage.metadata,
  };
}

/**
 * No-model reference executor for graph and A2UI flows.
 * All graph authorization and destructive approval completes before mutation.
 */
export class DeterministicEntityGraphExecutor implements AgentExecutor {
  private readonly policy: A2AApplicationPolicy;
  private readonly clock: () => string;
  private readonly idFactory: () => string;
  private readonly stepDelayMs: number;
  private readonly cancelledTasks = new Set<string>();
  private fallbackId = 0;

  constructor(options: DeterministicExecutorOptions = {}) {
    this.policy = options.policy ?? createDefaultDenyA2APolicy();
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.idFactory = options.idFactory ?? (() => {
      if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
      this.fallbackId += 1;
      return `prometheus-a2a-${this.fallbackId}`;
    });
    this.stepDelayMs = options.stepDelayMs ?? 0;
  }

  async cancelTask(taskId: string, _eventBus: ExecutionEventBus): Promise<void> {
    this.cancelledTasks.add(taskId);
  }

  async execute(requestContext: RequestContext, eventBus: ExecutionEventBus): Promise<void> {
    const taskId = requestContext.taskId;
    const contextId = requestContext.contextId;
    const timestamp = this.clock();
    for (const extension of [
      PROMETHEUS_GRAPH_EXTENSION_URI,
      PROMETHEUS_A2UI_EXTENSION_URI,
    ]) {
      if (requestContext.context.requestedExtensions?.includes(extension)) {
        requestContext.context.addActivatedExtension(extension);
      }
    }
    eventBus.publish(AgentEvent.task(initialTask(requestContext, timestamp)));
    eventBus.publish(AgentEvent.statusUpdate({
      taskId,
      contextId,
      status: {
        state: TaskState.TASK_STATE_WORKING,
        timestamp: this.clock(),
        message: makeAgentMessage(
          requestContext,
          this.idFactory(),
          "Processing the Prometheus entity request.",
        ),
      },
      metadata: {},
    }));

    try {
      await new Promise<void>((resolve) => setTimeout(resolve, this.stepDelayMs));
      if (this.cancelledTasks.has(taskId)) {
        this.publishTerminalStatus(
          eventBus,
          requestContext,
          TaskState.TASK_STATE_CANCELED,
          "Task cancelled by the caller.",
        );
        return;
      }

      const requests = extractEntityGraphRequests(requestContext.userMessage);
      if (requests.length > 0) {
        if (
          requestContext.context.requestedExtensions?.includes(
            PROMETHEUS_GRAPH_EXTENSION_URI,
          )
        ) {
          requestContext.context.addActivatedExtension(
            PROMETHEUS_GRAPH_EXTENSION_URI,
          );
        }
        await authorizeGraphRequests(
          requests,
          requestContext.userMessage,
          callerFrom(requestContext),
          requestContext.context.tenant || requestContext.request.tenant || undefined,
          this.policy,
        );
        for (const result of processGraphRequests(requests)) {
          eventBus.publish(AgentEvent.artifactUpdate({
            taskId,
            contextId,
            artifact: dataArtifact(result, this.idFactory()),
            append: false,
            lastChunk: true,
            metadata: {},
          }));
        }
      } else if (
        requestContext.context.requestedExtensions?.includes(PROMETHEUS_A2UI_EXTENSION_URI)
      ) {
        requestContext.context.addActivatedExtension(PROMETHEUS_A2UI_EXTENSION_URI);
        const text = requestContext.userMessage.parts
          .filter((part) => part.content?.$case === "text")
          .map((part) =>
            part.content?.$case === "text" ? part.content.value.trim() : "",
          )
          .filter(Boolean)
          .join(" ");
        eventBus.publish(AgentEvent.artifactUpdate({
          taskId,
          contextId,
          artifact: createA2UIArtifact(
            createDeterministicA2UIMessages(
              text || "The deterministic reference agent is ready.",
            ),
            { artifactId: this.idFactory() },
          ),
          append: false,
          lastChunk: true,
          metadata: {},
        }));
      } else {
        eventBus.publish(AgentEvent.artifactUpdate({
          taskId,
          contextId,
          artifact: {
            artifactId: this.idFactory(),
            name: "Prometheus A2A guidance",
            description: "Deterministic guidance for the Prometheus A2A endpoint.",
            parts: [
              makeTextPart(
                "Prometheus A2A v1 is ready. Request the A2UI extension for a deterministic surface or send an authorized entity-graph data request.",
              ),
            ],
            metadata: {},
            extensions: [],
          },
          append: false,
          lastChunk: true,
          metadata: {},
        }));
      }

      this.publishTerminalStatus(
        eventBus,
        requestContext,
        TaskState.TASK_STATE_COMPLETED,
      );
    } catch (error) {
      if (error instanceof GraphPolicyDeniedError) {
        this.publishTerminalStatus(
          eventBus,
          requestContext,
          TaskState.TASK_STATE_REJECTED,
          "The requested operation is not accessible.",
        );
        return;
      }
      throw error;
    } finally {
      this.cancelledTasks.delete(taskId);
    }
  }

  private publishTerminalStatus(
    eventBus: ExecutionEventBus,
    requestContext: RequestContext,
    state: TaskState,
    text?: string,
  ): void {
    eventBus.publish(AgentEvent.statusUpdate({
      taskId: requestContext.taskId,
      contextId: requestContext.contextId,
      status: {
        state,
        timestamp: this.clock(),
        message: text
          ? makeAgentMessage(requestContext, this.idFactory(), text)
          : undefined,
      },
      metadata: {},
    }));
  }
}

export function createDeterministicEntityGraphExecutor(
  options: DeterministicExecutorOptions = {},
): DeterministicEntityGraphExecutor {
  return new DeterministicEntityGraphExecutor(options);
}
