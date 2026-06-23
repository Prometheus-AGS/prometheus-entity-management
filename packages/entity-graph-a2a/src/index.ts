/**
 * @prometheus-ags/entity-graph-a2a
 *
 * A2A (Agent-to-Agent) v1.0 server for the Prometheus entity graph.
 *
 * Public surface:
 *
 * Server:
 *   createA2AServer(opts)           — factory; returns A2AServer
 *   A2AServer                       — class with handleRequest() + fetch() + getCard()
 *
 * AgentCard:
 *   buildAgentCard(opts)            — build the capability manifest
 *   DEFAULT_CAPABILITIES            — array of built-in graph capabilities
 *
 * Handler:
 *   DefaultEntityGraphHandler       — routes GraphMutationPart / GraphQueryPart to graph
 *
 * Store:
 *   MemoryTaskStore                 — in-memory A2ATaskStore (dev/test)
 *
 * Types (all A2A v1.0 protocol shapes):
 *   AgentCard, AgentCapability, AgentAuthScheme
 *   Task, TaskStatus, TaskState
 *   Message, MessageRole
 *   Part, TextPart, DataPart, FilePart, GraphMutationPart, GraphQueryPart
 *   GraphMutation
 *   Artifact, ArtifactType
 *   SendTaskParams, GetTaskParams, CancelTaskParams
 *   JsonRpcRequest, JsonRpcResponse, JsonRpcSuccess, JsonRpcError
 *   A2ATaskHandler, TaskHandlerContext, TaskHandlerResult
 *   A2AServerOptions, A2ATaskStore
 */

// ── Server ────────────────────────────────────────────────────────────────────
export { createA2AServer, A2AServer } from "./server.js";

// ── AgentCard ─────────────────────────────────────────────────────────────────
export { buildAgentCard, DEFAULT_CAPABILITIES } from "./agent-card.js";
export type { BuildAgentCardOptions } from "./agent-card.js";

// ── Handler ───────────────────────────────────────────────────────────────────
export { DefaultEntityGraphHandler } from "./handler.js";

// ── Store ─────────────────────────────────────────────────────────────────────
export { MemoryTaskStore } from "./store.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  // AgentCard
  AgentCard,
  AgentCapability,
  AgentAuthScheme,
  // Task
  Task,
  TaskStatus,
  TaskState,
  // Message
  Message,
  MessageRole,
  // Parts
  Part,
  TextPart,
  DataPart,
  FilePart,
  GraphMutationPart,
  GraphQueryPart,
  GraphMutation,
  // Artifact
  Artifact,
  ArtifactType,
  // Request params
  SendTaskParams,
  SendTaskResult,
  GetTaskParams,
  CancelTaskParams,
  // JSON-RPC
  A2AMethod,
  JsonRpcRequest,
  JsonRpcResponse,
  JsonRpcSuccess,
  JsonRpcError,
  // Handler
  A2ATaskHandler,
  TaskHandlerContext,
  TaskHandlerResult,
  // Server
  A2AServerOptions,
  A2ATaskStore,
} from "./types.js";
