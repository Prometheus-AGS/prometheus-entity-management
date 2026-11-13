/**
 * The store that owns a chat conversation: it consumes an AG-UI 1.0 event
 * stream and writes the conversation into the entity graph. Hooks read the
 * graph; they never touch the stream (CLAUDE.md: Components → Hooks → Stores).
 *
 * - Messages are graph entities (`A2uiChatMessage`); the conversation's order
 *   is a graph list of their ids (`a2ui-chat:<conversationId>`), as every graph
 *   list is. Every view of a conversation therefore shows the same messages.
 * - Each run gets a token. Only the current run writes: a superseded,
 *   cleared or disposed run's late events change nothing.
 * - AG-UI state events are projected onto graph entities through the existing
 *   `applyAgUiSnapshot` / `applyAgUiDelta` bridge.
 */
import {
  applyAgUiDelta,
  applyAgUiSnapshot,
  type GraphStore,
} from "@prometheus-ags/entity-graph-core";
import type {
  AgUiEvent,
  AgUiStateMapping,
  ChatMessage,
  ChatRunStatus,
  EntityToolProvider,
  MessageRole,
  ToolCall,
} from "../types.js";
import {
  readInterruptOutcome,
  toResumeInput,
  type ChatInterrupt,
  type ChatResumeEntry,
} from "./interrupts.js";

export const CHAT_MESSAGE_ENTITY = "A2uiChatMessage";
export const CHAT_CONVERSATION_ENTITY = "A2uiChatConversation";

/** The graph list key holding a conversation's message ids, in order. */
export function chatListKey(conversationId: string): string {
  return `a2ui-chat:${conversationId}`;
}

/** Graph id of a conversation's message; a JSON tuple, so ids containing `:` cannot collide. */
function messageEntityId(conversationId: string, messageId: string): string {
  return JSON.stringify([conversationId, messageId]);
}

function generateId(): string {
  return globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

const nowIso = (): string => new Date().toISOString();
const str = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
/** Own-key lookup, so interrupt ids such as "constructor" or "__proto__" are not mistaken for inherited properties. */
const hasOwn = (record: object | undefined, key: string): boolean =>
  record !== undefined && Object.prototype.hasOwnProperty.call(record, key);

/** The well-formed tool calls of an AG-UI snapshot message (id, function name, JSON arguments). */
function snapshotToolCalls(input: readonly unknown[]): ToolCall[] {
  const calls: ToolCall[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== "object") continue;
    const call = raw as { id?: unknown; function?: { name?: unknown; arguments?: unknown } };
    const id = str(call.id);
    const name = str(call.function?.name);
    if (!id || !name) continue;
    calls.push({ id, type: "function", function: { name, arguments: str(call.function?.arguments) ?? "" } });
  }
  return calls;
}

/** A run of the conversation; its writes are dropped once it is no longer current. */
export interface ChatRun {
  readonly token: number;
  isCurrent(): boolean;
}

export interface ChatConversationSnapshot {
  messages: ChatMessage[];
  runStatus: ChatRunStatus;
  runId?: string;
  error: string | null;
  isLoading: boolean;
  /** Interrupts of the paused run that still await a decision. */
  interrupts: ChatInterrupt[];
}

export interface ChatStreamContext {
  signal: AbortSignal;
  /** Present when this run resumes a paused one: put it in the run input's `resume`. */
  resume?: Array<Record<string, unknown>>;
}

export type ChatStreamFactory = (
  messages: ChatMessage[],
  context: ChatStreamContext,
) => AsyncIterable<AgUiEvent> | ReadableStream<AgUiEvent>;

export interface ChatConversationStoreOptions {
  conversationId: string;
  /** Returns the graph to write to (the active graph by default). */
  graph: () => GraphStore;
  mappings?: AgUiStateMapping[];
  toolProvider?: EntityToolProvider;
  onMessage?: (message: ChatMessage) => void;
  onError?: (error: Error) => void;
}

