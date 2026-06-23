/**
 * entity-stream.tsx — EntityStream: renders a live stream of agent events.
 *
 * EntityStream is the lowest-level primitive: it accepts an AsyncIterable of
 * StreamEvents and renders the raw token stream as it arrives. It is useful for
 * non-chat contexts — inline LLM completions, "generating..." surfaces, etc.
 *
 * STATE_SNAPSHOT / STATE_DELTA events are still projected into the entity graph
 * just as in EntityChat/EntityCopilot.
 *
 * Layering: Component → stores via applyAgUiSnapshot/Delta directly (no
 * intermediate hook because the component IS the hook surface here — it owns
 * stream consumption). Entity graph writes go through the core module.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  applyAgUiSnapshot,
  applyAgUiDelta,
} from "@prometheus-ags/entity-graph-core";
import type { StreamEvent, AgUiStateMapping } from "./types.js";

export interface EntityStreamProps {
  /** The live event stream to consume. Changing this prop replaces the stream. */
  stream: AsyncIterable<StreamEvent> | null | undefined;
  /** AG-UI mappings so STATE_* events project onto the entity graph. */
  mappings?: AgUiStateMapping[];
  /** Called with each token delta as it arrives. */
  onDelta?: (token: string) => void;
  /** Called with the fully accumulated text when the stream ends. */
  onComplete?: (text: string) => void;
  /** Called on stream error. */
  onError?: (error: Error) => void;
  /** CSS class on the root element. */
  className?: string;
  /** Render override for the accumulated content. */
  renderContent?: (text: string, streaming: boolean) => React.ReactNode;
  /** Placeholder shown before the first token arrives. */
  placeholder?: React.ReactNode;
}

/**
 * EntityStream — consumes a live async-iterable of StreamEvents and renders
 * the accumulating text in real time.
 *
 * @example
 * ```tsx
 * <EntityStream
 *   stream={myAgentStream}
 *   mappings={[{ entityType: "Draft", pointer: "/draft", kind: "single" }]}
 *   onComplete={(text) => setGeneratedText(text)}
 * />
 * ```
 */
export function EntityStream({
  stream,
  mappings = [],
  onDelta,
  onComplete,
  onError,
  className,
  renderContent,
  placeholder,
}: EntityStreamProps): React.ReactElement {
  const [content, setContent] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useRef("");
  const onDeltaRef = useRef(onDelta);
  const onCompleteRef = useRef(onComplete);
  const onErrorRef = useRef(onError);
  onDeltaRef.current = onDelta;
  onCompleteRef.current = onComplete;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!stream) return;

    let cancelled = false;
    contentRef.current = "";
    setContent("");
    setError(null);
    setStreaming(true);

    const agentState: Record<string, unknown> = {};

    void (async () => {
      try {
        for await (const event of stream) {
          if (cancelled) break;

          switch (event.type) {
            case "MESSAGE_DELTA":
            case "TOOL_CALL_DELTA": {
              const token = event.delta ?? event.toolArgsDelta ?? "";
              if (token) {
                contentRef.current += token;
                setContent(contentRef.current);
                onDeltaRef.current?.(token);
              }
              break;
            }

            case "STATE_SNAPSHOT": {
              if (!event.snapshot) break;
              applyAgUiSnapshot(
                { type: "STATE_SNAPSHOT", snapshot: event.snapshot },
                { mappings }
              );
              Object.assign(agentState, event.snapshot);
              break;
            }

            case "STATE_DELTA": {
              if (!event.patch) break;
              applyAgUiDelta(
                {
                  type: "STATE_DELTA",
                  delta: event.patch as Parameters<typeof applyAgUiDelta>[0]["delta"],
                },
                { mappings },
                Object.keys(agentState).length > 0 ? agentState : undefined
              );
              break;
            }

            case "ERROR": {
              const msg = event.error ?? "Stream error";
              setError(msg);
              onErrorRef.current?.(new Error(msg));
              break;
            }

            case "DONE":
            case "MESSAGE_END":
              break;

            default:
              break;
          }
        }
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          setError(msg);
          onErrorRef.current?.(err instanceof Error ? err : new Error(msg));
        }
      } finally {
        if (!cancelled) {
          setStreaming(false);
          onCompleteRef.current?.(contentRef.current);
        }
      }
    })();

    return () => {
      cancelled = true;
      setStreaming(false);
    };
    // mappings is intentionally excluded from deps — it's configuration that
    // shouldn't restart the stream when it changes mid-flight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream]);

  if (error) {
    return (
      <div className={["a2ui-stream a2ui-stream--error", className].filter(Boolean).join(" ")} role="alert">
        {error}
      </div>
    );
  }

  const isEmpty = !content && !streaming;

  return (
    <div
      className={["a2ui-stream", streaming ? "a2ui-stream--streaming" : "", className].filter(Boolean).join(" ")}
      aria-live="polite"
      aria-atomic="false"
    >
      {isEmpty && placeholder ? (
        placeholder
      ) : renderContent ? (
        renderContent(content, streaming)
      ) : (
        <>
          {content}
          {streaming && <span className="a2ui-stream__cursor" aria-hidden="true">▍</span>}
        </>
      )}
    </div>
  );
}
