/**
 * types.ts — A2A v1.0 protocol type definitions.
 *
 * Implements the Google A2A (Agent-to-Agent) v1.0 specification:
 * https://github.com/google/A2A
 *
 * Key concepts:
 * - AgentCard: capability advertisement served at /.well-known/agent.json
 * - Task: unit of work sent from a client agent to this server agent
 * - Message / Part: structured content exchanged in a task
 * - Artifact: output produced by a task (file, data, text)
 * - TaskStatus: lifecycle state of a task
 *
 * Entity-graph extensions:
 * - GraphMutationPart: a Part subtype carrying graph mutations
 * - GraphQueryPart: a Part subtype carrying graph queries
 */

// ── AgentCard ─────────────────────────────────────────────────────────────────

/** Authentication scheme required to call this agent. */
export interface AgentAuthScheme {
  /** "bearer" | "apiKey" | "oauth2" | "none" */
  type: string;
  description?: string;
}

/** A single capability exposed by the agent. */
export interface AgentCapability {
  /** Machine-readable skill identifier, e.g. "graph/upsert". */
  name: string;
  description: string;
  /** JSON Schema for the input accepted by this capability. */
  inputSchema?: Record<string, unknown>;
  /** JSON Schema for the output produced by this capability. */
  outputSchema?: Record<string, unknown>;
  tags?: string[];
}

/**
 * AgentCard — the capability manifest served at /.well-known/agent.json.
 * Clients discover and verify agent capabilities via this document.
 */
export interface AgentCard {
  /** Spec version — always "1.0" for A2A v1.0. */
  specVersion: "1.0";
  /** Human-readable agent name. */
  name: string;
  /** Semantic version of this agent implementation. */
  version: string;
  description: string;
  /** Base URL where A2A task requests are accepted (POST /tasks). */
  url: string;
  /** Auth schemes this agent accepts. */
  auth: AgentAuthScheme[];
  /** Declared capabilities/skills. */
  capabilities: AgentCapability[];
  /** Optional provider/org metadata. */
  provider?: {
    organization?: string;
    url?: string;
  };
  /** Optional tags for discoverability. */
  tags?: string[];
}

// ── Parts ──────────────────────────────────────────────────────────────────────

/** Plain text content part. */
export interface TextPart {
  type: "text";
  text: string;
}

/** JSON-structured data part. */
export interface DataPart {
  type: "data";
  data: Record<string, unknown>;
  mimeType?: string;
}

/** File reference part. */
export interface FilePart {
  type: "file";
  /** URI or base64-encoded content. */
  content: string;
  mimeType: string;
  name?: string;
}

/**
 * GraphMutationPart — carries one or more entity graph mutations.
 * The A2A server will apply these to the entity graph via `createGraphTransaction`.
 */
export interface GraphMutationPart {
  type: "graph/mutation";
  mutations: GraphMutation[];
}

/** A single mutation operation on the entity graph. */
export type GraphMutation =
  | { op: "upsert"; entityType: string; id: string; data: Record<string, unknown> }
  | { op: "replace"; entityType: string; id: string; data: Record<string, unknown> }
  | { op: "remove"; entityType: string; id: string }
  | { op: "patch"; entityType: string; id: string; patch: Record<string, unknown> }
  | { op: "clearPatch"; entityType: string; id: string };

/**
 * GraphQueryPart — requests a snapshot read from the entity graph.
 * The handler resolves this and returns the result as an Artifact.
 */
export interface GraphQueryPart {
  type: "graph/query";
  entityType: string;
  /** Entity id for single-entity lookup; omit for list lookup. */
  id?: string;
  /** QueryKey for list lookup. */
  listKey?: string;
  /** Limit number of results. */
  limit?: number;
}

/** Union of all recognized Part types. */
export type Part = TextPart | DataPart | FilePart | GraphMutationPart | GraphQueryPart;

// ── Message ────────────────────────────────────────────────────────────────────

/** Role of the message author. */
export type MessageRole = "user" | "agent";

/**
 * Message — a single turn in a task's conversation.
 */