interface ConversationRecord {
  runStatus: ChatRunStatus;
  runId?: string;
  error: string | null;
  isLoading: boolean;
  interrupts?: ChatInterrupt[];
  decisions?: Record<string, ChatResumeEntry>;
  /** Interrupt ids whose decision is being made; claimed before the policy runs. */
  claims?: string[];
  /** Increments each time a run pauses; a decision applies only to the pause it was claimed in. */
  interruptEpoch?: number;
}

/** Who owns a conversation's current run; shared by every store on the same graph. */
interface RunOwner {
  readonly abort?: () => void;
}

/** Per graph and conversation id, the store run allowed to write. Views of one conversation share it. */
const runOwners = new WeakMap<object, Map<string, RunOwner>>();

export class ChatConversationStore {
  private runToken = 0;
  private ownedRun: RunOwner | undefined;
  /** The message and tool call a chunk stream is continuing (chunks may omit their id after the first). */
  private chunkMessageId: string | undefined;
  private chunkToolCallId: string | undefined;
  private readonly agentState: Record<string, unknown> = {};
  private readonly pendingToolCalls = new Map<string, { name: string; arguments: string; messageId?: string; ended?: boolean }>();
  private cachedFor: unknown = undefined;
  private cached: ChatConversationSnapshot | undefined;

  constructor(private readonly options: ChatConversationStoreOptions) {}

  get conversationId(): string {
    return this.options.conversationId;
  }

  private owners(): Map<string, RunOwner> {
    const graph = this.options.graph();
    let owners = runOwners.get(graph);
    if (!owners) {
      owners = new Map();
      runOwners.set(graph, owners);
    }
    return owners;
  }

  /**
   * Start a run; every earlier run of this conversation stops writing, in this
   * store and in every other store (view) of the same conversation on the same
   * graph. `abort` is called if a later run, from any view, supersedes this one.
   */
  beginRun(abort?: () => void): ChatRun {
    const token = ++this.runToken;
    const owner: RunOwner = abort ? { abort } : {};
    const owners = this.owners();
    const previous = owners.get(this.conversationId);
    owners.set(this.conversationId, owner);
    this.ownedRun = owner;
    if (previous && previous !== owner) previous.abort?.();
    this.settleStreaming();
    this.pendingToolCalls.clear();
    this.resetAgentState();
    this.chunkMessageId = undefined;
    this.chunkToolCallId = undefined;
    this.writeConversation({
      runStatus: "running",
      error: null,
      isLoading: true,
      interrupts: undefined,
      decisions: undefined,
      claims: undefined,
    });
    return { token, isCurrent: () => token === this.runToken && this.owners().get(this.conversationId) === owner };
  }

  /**
   * Stop this store's run, marking it cancelled if it was still running. A view
   * that does not own the conversation's current run (a passive view) changes
   * nothing, so unmounting it never cancels another view's run.
   */
  cancel(): void {
    this.runToken += 1;
    const owners = this.owners();
    if (!this.ownedRun || owners.get(this.conversationId) !== this.ownedRun) return;
    const owned = this.ownedRun;
    owners.delete(this.conversationId);
    this.ownedRun = undefined;
    owned.abort?.();
    this.settleStreaming();
    const record = this.readConversation();
    if (record.runStatus === "running") {
      this.writeConversation({ runStatus: "cancelled", isLoading: false });
    }
  }

  /**
   * Claim an undecided interrupt of the paused run before deciding it. Returns
   * false if it is not pending or another caller (any view) already claimed it,
   * so a policy action behind an interrupt runs at most once.
   */
  claimInterrupt(interruptId: string): number | undefined {
    const record = this.readConversation();
    const pending = record.interrupts ?? [];
    if (record.runStatus !== "interrupted" || !pending.some((item) => item.id === interruptId)) return undefined;
    if (hasOwn(record.decisions, interruptId) || record.claims?.includes(interruptId)) return undefined;
    this.writeConversation({ claims: [...(record.claims ?? []), interruptId] });
    return record.interruptEpoch ?? 0;
  }

