/**
 * types.ts — Shared types for the a2ui-react component library.
 *
 * All A2UI components build on the AG-UI protocol: agents emit STATE_SNAPSHOT
 * and STATE_DELTA events, which are projected onto entity-graph-core via
 * applyAgUiSnapshot / applyAgUiDelta. Components subscribe to the resulting
 * graph state via useSyncExternalStore.
 *
 * MCP tool calling is a PROGRESSIVE ENHANCEMENT — components work without it.
 * Pass an EntityToolProvider to opt-in.
 */

import type { AgUiStateMapping, ApplyAgUiOptions } from "@prometheus-ags/entity-graph-core";

// ── Message model ────────────────────────────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system" | "tool" | "developer" | "reasoning";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  /** ISO-8601 timestamp */
  createdAt: string;
  /** Optional name for multi-agent scenarios */
  name?: string;
  /** Non-null when role === "tool" */
  toolCallId?: string;
  /** Raw tool call requests emitted by the assistant */
  toolCalls?: ToolCall[];
  /** Whether the assistant is still streaming this message */
  streaming?: boolean;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    /** JSON-encoded arguments */
    arguments: string;
  };
}

// ── Stream event model: AG-UI 1.0 ─────────────────────────────────────────

/**
 * The AG-UI 1.0 event types this package consumes, named exactly as
 * `@ag-ui/core` 1.0's `EventType`. Events are typed structurally so this
 * package's declarations do not require the optional `@ag-ui/core` peer; an
 * `@ag-ui/core` event object is assignable to `AgUiEvent`.
 */
export type AgUiEventType =
  | "RUN_STARTED"
  | "RUN_FINISHED"
  | "RUN_ERROR"
  | "STEP_STARTED"
  | "STEP_FINISHED"
  | "TEXT_MESSAGE_START"
  | "TEXT_MESSAGE_CONTENT"
  | "TEXT_MESSAGE_END"
  | "TEXT_MESSAGE_CHUNK"
  | "TOOL_CALL_START"
  | "TOOL_CALL_ARGS"
  | "TOOL_CALL_END"
  | "TOOL_CALL_CHUNK"
  | "TOOL_CALL_RESULT"
  | "REASONING_START"
  | "REASONING_MESSAGE_START"
  | "REASONING_MESSAGE_CONTENT"
  | "REASONING_MESSAGE_END"
  | "REASONING_MESSAGE_CHUNK"
  | "REASONING_END"
  | "REASONING_ENCRYPTED_VALUE"
  | "STATE_SNAPSHOT"
  | "STATE_DELTA"
  | "MESSAGES_SNAPSHOT"
  | "ACTIVITY_SNAPSHOT"
  | "ACTIVITY_DELTA"
  | "CUSTOM"
  | "RAW";

/**
 * One AG-UI 1.0 event. The fields the session reads follow the 1.0 schema:
 * `messageId`, `delta`, `role` (text and reasoning messages); `toolCallId`,
 * `toolCallName`, `parentMessageId`, `delta`, `content` (tool calls and
 * results); `snapshot` / `delta` (state); `messages` (messages snapshot);
 * `threadId`, `runId`, `outcome` (run lifecycle); `message`, `code` (run error).
 * Unknown event types are ignored, as AG-UI 1.0 requires.
 */
export interface AgUiEvent {
  type: AgUiEventType | (string & {});
  [field: string]: unknown;
}

/** @deprecated Use `AgUiEvent`. The pre-5.0 bespoke event names are gone. */
export type StreamEvent = AgUiEvent;
/** @deprecated Use `AgUiEventType`. */
export type StreamEventType = AgUiEventType;

// ── Tool provider (MCP progressive enhancement) ───────────────────────────

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCallRequest {
  toolCallId: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolCallResult {
  toolCallId: string;
  result: unknown;
  error?: string;
}

/**
 * EntityToolProvider — pluggable tool execution layer.
 * Pass an implementation to enable MCP/function-calling.
 * When omitted, tool calls are surfaced as pending in the UI but not executed.
 */
export interface EntityToolProvider {
  /** Return the tools available to the agent */
  getTools(): Promise<ToolDefinition[]> | ToolDefinition[];
  /** Execute a single tool call */
  executeTool(request: ToolCallRequest): Promise<ToolCallResult>;
}

// ── Chat session ─────────────────────────────────────────────────────────────

/** Where the current AG-UI run is. */
export type ChatRunStatus = "idle" | "running" | "finished" | "error" | "interrupted" | "cancelled";

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  /** AG-UI state mappings for entity projection */
  mappings?: AgUiStateMapping[];
  /** The current or last run's status. */
  runStatus: ChatRunStatus;
  /** The current or last run's id (`RUN_STARTED.runId`). */
  runId?: string;
}

// ── Diff model (for EntityDiff / EntityApproval) ──────────────────────────

export type DiffOperation = "add" | "remove" | "replace" | "unchanged";

export interface FieldDiff {
  field: string;
  op: DiffOperation;
  before: unknown;
  after: unknown;
}

export interface EntityDiffResult {
  entityType: string;
  entityId: string;
  fields: FieldDiff[];
  snapshotSeq?: number;
}

// ── Approval ─────────────────────────────────────────────────────────────────

export type ApprovalStatus = "pending" | "approved" | "rejected";

export interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  proposedChanges: Record<string, unknown>;
  status: ApprovalStatus;
  requestedAt: string;
  resolvedAt?: string;
}

// ── Stream output handler used by EntityChat/EntityCopilot ────────────────

export type SendMessageFn = (
  content: string,
  opts?: { sessionId?: string }
) => Promise<void>;

// ── Re-export core types consumed by components ───────────────────────────

export type { AgUiStateMapping, ApplyAgUiOptions };