export interface Message {
  role: MessageRole;
  parts: Part[];
  /** ISO-8601 timestamp. Populated by the server on received messages. */
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

// ── Artifact ──────────────────────────────────────────────────────────────────

/** Type of artifact output. */
export type ArtifactType = "text" | "data" | "file" | "graph-snapshot";

/**
 * Artifact — a concrete output produced by a completed task.
 */
export interface Artifact {
  /** Stable identifier for this artifact within the task. */
  id: string;
  type: ArtifactType;
  /** Human-readable name. */
  name?: string;
  description?: string;
  /** Artifact payload. */
  content: unknown;
  mimeType?: string;
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  metadata?: Record<string, unknown>;
}

// ── Task ──────────────────────────────────────────────────────────────────────

/** Lifecycle states for a task. */
export type TaskState =
  | "submitted"
  | "working"
  | "input-required"
  | "completed"
  | "failed"
  | "canceled";

/** TaskStatus carries the current state plus optional error info. */
export interface TaskStatus {
  state: TaskState;
  message?: string;
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string;
}

/**
 * Task — the primary unit of work in A2A.
 * Clients POST a SendTaskRequest which creates or updates a Task.
 */
export interface Task {
  /** Unique task identifier (UUID). */
  id: string;
  /** Optional client-assigned session id for grouping related tasks. */
  sessionId?: string;
  status: TaskStatus;
  /** Ordered list of messages exchanged for this task. */
  history: Message[];
  /** Artifacts produced by the task (populated on completion). */
  artifacts: Artifact[];
  /** ISO-8601 creation timestamp. */
  createdAt: string;
  /** ISO-8601 last-updated timestamp. */
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

// ── JSON-RPC envelopes ─────────────────────────────────────────────────────────

/** A2A task send request params. */
export interface SendTaskParams {
  /** Task id (client-generated UUID or server-assigned). */
  id: string;
  /** Optional session scope. */
  sessionId?: string;
  /** The message to send (first message creates the task). */
  message: Message;
  metadata?: Record<string, unknown>;
}

/** A2A task send result. */
export interface SendTaskResult {
  task: Task;
}

/** A2A task get request params. */
export interface GetTaskParams {
  id: string;
  /** Number of most-recent history messages to return. */
  historyLength?: number;
}

/** A2A task cancel params. */
export interface CancelTaskParams {
  id: string;
}

/** Recognized A2A JSON-RPC method names. */
export type A2AMethod =
  | "tasks/send"
  | "tasks/get"
  | "tasks/cancel"
  | "tasks/sendSubscribe";

/** JSON-RPC 2.0 request envelope. */
export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: A2AMethod;
  params: unknown;
}

/** JSON-RPC 2.0 success response. */
export interface JsonRpcSuccess<T = unknown> {
  jsonrpc: "2.0";
  id: string | number | null;
  result: T;
}

/** JSON-RPC 2.0 error response. */
export interface JsonRpcError {
  jsonrpc: "2.0";
  id: string | number | null;
  error: {
    code: number;
    message: string;
    data?: unknown;
  };
}

export type JsonRpcResponse<T = unknown> = JsonRpcSuccess<T> | JsonRpcError;

// ── Handler interface ─────────────────────────────────────────────────────────

/**
 * A2A task handler — implement this to route task messages to graph operations.
 */
export interface A2ATaskHandler {
  /**
   * Process an incoming task message and return updated task state + artifacts.
   *
   * The handler receives the full task context and must return:
   * - `status`: the new task status
   * - `artifacts`: any artifacts produced
   * - Optionally `reply`: an agent reply message to append to history
   */
  handle(ctx: TaskHandlerContext): Promise<TaskHandlerResult>;
}

/** Context provided to a task handler. */
export interface TaskHandlerContext {
  /** The current task (status = "working" when this is called). */
  task: Task;
  /** The most-recently received user/agent message. */
  message: Message;
  /** Convenience: direct access to the entity graph store state. */
  graphState: import("@prometheus-ags/entity-graph-core").GraphState;
}

/** Result that a task handler must return. */
export interface TaskHandlerResult {
  status: Pick<TaskStatus, "state" | "message">;
  artifacts?: Artifact[];
  /** Optional reply message to append to task history. */
  reply?: Omit<Message, "timestamp">;
}

// ── Server options ────────────────────────────────────────────────────────────

/**
 * Options for creating an A2A entity-graph server instance.
 */
export interface A2AServerOptions {
  /** AgentCard metadata — advertised at /.well-known/agent.json. */
  card: AgentCard;
  /** Task handler (routes messages to graph mutations/queries). */
  handler: A2ATaskHandler;
  /**
   * Optional task store factory. Defaults to in-memory store.
   * Provide a persistent store for production deployments.
   */
  store?: A2ATaskStore;
}

/** Storage backend for task persistence. */
export interface A2ATaskStore {
  get(id: string): Promise<Task | null>;
  set(task: Task): Promise<void>;
  delete(id: string): Promise<void>;
}
