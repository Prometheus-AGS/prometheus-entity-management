/**
 * use-chat-session.ts — React hook for one AG-UI 1.0 chat conversation.
 *
 * The conversation lives in the entity graph, written by a
 * `ChatConversationStore` (chat/conversation-store.ts) that consumes the AG-UI
 * 1.0 event stream. This hook only orchestrates (CLAUDE.md layering): it owns
 * the run's `AbortController`, hands the store the stream factory, and reads
 * the conversation back from the graph, so every view of the same conversation
 * shows the same messages.
 *
 * Cancellation is real: a new `sendMessage`, `clearMessages`, or unmounting
 * aborts the previous run's signal (passed to `streamFactory`), and the store
 * drops any event that arrives afterwards.
 */

import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { graphStore, resolveActiveGraphStore, type GraphStore } from "@prometheus-ags/entity-graph-core";
import { ChatConversationStore, type ChatStreamFactory } from "./chat/conversation-store.js";
import type { ChatInterrupt, ChatResumeEntry } from "./chat/interrupts.js";
import type { A2uiActionDecision, A2uiActionPolicy } from "./policy/action-policy.js";
import type {
  AgUiStateMapping,
  ChatMessage,
  ChatSession,
  EntityToolProvider,
} from "./types.js";

function generateId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export interface UseChatSessionOptions {
  /** Conversation id; defaults to a generated id. Two sessions with the same id share messages. */
  sessionId?: string;
  /**
   * Returns the AG-UI 1.0 event stream for the next run, given the conversation
   * so far. Honour `signal`: it is aborted when the run is superseded, cleared
   * or the component unmounts.
   */
  streamFactory: ChatStreamFactory;
  /** AG-UI state mappings: project agent state onto entity-graph entities. */
  mappings?: AgUiStateMapping[];
  /** Optional tool provider for client-side tools (function calling / MCP). */
  toolProvider?: EntityToolProvider;
  /** Called when a full assistant message has been received. */
  onMessage?: (message: ChatMessage) => void;
  /** Called on a stream or run error. */
  onError?: (error: Error) => void;
  /** The graph to write to; defaults to the active graph. */
  graphStore?: GraphStore;
  /**
   * Decides every approved interrupt (AG-UI 1.0 `RUN_FINISHED.outcome`
   * interrupt), as for any A2UI action: allowlist, authorization, execution and
   * audit. Without it, approving an interrupt resolves it as `cancelled`.
   */
  actionPolicy?: A2uiActionPolicy;
  /**
   * Maps an interrupt (and the user's edited payload, if any) to the action the
   * policy decides. Defaults to `interrupt.metadata["prometheus.action"]`
   * (`{ name, context }`), with an object payload replacing the context.
   */
  interruptToAction?: (
    interrupt: ChatInterrupt,
    payload: unknown,
  ) => { name: string; context: Record<string, unknown> } | undefined;
  /** Called with each interrupt decision and the policy decision behind it, if any. */
  onInterruptDecision?: (
    interrupt: ChatInterrupt,
    entry: ChatResumeEntry,
    decision?: A2uiActionDecision,
  ) => void;
}

