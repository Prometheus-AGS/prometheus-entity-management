/**
 * AG-UI compatibility surface for the pre-3.0 alpha package.
 *
 * These APIs consume AG-UI-style run/message/state events. They are not an
 * official A2UI renderer. New imports must use
 * `@prometheus-ags/a2ui-react/ag-ui` explicitly.
 */

export { EntityChat } from "../entity-chat.js";
export type { EntityChatProps, EntityChatClassNames } from "../entity-chat.js";
export { EntityCopilot } from "../entity-copilot.js";
export type { EntityCopilotProps } from "../entity-copilot.js";
export { EntityStream } from "../entity-stream.js";
export type { EntityStreamProps } from "../entity-stream.js";
export { EntityDiff } from "../entity-diff.js";
export type { EntityDiffProps, EntityDiffClassNames } from "../entity-diff.js";
export { EntityApproval } from "../entity-approval.js";
export type { EntityApprovalProps } from "../entity-approval.js";
export { EntityToolProviderContext } from "../entity-tool-provider.js";
export type { EntityToolProviderProps } from "../entity-tool-provider.js";
export { useChatSession } from "../use-chat-session.js";
export type { UseChatSessionOptions, UseChatSessionReturn } from "../use-chat-session.js";
export { useEntityDiff } from "../use-entity-diff.js";
export type { UseEntityDiffOptions, UseEntityDiffReturn } from "../use-entity-diff.js";
export { useEntityToolProvider } from "../entity-tool-provider.js";
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
} from "../types.js";
