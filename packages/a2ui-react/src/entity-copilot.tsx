/**
 * entity-copilot.tsx — EntityCopilot: a compact "sidebar copilot" variant.
 *
 * Unlike EntityChat (which renders a full chat surface), EntityCopilot is
 * designed to be embedded inline — a floating panel, a slide-over, or an
 * editor drawer. It reuses useChatSession for the same entity-graph projection
 * while providing a narrower component API and a more compact default UI.
 *
 * Layering: Component → useChatSession hook → applyAgUiSnapshot/Delta (store).
 */

import React, { useState, useRef, useEffect, FormEvent, KeyboardEvent } from "react";
import { useChatSession, type UseChatSessionOptions } from "./use-chat-session.js";
import type { ChatMessage } from "./types.js";

export interface EntityCopilotProps extends Omit<UseChatSessionOptions, "streamFactory"> {
  streamFactory: UseChatSessionOptions["streamFactory"];
  /** Title shown at the top of the copilot panel. */
  title?: string;
  /** Placeholder text for the input. */
  placeholder?: string;
  /** Whether the copilot panel is open. Controls visibility via CSS (display). */
  open?: boolean;
  /** Called when the user requests closing (e.g. presses Escape or an X button). */
  onClose?: () => void;
  /** Additional root CSS class. */
  className?: string;
  /** Render override for a single suggestion bubble. */
  renderSuggestion?: (message: ChatMessage, index: number) => React.ReactNode;
  /** Quick-reply prompts shown when the message list is empty. */
  suggestions?: string[];
}

function SuggestionChip({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      className="a2ui-copilot__chip"
      onClick={onClick}
    >
      {label}
    </button>
  );
}

/**
 * EntityCopilot — embedded AI copilot panel that streams agent responses and
 * projects them onto the entity graph.
 *
 * @example
 * ```tsx
 * <EntityCopilot
 *   open={showCopilot}
 *   onClose={() => setShowCopilot(false)}
 *   title="Order Copilot"
 *   streamFactory={(msgs) => agentStream(msgs)}
 *   mappings={[{ entityType: "Order", pointer: "/order", kind: "single" }]}
 *   suggestions={["Summarise this order", "What's the status?"]}
 * />
 * ```
 */
export function EntityCopilot({
  streamFactory,
  mappings,
  toolProvider,
  sessionId,
  onMessage,
  onError,
  title = "AI Copilot",
  placeholder = "Ask anything…",
  open = true,
  onClose,
  className,
  renderSuggestion,
  suggestions = [],
}: EntityCopilotProps): React.ReactElement | null {
  if (!open) return null;

  return (
    <EntityCopilotInner
      streamFactory={streamFactory}
      mappings={mappings}
      toolProvider={toolProvider}
      sessionId={sessionId}
      onMessage={onMessage}
      onError={onError}
      title={title}
      placeholder={placeholder}
      onClose={onClose}
      className={className}
      renderSuggestion={renderSuggestion}
      suggestions={suggestions}
    />
  );
}

// Inner component owns the hook so it only mounts when `open` is true.
function EntityCopilotInner({
  streamFactory,
  mappings,
  toolProvider,
  sessionId,
  onMessage,
  onError,
  title,
  placeholder,
  onClose,
  className,
  renderSuggestion,
  suggestions = [],
}: Omit<EntityCopilotProps, "open"> & Required<Pick<EntityCopilotProps, "title" | "placeholder">>): React.ReactElement {
  const { session, sendMessage } = useChatSession({
    streamFactory,
    mappings,
    toolProvider,
    sessionId,
    onMessage,
    onError,
  });

  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [session.messages]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: Event) => {
      if ((e as unknown as { key: string }).key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  const handleSubmit = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || session.isLoading) return;
    setDraft("");
    await sendMessage(trimmed);
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void handleSubmit(draft);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSubmit(draft);
    }
  };

  const isEmpty = session.messages.length === 0;

  return (
    <aside
      className={["a2ui-copilot", className].filter(Boolean).join(" ")}
      role="complementary"
      aria-label={title}
    >
      <header className="a2ui-copilot__header">
        <span className="a2ui-copilot__title">{title}</span>
        {onClose && (
          <button
            type="button"
            className="a2ui-copilot__close"
            onClick={onClose}
            aria-label="Close copilot"
          >
            ×
          </button>
        )}
      </header>

      <div className="a2ui-copilot__body">
        {isEmpty && suggestions.length > 0 && (
          <div className="a2ui-copilot__suggestions" role="list" aria-label="Suggested prompts">
            {suggestions.map((s, i) => (
              <div role="listitem" key={i}>
                {renderSuggestion ? (
                  renderSuggestion({ id: String(i), role: "user", content: s, createdAt: "" }, i)
                ) : (
                  <SuggestionChip label={s} onClick={() => void handleSubmit(s)} />
                )}
              </div>
            ))}
          </div>
        )}

        <ul className="a2ui-copilot__messages" aria-live="polite" aria-relevant="additions">
          {session.messages.map((msg) => (
            <li
              key={msg.id}
              className={`a2ui-copilot__msg a2ui-copilot__msg--${msg.role}`}
              data-role={msg.role}
            >
              {msg.content}
              {msg.streaming && (
                <span className="a2ui-copilot__cursor" aria-hidden="true">▍</span>
              )}
            </li>
          ))}
          {session.isLoading && !session.messages.some((m) => m.streaming) && (
            <li className="a2ui-copilot__msg a2ui-copilot__msg--typing" aria-live="polite">
              <span className="a2ui-dot" />
              <span className="a2ui-dot" />
              <span className="a2ui-dot" />
            </li>
          )}
        </ul>

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      {session.error && (
        <div className="a2ui-copilot__error" role="alert">
          {session.error}
        </div>
      )}

      <form className="a2ui-copilot__input-row" onSubmit={handleFormSubmit}>
        <textarea
          className="a2ui-copilot__input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={session.isLoading}
          rows={1}
          aria-label="Ask the copilot"
        />
        <button
          type="submit"
          className="a2ui-copilot__send"
          disabled={!draft.trim() || session.isLoading}
          aria-label="Send"
        >
          ↵
        </button>
      </form>
    </aside>
  );
}
