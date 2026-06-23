/**
 * use-chat-session.ts — Core React hook that manages a chat session.
 *
 * Responsibilities:
 * - Maintains local message list (React state, not the entity graph)
 * - Processes incoming StreamEvents: appends / updates messages in place
 * - Ingests STATE_SNAPSHOT / STATE_DELTA events into entity-graph-core via
 *   applyAgUiSnapshot / applyAgUiDelta
 * - Invokes the optional EntityToolProvider when the agent emits tool calls
 *
 * This hook is the shared foundation for EntityChat and EntityCopilot.
 *
 * Hook→Store layering: this hook calls applyAgUiSnapshot / applyAgUiDelta
 * (store writes). It never calls useGraphStore directly — that boundary is
 * maintained in the agent/ module of entity-graph-core.
 */

import { useCallback, useRef, useState } from "react";
import {
  applyAgUiSnapshot,
  applyAgUiDelta,
} from "@prometheus-ags/entity-graph-core";
import type {
  ChatMessage,
  ChatSession,
  EntityToolProvider,
  StreamEvent,
  AgUiStateMapping,
} from "./types.js";

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export interface UseChatSessionOptions {
  /** Unique session id; defaults to a generated id. */
  sessionId?: string;
  /**
   * Factory that returns an async-iterable (or ReadableStream) of StreamEvents
   * given the current messages. The library calls this on every sendMessage().
   */
  streamFactory: (messages: ChatMessage[]) => AsyncIterable<StreamEvent> | ReadableStream<StreamEvent>;
  /** AG-UI state mappings: project agent state onto entity-graph entities. */
  mappings?: AgUiStateMapping[];
  /** Optional tool provider for function-calling / MCP. */
  toolProvider?: EntityToolProvider;
  /** Called when a full assistant message has been received. */
  onMessage?: (message: ChatMessage) => void;
  /** Called on stream error. */
  onError?: (error: Error) => void;
}