  /** Append the user's message and stream the agent's answer into the graph. */
  async send(content: string, streamFactory: ChatStreamFactory, signal: AbortSignal, abort?: () => void): Promise<void> {
    const run = this.beginRun(abort);
    this.upsertMessage({ id: generateId(), role: "user", content, createdAt: nowIso() });
    await this.stream(run, streamFactory, { signal });
  }

  /**
   * Record the decision for one interrupt of the paused run. Returns every
   * decision once all of the run's interrupts are decided (ready to resume),
   * otherwise `undefined`.
   */
  decideInterrupt(entry: ChatResumeEntry, epoch?: number): ChatResumeEntry[] | undefined {
    const record = this.readConversation();
    const pending = record.interrupts ?? [];
    if (record.runStatus !== "interrupted" || !pending.some((item) => item.id === entry.interruptId)) {
      return undefined;
    }
    // A decision claimed during an earlier pause must not decide a later run's interrupt.
    if (epoch !== undefined && (record.interruptEpoch ?? 0) !== epoch) return undefined;
    const decisions = { ...(record.decisions ?? {}), [entry.interruptId]: entry };
    this.writeConversation({ decisions });
    return pending.every((item) => hasOwn(decisions, item.id)) ? pending.map((item) => decisions[item.id]!) : undefined;
  }

  /**
   * The decisions of a pause whose interrupts are all decided but which never
   * resumed (its deciding view unmounted first), or `undefined`.
   */
  pendingResume(): ChatResumeEntry[] | undefined {
    const record = this.readConversation();
    const pending = record.interrupts ?? [];
    if (record.runStatus !== "interrupted" || pending.length === 0) return undefined;
    const decisions = record.decisions ?? {};
    return pending.every((item) => hasOwn(decisions, item.id)) ? pending.map((item) => decisions[item.id]!) : undefined;
  }

  /** Resume the paused run with the decisions, as the next run's `resume[]`. */
  async resume(
    entries: readonly ChatResumeEntry[],
    streamFactory: ChatStreamFactory,
    signal: AbortSignal,
    abort?: () => void,
  ): Promise<void> {
    const run = this.beginRun(abort);
    await this.stream(run, streamFactory, { signal, resume: toResumeInput(entries) });
  }

  private async stream(run: ChatRun, streamFactory: ChatStreamFactory, context: ChatStreamContext): Promise<void> {
    const { signal } = context;
    // Once its own signal is aborted the run stops writing, including after an awaited client tool.
    const live: ChatRun = { token: run.token, isCurrent: () => run.isCurrent() && !signal.aborted };
    const history = this.messages();
    try {
      const raw = streamFactory(history, context);
      const iterable: AsyncIterable<AgUiEvent> =
        raw instanceof ReadableStream ? (raw as unknown as AsyncIterable<AgUiEvent>) : raw;
      for await (const event of iterable) {
        // A superseded run stops reading; leaving the loop also closes the iterator.
        if (!live.isCurrent()) break;
        await this.apply(event, live);
      }
      if (run.isCurrent()) this.settleStreaming();
      if (run.isCurrent() && this.readConversation().runStatus === "running") {
        // Stopped by its own signal (not superseded): cancelled, not finished.
        this.writeConversation({ runStatus: signal.aborted ? "cancelled" : "finished", isLoading: false });
      }
    } catch (cause) {
      if (!run.isCurrent()) return;
      this.settleStreaming();
      if (signal.aborted) {
        if (this.readConversation().runStatus === "running") {
          this.writeConversation({ runStatus: "cancelled", isLoading: false });
        }
        return;
      }
      const error = cause instanceof Error ? cause : new Error(String(cause));
      this.writeConversation({ runStatus: "error", error: error.message, isLoading: false });
      this.options.onError?.(error);
    }
  }