/** A user's decision on one interrupt. */
export interface ChatInterruptDecision {
  approved: boolean;
  /** Edited values (edit-before-approve). Replaces the action context when it is an object. */
  payload?: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** The default interrupt → action mapping: `metadata["prometheus.action"]`. */
export function defaultInterruptToAction(
  interrupt: ChatInterrupt,
  payload: unknown,
): { name: string; context: Record<string, unknown> } | undefined {
  const declared = interrupt.metadata?.["prometheus.action"];
  if (!isRecord(declared) || typeof declared.name !== "string") return undefined;
  const context = isRecord(payload) ? payload : isRecord(declared.context) ? declared.context : {};
  return { name: declared.name, context };
}

export interface UseChatSessionReturn {
  session: ChatSession;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  /** Interrupts of the paused run that still await a decision. */
  interrupts: ChatInterrupt[];
  /**
   * Decide one interrupt. Once every interrupt of the paused run is decided,
   * the run resumes with `resume[]` passed to `streamFactory`.
   */
  resolveInterrupt: (interruptId: string, decision: ChatInterruptDecision) => Promise<void>;
}

/** Map one interrupt decision to its resume entry, through the action policy when approved. */
async function decideInterruptChoice(
  interrupt: ChatInterrupt,
  choice: ChatInterruptDecision,
  options: Pick<UseChatSessionOptions, "actionPolicy" | "interruptToAction">,
  conversationId: string,
): Promise<{ entry: ChatResumeEntry; decision?: A2uiActionDecision }> {
  const interruptId = interrupt.id;
  if (!choice.approved) return { entry: { interruptId, status: "cancelled", payload: { reason: "denied-by-user" } } };
  if (!options.actionPolicy) return { entry: { interruptId, status: "cancelled", payload: { reason: "no-action-policy" } } };
  const action = (options.interruptToAction ?? defaultInterruptToAction)(interrupt, choice.payload);
  if (!action) return { entry: { interruptId, status: "cancelled", payload: { reason: "unmapped-interrupt" } } };
  const decision = await options.actionPolicy.handle({
    name: action.name,
    surfaceId: `agui-interrupt:${conversationId}`,
    sourceComponentId: interruptId,
    timestamp: new Date().toISOString(),
    context: action.context,
  });
  const entry: ChatResumeEntry =
    decision.status === "executed"
      ? { interruptId, status: "resolved", payload: action.context }
      : { interruptId, status: "cancelled", payload: { reason: decision.reason, code: decision.code } };
  return { entry, decision };
}

export function useChatSession(opts: UseChatSessionOptions): UseChatSessionReturn {
  const { sessionId, streamFactory, mappings = [], toolProvider, onMessage, onError } = opts;
  const streamFactoryRef = useRef(streamFactory);
  streamFactoryRef.current = streamFactory;
  const idRef = useRef(sessionId ?? generateId());
  const abortRef = useRef<AbortController | null>(null);
  // Callbacks are read through refs so the store is created once and never stale.
  const callbacks = useRef({
    toolProvider, onMessage, onError, mappings, graph: opts.graphStore,
    actionPolicy: opts.actionPolicy, interruptToAction: opts.interruptToAction,
    onInterruptDecision: opts.onInterruptDecision,
  });
  callbacks.current = {
    toolProvider, onMessage, onError, mappings, graph: opts.graphStore,
    actionPolicy: opts.actionPolicy, interruptToAction: opts.interruptToAction,
    onInterruptDecision: opts.onInterruptDecision,
  };

  // One store per graph: a store reads and writes only the graph it was created for,
  // so switching graphStore never carries a run, a claim or a decision across graphs.
  const graph = opts.graphStore ?? resolveActiveGraphStore(graphStore);
  const storeRef = useRef<{ store: ChatConversationStore; graph: GraphStore } | null>(null);
  if (!storeRef.current || storeRef.current.graph !== graph) {
    const boundGraph = graph;
    storeRef.current = { graph: boundGraph, store: new ChatConversationStore({
      conversationId: idRef.current,
      graph: () => boundGraph,
      get mappings() {
        return callbacks.current.mappings;
      },
      get toolProvider() {
        return callbacks.current.toolProvider;
      },
      onMessage: (message) => callbacks.current.onMessage?.(message),
      onError: (error) => callbacks.current.onError?.(error),
    }) };
  }
  const store = storeRef.current.store;

  const subscribe = useCallback(
    (listener: () => void) => graph.subscribe(listener),
    // Resubscribe when the graph (and so the store) changes.
    [graph],
  );
  const snapshot = useSyncExternalStore(subscribe, () => store.snapshot(), () => store.snapshot());

  // Unmounting, or replacing the store after a graph switch, aborts the run in flight and
  // cancels it on its own graph; a decision that finishes later does not resume it.
  const activeStoreRef = useRef<ChatConversationStore | null>(null);
  useEffect(() => {
    activeStoreRef.current = store;
    return () => {
      if (activeStoreRef.current === store) activeStoreRef.current = null;
      abortRef.current?.abort();
      store.cancel();
    };
  }, [store]);

  // A pause whose interrupts are all decided but which never resumed (its deciding view
  // unmounted first): any view of the conversation that sees it resumes it, once.
  useEffect(() => {
    const ready = store.pendingResume();
    if (!ready) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    void store.resume(ready, streamFactoryRef.current, controller.signal, () => controller.abort());
  }, [store, snapshot.runStatus, snapshot.interrupts.length]);

  const sendMessage = useCallback(
    async (content: string) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      await store.send(content, streamFactory, controller.signal, () => controller.abort());
    },
    [store, streamFactory],
  );

  const resolveInterrupt = useCallback(
    async (interruptId: string, choice: ChatInterruptDecision) => {
      const interrupt = store.snapshot().interrupts.find((item) => item.id === interruptId);
      if (!interrupt) return;
      // Claim it first: a second caller or view cannot run the same action again.
      // The epoch binds the decision to this pause, so it cannot decide a later run.
      const epoch = store.claimInterrupt(interruptId);
      if (epoch === undefined) return;
      const reportError = (cause: unknown): void =>
        callbacks.current.onError?.(cause instanceof Error ? cause : new Error(String(cause)));
      let entry: ChatResumeEntry;
      let decision: A2uiActionDecision | undefined;
      try {
        ({ entry, decision } = await decideInterruptChoice(interrupt, choice, callbacks.current, store.conversationId));
      } catch (cause) {
        // Fail closed: a mapping or policy that throws resolves the interrupt as cancelled.
        entry = { interruptId, status: "cancelled", payload: { reason: "policy-error" } };
        decision = undefined;
        reportError(cause);
      }
      try {
        callbacks.current.onInterruptDecision?.(interrupt, entry, decision);
      } catch (cause) {
        reportError(cause);
      }
      const all = store.decideInterrupt(entry, epoch);
      if (!all || activeStoreRef.current !== store) return;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      await store.resume(all, streamFactory, controller.signal, () => controller.abort());
    },
    [store, streamFactory],
  );

  const clearMessages = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    store.clear();
  }, [store]);

  const session: ChatSession = {
    id: idRef.current,
    messages: snapshot.messages,
    isLoading: snapshot.isLoading,
    error: snapshot.error,
    mappings,
    runStatus: snapshot.runStatus,
    ...(snapshot.runId === undefined ? {} : { runId: snapshot.runId }),
  };

  return { session, sendMessage, clearMessages, interrupts: snapshot.interrupts, resolveInterrupt };
}