export interface UseChatSessionReturn {
  session: ChatSession;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChatSession(opts: UseChatSessionOptions): UseChatSessionReturn {
  const { sessionId, streamFactory, mappings = [], toolProvider, onMessage, onError } = opts;

  const idRef = useRef(sessionId ?? generateId());
  const abortRef = useRef<AbortController | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const appendOrUpdateMessage = useCallback((msg: ChatMessage) => {
    setMessages((prev) => {
      const idx = prev.findIndex((m) => m.id === msg.id);
      if (idx === -1) return [...prev, msg];
      const next = [...prev];
      next[idx] = msg;
      return next;
    });
  }, []);

  const processStream = useCallback(
    async (stream: AsyncIterable<StreamEvent>) => {
      const agentState: Record<string, unknown> = {};
      // Track accumulated tool calls by toolCallId during streaming so we don't
      // need to read from potentially-stale React state at TOOL_CALL_END.
      const pendingToolCalls = new Map<string, { name: string; arguments: string }>();

      for await (const event of stream) {
        switch (event.type) {
          case "MESSAGE_START": {
            if (!event.messageId) break;
            appendOrUpdateMessage({
              id: event.messageId,
              role: "assistant",
              content: "",
              createdAt: nowIso(),
              streaming: true,
            });
            break;
          }

          case "MESSAGE_DELTA": {
            if (!event.messageId || !event.delta) break;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === event.messageId);
              if (idx === -1) return prev;
              const next = [...prev];
              next[idx] = { ...next[idx], content: next[idx].content + event.delta };
              return next;
            });
            break;
          }

          case "MESSAGE_END": {
            if (!event.messageId) break;
            setMessages((prev) => {
              const idx = prev.findIndex((m) => m.id === event.messageId);
              if (idx === -1) return prev;
              const next = [...prev];
              const completed = { ...next[idx], streaming: false };
              next[idx] = completed;
              onMessage?.(completed);
              return next;
            });
            break;
          }

          case "TOOL_CALL_START": {
            if (!event.toolCallId) break;
            // Register in our local map for quick lookup at TOOL_CALL_END
            pendingToolCalls.set(event.toolCallId, {
              name: event.toolName ?? "",
              arguments: "",
            });
            if (event.messageId) {
              setMessages((prev) => {
                const idx = prev.findIndex((m) => m.id === event.messageId);
                if (idx === -1) return prev;
                const next = [...prev];
                const existing = next[idx].toolCalls ?? [];
                next[idx] = {
                  ...next[idx],
                  toolCalls: [
                    ...existing,
                    {
                      id: event.toolCallId!,
                      type: "function" as const,
                      function: { name: event.toolName ?? "", arguments: "" },
                    },
                  ],
                };
                return next;
              });
            }
            break;
          }

          case "TOOL_CALL_DELTA": {
            if (!event.toolCallId || !event.toolArgsDelta) break;
            // Accumulate in our local map
            const tc = pendingToolCalls.get(event.toolCallId);
            if (tc) {
              tc.arguments += event.toolArgsDelta;
            }
            setMessages((prev) => {
              const msgIdx = prev.findIndex((m) =>
                m.toolCalls?.some((c) => c.id === event.toolCallId)
              );
              if (msgIdx === -1) return prev;
              const next = [...prev];
              const msg = next[msgIdx];
              next[msgIdx] = {
                ...msg,
                toolCalls: (msg.toolCalls ?? []).map((c) =>
                  c.id === event.toolCallId
                    ? {
                        ...c,
                        function: {
                          ...c.function,
                          arguments: c.function.arguments + (event.toolArgsDelta ?? ""),
                        },
                      }
                    : c
                ),
              };
              return next;
            });
            break;
          }

          case "TOOL_CALL_END": {
            if (!event.toolCallId || !toolProvider) break;
            const callInfo = pendingToolCalls.get(event.toolCallId);
            if (!callInfo) break;
            pendingToolCalls.delete(event.toolCallId);

            try {
              const args = JSON.parse(callInfo.arguments || "{}") as Record<string, unknown>;
              const result = await toolProvider.executeTool({
                toolCallId: event.toolCallId,
                name: callInfo.name,
                arguments: args,
              });
              const toolMsg: ChatMessage = {
                id: generateId(),
                role: "tool",
                content: JSON.stringify(result.result),
                createdAt: nowIso(),
                toolCallId: event.toolCallId,
              };
              appendOrUpdateMessage(toolMsg);
            } catch (err) {
              const toolErrMsg: ChatMessage = {
                id: generateId(),
                role: "tool",
                content: JSON.stringify({ error: String(err) }),
                createdAt: nowIso(),
                toolCallId: event.toolCallId,
              };
              appendOrUpdateMessage(toolErrMsg);
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
            onError?.(new Error(msg));
            break;
          }

          case "DONE":
            break;

          default:
            break;
        }
      }
    },
    [appendOrUpdateMessage, mappings, toolProvider, onMessage, onError]
  );

  const sendMessage = useCallback(
    async (content: string) => {
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      const userMsg: ChatMessage = {
        id: generateId(),
        role: "user",
        content,
        createdAt: nowIso(),
      };

      // Capture the current message list before the state update
      let currentMessages: ChatMessage[] = [];
      setMessages((prev) => {
        currentMessages = [...prev, userMsg];
        return currentMessages;
      });

      setIsLoading(true);
      setError(null);

      try {
        // Use a small delay to let React batch the state update before reading
        await Promise.resolve();
        const raw = streamFactory(currentMessages);
        const iterable: AsyncIterable<StreamEvent> =
          raw instanceof ReadableStream
            ? (raw as unknown as AsyncIterable<StreamEvent>)
            : raw;

        await processStream(iterable);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        onError?.(err instanceof Error ? err : new Error(msg));
      } finally {
        setIsLoading(false);
      }
    },
    [streamFactory, processStream, onError]
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    setMessages([]);
    setError(null);
    setIsLoading(false);
  }, []);

  const session: ChatSession = {
    id: idRef.current,
    messages,
    isLoading,
    error,
    mappings,
  };

  return { session, sendMessage, clearMessages };
}