  /** Apply one AG-UI 1.0 event, if `run` is still current. */
  async apply(event: AgUiEvent, run: ChatRun): Promise<void> {
    if (!run.isCurrent()) return;
    this.closeChunks(event);
    // Closing a chunk calls onMessage, which may clear or supersede this run.
    if (!run.isCurrent()) return;
    switch (event.type) {
      case "RUN_STARTED":
        this.writeConversation({ runStatus: "running", runId: str(event.runId), isLoading: true });
        return;
      case "RUN_FINISHED": {
        const interrupts = readInterruptOutcome(event);
        const outcome = (event as { outcome?: unknown }).outcome;
        const declaresInterrupt =
          !!outcome && typeof outcome === "object" && (outcome as { type?: unknown }).type === "interrupt";
        if (declaresInterrupt && !(interrupts && interrupts.length > 0)) {
          // Fail closed: a paused run whose interrupts cannot be read runs nothing and ends in error.
          this.pendingToolCalls.clear();
          const message = "The run paused on an interrupt outcome that could not be read.";
          this.writeConversation({ runStatus: "error", error: message, isLoading: false });
          this.options.onError?.(new Error(message));
          return;
        }
        // A run paused on an interrupt runs no client tools: nothing it asked for
        // executes before a human decides, and the resumed run asks again.
        if (interrupts && interrupts.length > 0) {
          this.pendingToolCalls.clear();
        } else {
          await this.runClientTools(run);
          if (!run.isCurrent()) return;
        }
        if (interrupts && interrupts.length > 0) {
          this.writeConversation({
            runStatus: "interrupted",
            isLoading: false,
            interrupts,
            decisions: {},
            claims: undefined,
            interruptEpoch: (this.readConversation().interruptEpoch ?? 0) + 1,
          });
        } else {
          this.writeConversation({ runStatus: "finished", isLoading: false });
        }
        return;
      }
      case "RUN_ERROR": {
        const message = str(event.message) ?? "Run failed.";
        this.writeConversation({ runStatus: "error", error: message, isLoading: false });
        this.options.onError?.(new Error(message));
        return;
      }
      case "TEXT_MESSAGE_START":
      case "REASONING_MESSAGE_START":
        this.startMessage(event, event.type === "REASONING_MESSAGE_START" ? "reasoning" : "assistant");
        return;
      case "TEXT_MESSAGE_CONTENT":
      case "REASONING_MESSAGE_CONTENT":
        this.appendDelta(str(event.messageId), str(event.delta));
        return;
      case "TEXT_MESSAGE_CHUNK":
      case "REASONING_MESSAGE_CHUNK": {
        // A continuation chunk may omit messageId; it continues the last chunked message.
        const messageId = str(event.messageId) ?? this.chunkMessageId;
        this.chunkMessageId = messageId;
        if (messageId && !this.readMessage(messageId)) {
          this.startMessage({ ...event, messageId }, event.type === "REASONING_MESSAGE_CHUNK" ? "reasoning" : "assistant");
        }
        this.appendDelta(messageId, str(event.delta));
        return;
      }
      case "TEXT_MESSAGE_END":
      case "REASONING_MESSAGE_END":
        this.endMessage(str(event.messageId));
        return;
      case "TOOL_CALL_START":
        this.toolCallStart(event);
        return;
      case "TOOL_CALL_CHUNK": {
        // A continuation chunk may omit toolCallId; it continues the last chunked call.
        const toolCallId = str(event.toolCallId) ?? this.chunkToolCallId;
        this.chunkToolCallId = toolCallId;
        this.toolCallStart({ ...event, toolCallId });
        this.toolCallArgs(toolCallId, str(event.delta));
        return;
      }
      case "TOOL_CALL_ARGS":
        this.toolCallArgs(str(event.toolCallId), str(event.delta));
        return;
      case "TOOL_CALL_END":
        this.toolCallEnd(str(event.toolCallId));
        return;
      case "TOOL_CALL_RESULT":
        this.upsertMessage({
          id: str(event.messageId) ?? generateId(),
          role: "tool",
          content: typeof event.content === "string" ? event.content : JSON.stringify(event.content),
          createdAt: nowIso(),
          toolCallId: str(event.toolCallId),
        });
        this.pendingToolCalls.delete(str(event.toolCallId) ?? "");
        return;
      case "STATE_SNAPSHOT":
        if (event.snapshot && typeof event.snapshot === "object") {
          applyAgUiSnapshot(
            { type: "STATE_SNAPSHOT", snapshot: event.snapshot as Record<string, unknown> },
            { mappings: this.options.mappings ?? [], store: this.options.graph() },
          );
          // A snapshot replaces the agent state; keys it omits are gone.
          this.resetAgentState();
          Object.assign(this.agentState, event.snapshot);
        }
        return;
      case "STATE_DELTA":
        if (Array.isArray(event.delta)) {
          applyAgUiDelta(
            { type: "STATE_DELTA", delta: event.delta as Parameters<typeof applyAgUiDelta>[0]["delta"] },
            { mappings: this.options.mappings ?? [], store: this.options.graph() },
            Object.keys(this.agentState).length > 0 ? this.agentState : undefined,
          );
        }
        return;
      case "MESSAGES_SNAPSHOT":
        if (Array.isArray(event.messages)) this.replaceMessages(event.messages);
        return;
      default:
        // AG-UI 1.0: consumers ignore event types they do not handle.
        return;
    }
  }

