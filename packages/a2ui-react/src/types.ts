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

export type MessageRole = "user" | "assistant" | "system" | "tool";

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

// ── Stream event model (subset of AG-UI protocol) ──────────────────────────

export type StreamEventType =
  | "MESSAGE_START"
  | "MESSAGE_DELTA"
  | "MESSAGE_END"
  | "TOOL_CALL_START"
  | "TOOL_CALL_DELTA"
  | "TOOL_CALL_END"
  | "STATE_SNAPSHOT"
  | "STATE_DELTA"
  | "ERROR"
  | "DONE";

export interface StreamEvent {
  type: StreamEventType;
  messageId?: string;
  delta?: string;
  snapshot?: Record<string, unknown>;
  patch?: Array<{ op: string; path: string; value?: unknown }>;
  toolCallId?: string;
  toolName?: string;
  toolArgsDelta?: string;
  error?: string;
}

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

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  isLoading: boolean;
  error: string | null;
  /** AG-UI state mappings for entity projection */
  mappings?: AgUiStateMapping[];
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
