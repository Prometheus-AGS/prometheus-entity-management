/**
 * AG-UI 1.0 chat, copilot and stream components.
 *
 * These APIs consume AG-UI 1.0 run/message/state events. They are not an
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
export { useChatSession, defaultInterruptToAction } from "../use-chat-session.js";
export { EntityInterruptApproval } from "../entity-interrupt-approval.js";
export type { EntityInterruptApprovalProps } from "../entity-interrupt-approval.js";
export { readInterruptOutcome, toResumeInput } from "../chat/interrupts.js";
export type { ChatInterrupt, ChatResumeEntry } from "../chat/interrupts.js";
export {
  ChatConversationStore,
  CHAT_CONVERSATION_ENTITY,
  CHAT_MESSAGE_ENTITY,
  chatListKey,
} from "../chat/conversation-store.js";
export type {
  ChatConversationSnapshot,
  ChatConversationStoreOptions,
  ChatRun,
  ChatStreamContext,
  ChatStreamFactory,
} from "../chat/conversation-store.js";
export type {
  ChatInterruptDecision,
  UseChatSessionOptions,
  UseChatSessionReturn,
} from "../use-chat-session.js";
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
  AgUiEvent,
  AgUiEventType,
  ChatRunStatus,
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