  /** Remove the conversation's messages from the graph and stop the current run. */
  clear(): void {
    this.runToken += 1;
    const owners = this.owners();
    owners.get(this.conversationId)?.abort?.();
    owners.delete(this.conversationId);
    this.ownedRun = undefined;
    this.resetAgentState();
    const graph = this.options.graph().getState();
    for (const id of graph.lists[chatListKey(this.conversationId)]?.ids ?? []) {
      graph.removeEntity(CHAT_MESSAGE_ENTITY, id);
    }
    graph.setListResult(chatListKey(this.conversationId), [], {});
    this.writeConversation({
      runStatus: "idle",
      runId: undefined,
      error: null,
      isLoading: false,
      interrupts: undefined,
      decisions: undefined,
      claims: undefined,
    });
  }

  /** The conversation's messages, in order, read from the graph. */
  messages(): ChatMessage[] {
    const graph = this.options.graph().getState();
    const ids = graph.lists[chatListKey(this.conversationId)]?.ids ?? [];
    const messages: ChatMessage[] = [];
    for (const id of ids) {
      const message = graph.readEntity<ChatMessage>(CHAT_MESSAGE_ENTITY, id);
      if (message) messages.push(message);
    }
    return messages;
  }

  /**
   * A snapshot for `useSyncExternalStore`: the same object until the graph
   * changes, so React does not re-render on every unrelated subscription call.
   */
  snapshot(): ChatConversationSnapshot {
    const state = this.options.graph().getState();
    if (this.cached && this.cachedFor === state) return this.cached;
    const record = this.readConversation();
    this.cachedFor = state;
    const decided = record.decisions ?? {};
    this.cached = {
      messages: this.messages(),
      interrupts: (record.interrupts ?? []).filter((item) => !hasOwn(decided, item.id)),
      runStatus: record.runStatus,
      ...(record.runId === undefined ? {} : { runId: record.runId }),
      error: record.error,
      isLoading: record.isLoading,
    };
    return this.cached;
  }

  private startMessage(event: AgUiEvent, fallbackRole: MessageRole): void {
    const id = str(event.messageId);
    if (!id) return;
    const role = (str(event.role) as MessageRole | undefined) ?? fallbackRole;
    this.upsertMessage({ id, role, content: "", createdAt: nowIso(), streaming: true, name: str(event.name) });
  }

  private appendDelta(messageId: string | undefined, delta: string | undefined): void {
    if (!messageId || !delta) return;
    const message = this.readMessage(messageId);
    if (message) this.upsertMessage({ ...message, content: message.content + delta });
  }

