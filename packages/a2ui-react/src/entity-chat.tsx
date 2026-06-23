/**
 * entity-chat.tsx — EntityChat: a headless + minimal-shell chat component.
 *
 * Architecture:
 * - Delegates all session management to useChatSession (which calls
 *   applyAgUiSnapshot / applyAgUiDelta — store writes — never directly).
 * - Renders a minimal but intentional chat UI: message list + input form.
 * - All styling is done via className overrides so consumers can bring Tailwind,
 *   CSS modules, or any other styling layer.
 *
 * Layering: Component → useChatSession hook → applyAgUiSnapshot/Delta (store).
 * No direct store access from this file.
 */

import React, {
  useRef,
  useEffect,
  KeyboardEvent,
  useState,
  FormEvent,
} from "react";
import { useChatSession, type UseChatSessionOptions } from "./use-chat-session.js";
import type { ChatMessage } from "./types.js";

export interface EntityChatClassNames {
  root?: string;
  messageList?: string;
  message?: string;
  messageUser?: string;
  messageAssistant?: string;
  messageTool?: string;
  messageSystem?: string;
  messageContent?: string;
  inputRow?: string;
  input?: string;
  sendButton?: string;
  statusBar?: string;
}

export interface EntityChatProps extends Omit<UseChatSessionOptions, "streamFactory"> {
  /** Required: factory producing a stream of StreamEvents for the given messages. */
  streamFactory: UseChatSessionOptions["streamFactory"];
  /** Optional render override for a single message. */
  renderMessage?: (message: ChatMessage) => React.ReactNode;
  /** Optional render override for the typing indicator. */
  renderTypingIndicator?: () => React.ReactNode;
  /** Optional placeholder for the textarea. */
  placeholder?: string;
  /** Class name overrides for each structural slot. */
  classNames?: EntityChatClassNames;
  /** Additional CSS class on the root container. */
  className?: string;
}

function DefaultTypingIndicator(): React.ReactElement {
  return (
    <span aria-label="Assistant is typing" role="status">
      <span className="a2ui-dot" />
      <span className="a2ui-dot" />
      <span className="a2ui-dot" />
    </span>
  );
}

function MessageBubble({
  message,
  classNames = {},
  renderMessage,
}: {
  message: ChatMessage;
  classNames?: EntityChatClassNames;
  renderMessage?: (m: ChatMessage) => React.ReactNode;
}): React.ReactElement {
  if (renderMessage) {
    return <>{renderMessage(message)}</>;
  }

  const roleClass = {
    user: classNames.messageUser ?? "a2ui-msg--user",
    assistant: classNames.messageAssistant ?? "a2ui-msg--assistant",
    tool: classNames.messageTool ?? "a2ui-msg--tool",
    system: classNames.messageSystem ?? "a2ui-msg--system",
  }[message.role] ?? "";

  return (
    <li
      className={[classNames.message ?? "a2ui-msg", roleClass].filter(Boolean).join(" ")}
      data-role={message.role}
      data-message-id={message.id}
    >
      <span className={classNames.messageContent ?? "a2ui-msg__content"}>
        {message.content}
        {message.streaming && (
          <span className="a2ui-msg__cursor" aria-hidden="true">▍</span>
        )}
      </span>
    </li>
  );
}

/**
 * EntityChat — a full-page or embedded chat UI backed by entity-graph.
 *
 * @example
 * ```tsx
 * <EntityChat
 *   streamFactory={(messages) => myAgentStream(messages)}
 *   mappings={[{ entityType: "Order", pointer: "/order", kind: "single" }]}
 *   toolProvider={myMcpProvider}
 * />
 * ```
 */
export function EntityChat({
  streamFactory,
  mappings,
  toolProvider,
  sessionId,
  onMessage,
  onError,
  renderMessage,
  renderTypingIndicator,
  placeholder = "Type a message…",
  classNames = {},
  className,
}: EntityChatProps): React.ReactElement {
  const { session, sendMessage } = useChatSession({
    streamFactory,
    mappings,
    toolProvider,
    sessionId,
    onMessage,
    onError,
  });

  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLOListElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    const el = listRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [session.messages]);

  const handleSubmit = async (e?: FormEvent) => {
    e?.preventDefault();
    const text = draft.trim();
    if (!text || session.isLoading) return;
    setDraft("");
    await sendMessage(text);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit();
    }
  };

  return (
    <section
      className={[classNames.root ?? "a2ui-chat", className].filter(Boolean).join(" ")}
      aria-label="Entity chat"
    >
      <ol
        ref={listRef}
        className={classNames.messageList ?? "a2ui-chat__messages"}
        aria-live="polite"
        aria-relevant="additions"
      >
        {session.messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            classNames={classNames}
            renderMessage={renderMessage}
          />
        ))}
        {session.isLoading && !session.messages.some((m) => m.streaming) && (
          <li aria-live="polite" className="a2ui-msg a2ui-msg--typing">
            {renderTypingIndicator ? renderTypingIndicator() : <DefaultTypingIndicator />}
          </li>
        )}
      </ol>

      {session.error && (
        <div
          className={classNames.statusBar ?? "a2ui-chat__status-bar a2ui-chat__status-bar--error"}
          role="alert"
        >
          {session.error}
        </div>
      )}

      <form
        className={classNames.inputRow ?? "a2ui-chat__input-row"}
        onSubmit={(e) => void handleSubmit(e)}
        aria-label="Send a message"
      >
        <textarea
          className={classNames.input ?? "a2ui-chat__input"}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={session.isLoading}
          rows={1}
          aria-label="Message input"
        />
        <button
          type="submit"
          className={classNames.sendButton ?? "a2ui-chat__send"}
          disabled={!draft.trim() || session.isLoading}
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </section>
  );
}
