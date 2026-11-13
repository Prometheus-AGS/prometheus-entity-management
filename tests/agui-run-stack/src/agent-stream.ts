/**
 * A `streamFactory` backed by the real @ag-ui/client 1.0.x `HttpAgent`: the run
 * goes over HTTP/SSE to the scripted agent, through the client's enforcement,
 * chunk expansion, verification and interrupt bookkeeping, and every event the
 * client applies is handed to the chat store as an `AgUiEvent`.
 *
 * Each call is recorded (signal, resume[], events received and when), so the
 * spec can read what the factory saw.
 */
import { HttpAgent, type Message, type ResumeEntry } from "@ag-ui/client";
import type { AgUiEvent, ChatMessage, ChatStreamContext } from "@prometheus-ags/a2ui-react/ag-ui";

export interface StreamEventRecord {
  type: string;
  at: number;
  /** True when the chat store had already stopped reading this stream. */
  afterConsumerClosed: boolean;
}

export interface StreamRecord {
  label: string;
  url: string;
  startedAt: number;
  historyRoles: string[];
  resume: Array<Record<string, unknown>> | null;
  /** `HttpAgent.pendingInterrupts` before this run: what the real client parsed from the previous run's outcome. */
  clientPendingInterruptIds: string[];
  honoursSignal: boolean;
  signal: AbortSignal;
  abortedAt: number | null;
  transportAborted: boolean;
  events: StreamEventRecord[];
  consumerClosedAt: number | null;
  finished: boolean;
  error: string | null;
  /** Ends the transport of a stream that does not honour its signal. */
  dispose: () => void;
}

/** The serializable view of a record. */
export function describeRecord(record: StreamRecord): Record<string, unknown> {
  return {
    label: record.label,
    url: record.url,
    startedAt: record.startedAt,
    historyRoles: record.historyRoles,
    resume: record.resume,
    clientPendingInterruptIds: record.clientPendingInterruptIds,
    honoursSignal: record.honoursSignal,
    signalAborted: record.signal.aborted,
    abortedAt: record.abortedAt,
    transportAborted: record.transportAborted,
    events: record.events,
    consumerClosedAt: record.consumerClosedAt,
    finished: record.finished,
    error: record.error,
  };
}

/** The conversation as the run input's `messages`, in AG-UI 1.0 message shape. */
export function toAgUiMessages(history: readonly ChatMessage[]): Message[] {
  const messages: Message[] = [];
  for (const message of history) {
    if (message.role === "tool") {
      if (message.toolCallId) {
        messages.push({ id: message.id, role: "tool", content: message.content, toolCallId: message.toolCallId } as Message);
      }
      continue;
    }
    if (message.role === "assistant") {
      messages.push({
        id: message.id,
        role: "assistant",
        content: message.content,
        ...(message.toolCalls && message.toolCalls.length > 0
          ? { toolCalls: message.toolCalls.map((call) => ({ id: call.id, type: "function", function: { ...call.function } })) }
          : {}),
      } as Message);
      continue;
    }
    messages.push({ id: message.id, role: message.role, content: message.content } as Message);
  }
  return messages;
}

function errorText(cause: unknown): string {
  return cause instanceof Error ? cause.message : String(cause);
}

export interface AgentRunOptions {
  label: string;
  agent: HttpAgent;
  history: readonly ChatMessage[];
  context: ChatStreamContext;
  /**
   * Abort the HTTP request when the run's signal aborts (what a consumer
   * should do). UPG-11's superseded stream sets false on purpose: its transport
   * stays open, so its later events demonstrably reach the browser and the
   * store's own guard is what keeps them out of the graph.
   */
  honoursSignal: boolean;
  records: StreamRecord[];
}

/** Run the agent once and expose the applied events as an async iterable. */
export function agentRunStream(options: AgentRunOptions): AsyncIterable<AgUiEvent> {
  const { agent, context } = options;
  const controller = new AbortController();
  const queue: AgUiEvent[] = [];
  let wake: (() => void) | null = null;
  let done = false;
  let failure: unknown = null;
  let consumerClosed = false;
  const notify = (): void => {
    const resolve = wake;
    wake = null;
    resolve?.();
  };

  const record: StreamRecord = {
    label: options.label,
    url: agent.url,
    startedAt: performance.now(),
    historyRoles: options.history.map((message) => message.role),
    resume: context.resume ?? null,
    clientPendingInterruptIds: agent.pendingInterrupts.map((interrupt) => interrupt.id),
    honoursSignal: options.honoursSignal,
    signal: context.signal,
    abortedAt: null,
    transportAborted: false,
    events: [],
    consumerClosedAt: null,
    finished: false,
    error: null,
    dispose: () => controller.abort(),
  };
  options.records.push(record);

  const onAbort = (): void => {
    record.abortedAt = performance.now();
    if (options.honoursSignal) {
      record.transportAborted = true;
      controller.abort();
    }
  };
  if (context.signal.aborted) onAbort();
  else context.signal.addEventListener("abort", onAbort, { once: true });

  agent.setMessages(toAgUiMessages(options.history));
  agent
    .runAgent(
      {
        abortController: controller,
        ...(context.resume ? { resume: context.resume as unknown as ResumeEntry[] } : {}),
      },
      {
        onEvent: ({ event }) => {
          record.events.push({ type: String(event.type), at: performance.now(), afterConsumerClosed: consumerClosed });
          if (!consumerClosed) {
            queue.push(event as unknown as AgUiEvent);
            notify();
          }
        },
      },
    )
    .then(
      () => {
        record.finished = true;
        done = true;
        notify();
      },
      (cause: unknown) => {
        record.error = errorText(cause);
        failure = cause;
        done = true;
        notify();
      },
    );

  return {
    [Symbol.asyncIterator](): AsyncIterator<AgUiEvent> {
      return {
        async next(): Promise<IteratorResult<AgUiEvent>> {
          for (;;) {
            const event = queue.shift();
            if (event) return { value: event, done: false };
            if (failure) throw failure;
            if (done) return { value: undefined, done: true };
            await new Promise<void>((resolve) => {
              wake = resolve;
            });
          }
        },
        async return(): Promise<IteratorResult<AgUiEvent>> {
          consumerClosed = true;
          record.consumerClosedAt = performance.now();
          queue.length = 0;
          return { value: undefined, done: true };
        },
      };
    },
  };
}

/** A fresh `HttpAgent` on the scripted agent's path. */
export function scriptedAgent(agentBase: string, path: string, threadId: string): HttpAgent {
  return new HttpAgent({ url: `${agentBase}/agent/${path}`, threadId });
}