  private endMessage(messageId: string | undefined): void {
    if (!messageId) return;
    const message = this.readMessage(messageId);
    if (!message) return;
    const completed = { ...message, streaming: false };
    this.upsertMessage(completed);
    this.options.onMessage?.(completed);
  }

  private toolCallStart(event: AgUiEvent): void {
    const toolCallId = str(event.toolCallId);
    if (!toolCallId || this.pendingToolCalls.has(toolCallId)) return;
    const name = str(event.toolCallName) ?? "";
    const call = { id: toolCallId, type: "function" as const, function: { name, arguments: "" } };
    const requestedParent = str(event.parentMessageId);
    const parent = requestedParent ? this.readMessage(requestedParent) : undefined;
    if (parent) {
      this.pendingToolCalls.set(toolCallId, { name, arguments: "", messageId: parent.id });
      this.upsertMessage({ ...parent, toolCalls: [...(parent.toolCalls ?? []), call] });
      return;
    }
    // No known parent: hold the call on its own assistant message so history keeps it.
    const messageId = requestedParent ?? `tool-call:${toolCallId}`;
    this.pendingToolCalls.set(toolCallId, { name, arguments: "", messageId });
    this.upsertMessage({ id: messageId, role: "assistant", content: "", createdAt: nowIso(), toolCalls: [call] });
  }

  private toolCallArgs(toolCallId: string | undefined, delta: string | undefined): void {
    if (!toolCallId || !delta) return;
    const call = this.pendingToolCalls.get(toolCallId);
    if (!call) return;
    call.arguments += delta;
    const parent = call.messageId ? this.readMessage(call.messageId) : undefined;
    if (!parent) return;
    this.upsertMessage({
      ...parent,
      toolCalls: (parent.toolCalls ?? []).map((existing) =>
        existing.id === toolCallId
          ? { ...existing, function: { ...existing.function, arguments: call.arguments } }
          : existing,
      ),
    });
  }

  /**
   * Mark a tool call complete. TOOL_CALL_RESULT, when the agent ran the tool
   * itself, arrives after TOOL_CALL_END, so client-side execution waits for
   * RUN_FINISHED (see runClientTools).
   */
  private toolCallEnd(toolCallId: string | undefined): void {
    const call = toolCallId ? this.pendingToolCalls.get(toolCallId) : undefined;
    if (call) call.ended = true;
  }

  /** At RUN_FINISHED, run every ended tool call the agent did not answer with TOOL_CALL_RESULT through the tool provider. */
  private async runClientTools(run: ChatRun): Promise<void> {
    const provider = this.options.toolProvider;
    const unanswered = [...this.pendingToolCalls.entries()].filter(([, call]) => call.ended);
    for (const [toolCallId] of unanswered) this.pendingToolCalls.delete(toolCallId);
    if (!provider) return;
    for (const [toolCallId, call] of unanswered) {
      // A graph write below can supersede this run; never start another tool after that.
      if (!run.isCurrent()) return;
      let content: string;
      try {
        const args = JSON.parse(call.arguments || "{}") as Record<string, unknown>;
        const result = await provider.executeTool({ toolCallId, name: call.name, arguments: args });
        content = JSON.stringify(result.result);
      } catch (cause) {
        content = JSON.stringify({ error: String(cause) });
      }
      if (!run.isCurrent()) return;
      this.upsertMessage({ id: generateId(), role: "tool", content, createdAt: nowIso(), toolCallId });
    }
  }

