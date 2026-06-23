/**
 * @prometheus-ags/a2ui-react
 *
 * A2UI React component library — agentic UI components backed by the
 * Prometheus entity graph. Components project AG-UI agent state directly into
 * the entity graph so every view in the app reacts to agent changes.
 *
 * Exports:
 *
 * Components:
 *   EntityChat           — full chat surface with streaming, tool calls, entity projection
 *   EntityCopilot        — compact embedded copilot panel
 *   EntityStream         — raw streaming text renderer with entity projection
 *   EntityDiff           — field-level before/after diff table (reuses time-travel)
 *   EntityApproval       — human-in-the-loop approval gate with auto restore on reject
 *   EntityToolProviderContext — React context provider for MCP / tool execution
 *
 * Hooks:
 *   useChatSession       — core chat session management (drives Chat + Copilot)
 *   useEntityDiff        — imperative diff computation reusing time-travel snapshots
 *   useEntityToolProvider — read the nearest EntityToolProvider from context
 *
 * Types:
 *   ChatMessage, MessageRole, ToolCall, ToolDefinition, ToolCallRequest, ToolCallResult
 *   EntityToolProvider, StreamEvent, StreamEventType, ChatSession, SendMessageFn
 *   FieldDiff, DiffOperation, EntityDiffResult, ApprovalRequest, ApprovalStatus
 *   AgUiStateMapping, ApplyAgUiOptions
 */

// ── Components ────────────────────────────────────────────────────────────────
export { EntityChat } from "./entity-chat.js";
export type { EntityChatProps, EntityChatClassNames } from "./entity-chat.js";

export { EntityCopilot } from "./entity-copilot.js";
export type { EntityCopilotProps } from "./entity-copilot.js";

export { EntityStream } from "./entity-stream.js";
export type { EntityStreamProps } from "./entity-stream.js";

export { EntityDiff } from "./entity-diff.js";
export type { EntityDiffProps, EntityDiffClassNames } from "./entity-diff.js";

export { EntityApproval } from "./entity-approval.js";
export type { EntityApprovalProps } from "./entity-approval.js";

export { EntityToolProviderContext } from "./entity-tool-provider.js";
export type { EntityToolProviderProps } from "./entity-tool-provider.js";

// ── Hooks ─────────────────────────────────────────────────────────────────────
export { useChatSession } from "./use-chat-session.js";
export type { UseChatSessionOptions, UseChatSessionReturn } from "./use-chat-session.js";

export { useEntityDiff } from "./use-entity-diff.js";
export type { UseEntityDiffOptions, UseEntityDiffReturn } from "./use-entity-diff.js";

export { useEntityToolProvider } from "./entity-tool-provider.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  MessageRole,
  ChatMessage,
  ToolCall,
  ToolDefinition,
  ToolCallRequest,
  ToolCallResult,
  EntityToolProvider,
  StreamEvent,
  StreamEventType,
  ChatSession,
  SendMessageFn,
  FieldDiff,
  DiffOperation,
  EntityDiffResult,
  ApprovalRequest,
  ApprovalStatus,
  AgUiStateMapping,
  ApplyAgUiOptions,
} from "./types.js";
