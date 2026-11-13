/**
 * UPG-2 producer: a recorded scripted agent wrapped by the REAL
 * `@ag-ui/a2ui-middleware` 0.0.16 (with its `@ag-ui/client` 1.0.4 and rxjs
 * 7.8.1 peers). The middleware imports Node's `crypto`, so it runs here, in the
 * Playwright test process; the spec feeds the captured event stream, unchanged,
 * into the built runtime in Chromium.
 *
 * Two recorded runs:
 * - `render`: a `render_a2ui` call whose result carries `a2ui_operations`. The
 *   middleware emits a `building` lifecycle activity at TOOL_CALL_START and the
 *   painted `a2ui-surface` activity at TOOL_CALL_RESULT, under one message id.
 * - `failed`: a generation wrapper whose result reports exhausted recovery
 *   (`a2ui_recovery_exhausted`); the middleware emits a `failed` lifecycle
 *   activity (`content.status: "failed"`).
 */
import { createHash } from "node:crypto";
import { A2UIMiddleware } from "@ag-ui/a2ui-middleware";
import { AbstractAgent, EventType, type BaseEvent, type RunAgentInput } from "@ag-ui/client";
import { Observable } from "rxjs";

type Script = (input: RunAgentInput) => BaseEvent[];

/** Replays a fixed event script; any continuation round only opens and closes a run. */
class ScriptedAgent extends AbstractAgent {
  private readonly script: Script;
  private rounds = 0;

  constructor(script: Script) {
    super({ agentId: "a2ui-v1-scripted-agent", description: "Recorded scripted agent for scripts/verify-a2ui-v1.mjs" });
    this.script = script;
  }

  run(input: RunAgentInput): Observable<BaseEvent> {
    const round = this.rounds++;
    const events =
      round === 0
        ? this.script(input)
        : ([
            { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
            { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId },
          ] as BaseEvent[]);
    return new Observable<BaseEvent>((subscriber) => {
      for (const event of events) subscriber.next(event);
      subscriber.complete();
    });
  }
}

export interface MiddlewareRun {
  name: string;
  agentEvents: BaseEvent[];
  events: Array<Record<string, unknown>>;
  digest: string;
  rounds: number;
}

const RUN_TIMEOUT_MS = 15_000;

async function runThroughMiddleware(name: string, runId: string, script: Script): Promise<MiddlewareRun> {
  const agent = new ScriptedAgent(script);
  const input = {
    threadId: "a2ui-v1-thread",
    runId,
    messages: [],
    tools: [],
    context: [],
    state: {},
    forwardedProps: {},
  } as unknown as RunAgentInput;
  const agentEvents = script(input);
  const middleware = new A2UIMiddleware({});
  const events: Array<Record<string, unknown>> = [];
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${name}: middleware run did not complete in ${RUN_TIMEOUT_MS} ms`)), RUN_TIMEOUT_MS);
    middleware.run(input, agent).subscribe({
      next: (event) => events.push(JSON.parse(JSON.stringify(event)) as Record<string, unknown>),
      error: (cause: unknown) => {
        clearTimeout(timer);
        reject(cause instanceof Error ? cause : new Error(String(cause)));
      },
      complete: () => {
        clearTimeout(timer);
        resolve();
      },
    });
  });
  const digest = createHash("sha256").update(JSON.stringify(events)).digest("hex");
  return { name, agentEvents, events, digest, rounds: (agent as unknown as { rounds: number }).rounds };
}

/** A `render_a2ui` call answered by a result that carries the operations. */
export function runRenderStream(operations: unknown[]): Promise<MiddlewareRun> {
  return runThroughMiddleware("render", "a2ui-v1-render-run", (input) => [
    { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
    { type: EventType.TOOL_CALL_START, toolCallId: "upg2-render", toolCallName: "render_a2ui", parentMessageId: "upg2-assistant-render" },
    { type: EventType.TOOL_CALL_ARGS, toolCallId: "upg2-render", delta: "{}" },
    { type: EventType.TOOL_CALL_END, toolCallId: "upg2-render" },
    {
      type: EventType.TOOL_CALL_RESULT,
      messageId: "upg2-render-result",
      toolCallId: "upg2-render",
      role: "tool",
      content: JSON.stringify({ a2ui_operations: operations }),
    },
    { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId },
  ] as BaseEvent[]);
}

/** A generation wrapper whose result reports that recovery was exhausted. */
export function runFailedStream(failedResult: unknown): Promise<MiddlewareRun> {
  return runThroughMiddleware("failed", "a2ui-v1-failed-run", (input) => [
    { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
    { type: EventType.TOOL_CALL_START, toolCallId: "upg2-generate", toolCallName: "generate_a2ui", parentMessageId: "upg2-assistant-generate" },
    { type: EventType.TOOL_CALL_ARGS, toolCallId: "upg2-generate", delta: "{}" },
    { type: EventType.TOOL_CALL_END, toolCallId: "upg2-generate" },
    {
      type: EventType.TOOL_CALL_RESULT,
      messageId: "upg2-generate-result",
      toolCallId: "upg2-generate",
      role: "tool",
      content: JSON.stringify(failedResult),
    },
    { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId },
  ] as BaseEvent[]);
}