  private replaceMessages(input: readonly unknown[]): void {
    const graph = this.options.graph().getState();
    for (const id of graph.lists[chatListKey(this.conversationId)]?.ids ?? []) {
      graph.removeEntity(CHAT_MESSAGE_ENTITY, id);
    }
    graph.setListResult(chatListKey(this.conversationId), [], {});
    for (const raw of input) {
      if (!raw || typeof raw !== "object") continue;
      const message = raw as Record<string, unknown>;
      const id = str(message.id);
      const role = str(message.role) as MessageRole | undefined;
      if (!id || !role || role === ("activity" as MessageRole)) continue;
      this.upsertMessage({
        id,
        role,
        content: typeof message.content === "string" ? message.content : JSON.stringify(message.content ?? ""),
        createdAt: nowIso(),
        ...(str(message.name) ? { name: str(message.name) } : {}),
        ...(str(message.toolCallId) ? { toolCallId: str(message.toolCallId) } : {}),
        ...(Array.isArray(message.toolCalls) ? { toolCalls: snapshotToolCalls(message.toolCalls) } : {}),
      });
    }
  }

  /**
   * Chunk events carry no END: as in the AG-UI client, a chunked message ends
   * when any other event (or a chunk for another id) arrives, and a chunked tool
   * call becomes ended the same way, so RUN_FINISHED completes both.
   */
  private closeChunks(event: AgUiEvent): void {
    const isMessageChunk = event.type === "TEXT_MESSAGE_CHUNK" || event.type === "REASONING_MESSAGE_CHUNK";
    const nextMessageId = isMessageChunk ? (str(event.messageId) ?? this.chunkMessageId) : undefined;
    if (this.chunkMessageId && nextMessageId !== this.chunkMessageId) {
      if (this.readMessage(this.chunkMessageId)?.streaming) this.endMessage(this.chunkMessageId);
      this.chunkMessageId = undefined;
    }
    const nextToolCallId = event.type === "TOOL_CALL_CHUNK" ? (str(event.toolCallId) ?? this.chunkToolCallId) : undefined;
    if (this.chunkToolCallId && nextToolCallId !== this.chunkToolCallId) {
      const call = this.pendingToolCalls.get(this.chunkToolCallId);
      if (call) call.ended = true;
      this.chunkToolCallId = undefined;
    }
  }

  /** Clear the streaming flag of messages an abandoned run left open (no END will arrive). */
  private settleStreaming(): void {
    for (const id of this.options.graph().getState().lists[chatListKey(this.conversationId)]?.ids ?? []) {
      const message = this.options.graph().getState().readEntity<ChatMessage>(CHAT_MESSAGE_ENTITY, id);
      if (message?.streaming) this.options.graph().getState().replaceEntity(CHAT_MESSAGE_ENTITY, id, { ...message, streaming: false });
    }
  }

  private resetAgentState(): void {
    for (const key of Object.keys(this.agentState)) delete this.agentState[key];
  }

  private readMessage(messageId: string): ChatMessage | undefined {
    return (
      this.options.graph().getState().readEntity<ChatMessage>(
        CHAT_MESSAGE_ENTITY,
        messageEntityId(this.conversationId, messageId),
      ) ?? undefined
    );
  }

  private upsertMessage(message: ChatMessage): void {
    const graph = this.options.graph().getState();
    const id = messageEntityId(this.conversationId, message.id);
    const clean = Object.fromEntries(Object.entries(message).filter(([, value]) => value !== undefined));
    graph.upsertEntity(CHAT_MESSAGE_ENTITY, id, { ...clean, conversationId: this.conversationId });
    const key = chatListKey(this.conversationId);
    const ids = graph.lists[key]?.ids ?? [];
    if (!ids.includes(id)) graph.setListResult(key, [...ids, id], {});
  }

  private readConversation(): ConversationRecord {
    const record = this.options.graph().getState().readEntity<ConversationRecord>(
      CHAT_CONVERSATION_ENTITY,
      this.conversationId,
    );
    return record ?? { runStatus: "idle", error: null, isLoading: false };
  }

  private writeConversation(patch: Partial<ConversationRecord>): void {
    const next = { ...this.readConversation(), ...patch };
    const clean = Object.fromEntries(Object.entries(next).filter(([, value]) => value !== undefined));
    this.options.graph().getState().replaceEntity(CHAT_CONVERSATION_ENTITY, this.conversationId, clean);
  }
}
