import { expect, test, type Locator, type Page } from "@playwright/test";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/*
 * UPG-10, UPG-11, UPG-12 against the built @prometheus-ags/a2ui-react `./ag-ui`
 * in Chromium. Each test runs one scenario's oracle AND its negative control
 * and appends one result to AGUI_RUN_STACK_RESULTS (JSON Lines) as soon as it
 * finishes, because Playwright restarts the worker after a failed test.
 * scripts/verify-agui-run-stack.mjs judges the results; a control that is not
 * exercised, or does not hold, fails the run.
 */

declare global {
  interface Window {
    __aguiRunStack: { scenario: string; snapshot(): Record<string, unknown>; dispose(): void };
  }
}

const resultsPath = process.env.AGUI_RUN_STACK_RESULTS;
if (!resultsPath) throw new Error("AGUI_RUN_STACK_RESULTS must name the results file.");
const agentBase = `http://127.0.0.1:${process.env.AGUI_RUN_STACK_AGENT_PORT ?? 4212}`;
const fixtures = JSON.parse(readFileSync(resolve(process.cwd(), "tests/agui-run-stack/fixtures.json"), "utf8")) as Fixtures;

// ── fixture and snapshot shapes (what fixtures.json and the page return) ──

interface CaseFixture {
  role: "oracle" | "negativeControl";
  interruptId: string;
  reason: string;
  message: string;
  decision: "approve" | "deny" | "edit-then-approve";
  edited?: Record<string, unknown>;
  action: { name: string; context: { entityType: string; entityId: string; data: Record<string, unknown> } };
}

interface Fixtures {
  upg10: {
    conversationId: string;
    otherConversationId: string;
    userText: string;
    midGate: string;
    reasoning: { messageId: string; text: string };
    text: { messageId: string; beforeGate: string; afterGate: string };
    toolCall: { id: string; name: string; argsChunks: string[] };
    toolResult: { messageId: string; content: string };
    probe: { userText: string; messageId: string; text: string };
  };
  upg11: {
    gate: string;
    lateDeltas: number;
    first: { userText: string; messageId: string; beforeGate: string; lateMessageId: string };
    second: { userText: string; messageId: string; text: string };
    control: { userText: string; messageId: string; beforeGate: string; lateMessageId: string };
  };
  upg12: { userText: string; cases: Record<string, CaseFixture> };
}

interface StreamSnapshot {
  label: string;
  url: string;
  resume: Array<Record<string, unknown>> | null;
  clientPendingInterruptIds: string[];
  honoursSignal: boolean;
  signalAborted: boolean;
  abortedAt: number | null;
  transportAborted: boolean;
  events: Array<{ type: string; at: number; afterConsumerClosed: boolean }>;
  consumerClosedAt: number | null;
  finished: boolean;
  error: string | null;
}

interface MessageEntity {
  id: string;
  role: string;
  content: string;
  streaming?: boolean;
  toolCallId?: string;
  toolCalls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
}

interface ConversationSnapshot {
  conversationId: string;
  ids: string[];
  messages: Array<MessageEntity | null>;
  conversation: { runStatus?: string; runId?: string; isLoading?: boolean; error?: string | null } | null;
}

interface AgentRun {
  seq: number;
  script: string;
  case: string | null;
  threadId: string;
  runId: string;
  resume: Array<Record<string, unknown>> | null;
  sent: string[];
  waitingAt: string | null;
  completed: boolean;
  clientClosed: boolean;
  error: string | null;
}

interface DomMessage {
  id: string;
  role: string;
  text: string;
  content: string;
}

// ── results ──

interface Check {
  name: string;
  pass: boolean;
  detail?: unknown;
}

interface Part {
  status: "PASS" | "FAIL" | "NOT_EXERCISED";
  exercised: boolean;
  checks: Check[];
  evidence: Record<string, unknown>;
}

interface ScenarioResult {
  kind: "scenario";
  id: string;
  name: string;
  oracle: Part;
  negativeControl: Part;
  pageErrors: string[];
  error?: string;
}

function part(): Part {
  return { status: "NOT_EXERCISED", exercised: false, checks: [], evidence: {} };
}

function check(target: Part, name: string, pass: boolean, detail?: unknown): void {
  target.checks.push(detail === undefined ? { name, pass } : { name, pass, detail });
}

function settle(target: Part, exercised: boolean): void {
  target.exercised = exercised;
  target.status = !exercised ? "NOT_EXERCISED" : target.checks.length > 0 && target.checks.every((item) => item.pass) ? "PASS" : "FAIL";
}

function record(result: ScenarioResult): void {
  mkdirSync(dirname(resultsPath as string), { recursive: true });
  appendFileSync(resultsPath as string, `${JSON.stringify(result)}\n`);
}

// ── helpers ──

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>).filter(([, item]) => item !== undefined);
    return `{${entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}

function digest(value: unknown): string {
  return createHash("sha256").update(stable(value)).digest("hex");
}

function same(a: unknown, b: unknown): boolean {
  return stable(a) === stable(b);
}

async function agentLog(): Promise<{ encoderVersion: string; runs: AgentRun[]; gates: Record<string, boolean> }> {
  const response = await fetch(`${agentBase}/log`);
  return response.json() as Promise<{ encoderVersion: string; runs: AgentRun[]; gates: Record<string, boolean> }>;
}

async function release(gate: string): Promise<void> {
  const response = await fetch(`${agentBase}/gate/${gate}`, { method: "POST" });
  if (!response.ok) throw new Error(`releasing gate ${gate}: HTTP ${response.status}`);
}

/** Wait (deterministically, by polling the agent's log) for a run matching `predicate`. */
async function waitForRun(predicate: (run: AgentRun) => boolean, what: string): Promise<AgentRun> {
  let found: AgentRun | undefined;
  await expect.poll(async () => {
    found = (await agentLog()).runs.find(predicate);
    return Boolean(found);
  }, { message: `agent run: ${what}`, timeout: 20_000 }).toBe(true);
  return found as AgentRun;
}

async function open(page: Page, scenario: string, pageErrors: string[]): Promise<void> {
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto(`/?scenario=${scenario}&agent=${encodeURIComponent(agentBase)}`);
  await page.waitForFunction(() => document.documentElement.dataset.aguiRunStackReady === "true" || Boolean(document.documentElement.dataset.aguiRunStackError));
  const error = await page.evaluate(() => document.documentElement.dataset.aguiRunStackError ?? null);
  if (error) throw new Error(`page setup failed: ${error}`);
}

async function snapshot<T>(page: Page): Promise<T> {
  return page.evaluate(() => window.__aguiRunStack.snapshot()) as Promise<T>;
}

async function domList(view: Locator): Promise<DomMessage[]> {
  return view.locator("li[data-message-id]").evaluateAll((items) =>
    items.map((item) => ({
      id: item.getAttribute("data-message-id") ?? "",
      role: item.getAttribute("data-role") ?? "",
      text: (item.textContent ?? "").trim(),
      // The message body alone; the bubble also lists tool calls under it.
      content: (item.querySelector(".a2ui-msg__content")?.textContent ?? "").replace("▍", "").trim(),
    })));
}

function message(snapshotOf: ConversationSnapshot, id: string): MessageEntity | undefined {
  return snapshotOf.messages.find((item): item is MessageEntity => item?.id === id);
}

function harnessError(cause: unknown): string {
  return cause instanceof Error ? cause.message.split("\n")[0] ?? cause.message : String(cause);
}

const UPG10_EVENT_TYPES = [
  "RUN_STARTED",
  "REASONING_START", "REASONING_MESSAGE_START", "REASONING_MESSAGE_CONTENT", "REASONING_MESSAGE_END", "REASONING_END",
  "TEXT_MESSAGE_START", "TEXT_MESSAGE_CONTENT", "TEXT_MESSAGE_END",
  "TOOL_CALL_START", "TOOL_CALL_ARGS", "TOOL_CALL_END", "TOOL_CALL_RESULT",
  "RUN_FINISHED",
];

// ── UPG-10 ──

test("UPG-10 AG-UI 1.0 run stream drives EntityChat through the graph", async ({ page }) => {
  const f = fixtures.upg10;
  const oracle = part();
  const control = part();
  const pageErrors: string[] = [];
  const result: ScenarioResult = { kind: "scenario", id: "UPG-10", name: "AG-UI 1.0 run stream drives EntityChat through the graph", oracle, negativeControl: control, pageErrors };
  let oracleReached = false;
  let controlReached = false;
  try {
    await open(page, "upg10", pageErrors);
    const chat = page.locator('[data-view="chat"]');
    const mirror = page.locator('[data-view="mirror"]');
    const other = page.locator('[data-view="other"]');
    const input = chat.getByLabel("Message input");

    await input.fill(f.userText);
    await chat.getByRole("button", { name: "Send message" }).click();

    // Mid-run: the agent holds the stream inside the text message.
    const run = await waitForRun((item) => item.script === "upg10" && item.waitingAt === f.midGate, "upg10 paused at the mid gate");
    const textItem = chat.locator(`li[data-message-id="${f.text.messageId}"]`);
    await expect(textItem).toContainText(f.text.beforeGate.trim());
    await expect.poll(async () => same(await domList(mirror), await domList(chat))).toBe(true);
    const midGraph = (await snapshot<{ graph: { main: ConversationSnapshot } }>(page)).graph.main;
    const mid = {
      inputDisabled: await input.isDisabled(),
      cursorShown: (await textItem.locator(".a2ui-msg__cursor").count()) === 1,
      conversation: midGraph.conversation,
      chat: await domList(chat),
      mirror: await domList(mirror),
    };
    oracle.evidence.midRun = { ...mid, agentRunId: run.runId };
    check(oracle, "RUN_STARTED: the graph records the run as running with the agent's runId, and EntityChat disables its input",
      mid.conversation?.runStatus === "running" && mid.conversation?.runId === run.runId && mid.inputDisabled,
      { runStatus: mid.conversation?.runStatus, runId: mid.conversation?.runId, agentRunId: run.runId, inputDisabled: mid.inputDisabled });
    check(oracle, "TEXT_MESSAGE_CONTENT renders while the message streams (streaming cursor shown)", mid.cursorShown);
    check(oracle, "mid-run, the second view shows the same partial messages", same(mid.chat, mid.mirror), { chat: mid.chat, mirror: mid.mirror });

    await release(f.midGate);
    await expect(chat.locator(`li[data-message-id="${f.toolResult.messageId}"]`)).toBeVisible();
    await expect(input).toBeEnabled();
    await expect.poll(async () => (await snapshot<{ graph: { main: ConversationSnapshot } }>(page)).graph.main.conversation?.runStatus).toBe("finished");
    await expect.poll(async () => same(await domList(mirror), await domList(chat))).toBe(true);

    const final = await snapshot<{ graph: { main: ConversationSnapshot; other: ConversationSnapshot }; streams: StreamSnapshot[]; mirrorFactoryCalls: number }>(page);
    const chatList = await domList(chat);
    const mirrorList = await domList(mirror);
    const otherList = await domList(other);
    const otherText = (await other.textContent()) ?? "";
    const chatText = (await chat.textContent()) ?? "";
    const agentRun = (await agentLog()).runs.find((item) => item.seq === run.seq);
    const stream = final.streams.find((item) => item.label === "main");
    const main = final.graph.main;
    const byId = new Map(chatList.map((item) => [item.id, item]));
    const reasoning = byId.get(f.reasoning.messageId);
    const text = byId.get(f.text.messageId);
    const tool = byId.get(f.toolResult.messageId);
    const assistant = message(main, f.text.messageId);
    const expectedArgs = f.toolCall.argsChunks.join("");
    oracleReached = true;

    oracle.evidence.graphSnapshotDigest = digest(main);
    oracle.evidence.graphSnapshot = main;
    oracle.evidence.domDigests = { chat: digest(chatList), mirror: digest(mirrorList) };
    oracle.evidence.dom = { chat: chatList, mirror: mirrorList };
    oracle.evidence.clientEventTypes = stream?.events.map((item) => item.type) ?? null;
    oracle.evidence.agentRun = agentRun ?? null;

    check(oracle, "the run went through @ag-ui/client without error and every scripted event type reached the store",
      Boolean(stream?.finished) && stream?.error === null && UPG10_EVENT_TYPES.every((type) => stream?.events.some((item) => item.type === type)),
      { finished: stream?.finished, error: stream?.error, missing: UPG10_EVENT_TYPES.filter((type) => !stream?.events.some((item) => item.type === type)) });
    check(oracle, "the scripted agent sent the whole run and the client kept the stream to the end",
      Boolean(agentRun?.completed) && UPG10_EVENT_TYPES.every((type) => agentRun?.sent.includes(type)), { sent: agentRun?.sent, completed: agentRun?.completed });
    check(oracle, "the user's message renders", chatList.some((item) => item.role === "user" && item.text === f.userText));
    check(oracle, "REASONING_* renders as a collapsed reasoning message with its content",
      reasoning?.role === "reasoning" && reasoning.text.includes("Reasoning") && reasoning.text.includes(f.reasoning.text)
        && message(main, f.reasoning.messageId)?.streaming === false,
      { dom: reasoning, graph: message(main, f.reasoning.messageId) });
    check(oracle, "TEXT_MESSAGE_START/CONTENT/END render the complete assistant message, no longer streaming",
      text?.role === "assistant" && text.content === `${f.text.beforeGate}${f.text.afterGate}` && assistant?.streaming === false
        && (await chat.locator(".a2ui-msg__cursor").count()) === 0,
      { dom: text, graph: assistant });
    check(oracle, "TOOL_CALL_START/ARGS/END land on the assistant message in the graph (name and full arguments)",
      same(assistant?.toolCalls, [{ id: f.toolCall.id, type: "function", function: { name: f.toolCall.name, arguments: expectedArgs } }]),
      { toolCalls: assistant?.toolCalls });
    check(oracle, "TOOL_CALL_START/ARGS/END render in EntityChat (the tool call's name is shown)",
      chatText.includes(f.toolCall.name),
      { looksFor: f.toolCall.name, note: "EntityChat's default message bubble renders message.content only (packages/a2ui-react/src/entity-chat.tsx MessageBubble)" });
    check(oracle, "TOOL_CALL_RESULT renders as a tool message with the result content",
      tool?.role === "tool" && tool.text === f.toolResult.content && message(main, f.toolResult.messageId)?.toolCallId === f.toolCall.id,
      { dom: tool, graph: message(main, f.toolResult.messageId) });
    check(oracle, "RUN_FINISHED: the graph records the run finished, the input is enabled and no typing indicator shows",
      main.conversation?.runStatus === "finished" && main.conversation?.isLoading === false && (await input.isEnabled())
        && (await chat.locator(".a2ui-msg--typing").count()) === 0,
      { conversation: main.conversation });
    check(oracle, "messages render in stream order: user, reasoning, assistant, tool result",
      same(chatList.map((item) => item.role), ["user", "reasoning", "assistant", "tool"]), { order: chatList.map((item) => `${item.role}:${item.id}`) });
    check(oracle, "the second view (same conversation id) shows exactly the same messages, read from the graph",
      same(chatList, mirrorList) && mirrorList.length === 4 && final.mirrorFactoryCalls === 0,
      { chatDigest: digest(chatList), mirrorDigest: digest(mirrorList), mirrorFactoryCalls: final.mirrorFactoryCalls });
    check(oracle, "the graph holds the conversation's messages under its list key", same(main.ids.length, 4), { ids: main.ids });

    // Negative control: the view on another conversation shows none of them.
    const expectedTexts = [f.userText, f.reasoning.text, `${f.text.beforeGate}${f.text.afterGate}`, f.toolResult.content, f.toolCall.name];
    control.evidence.before = { dom: otherList, domDigest: digest(otherList), graph: final.graph.other, graphDigest: digest(final.graph.other) };
    check(control, "the other conversation's view shows no messages", otherList.length === 0, { dom: otherList });
    check(control, "the other conversation's view contains none of the run's texts",
      expectedTexts.every((item) => !otherText.includes(item)), { leaked: expectedTexts.filter((item) => otherText.includes(item)) });
    check(control, "the other conversation has no messages in the graph", final.graph.other.ids.length === 0, { ids: final.graph.other.ids });

    // Liveness: the control view renders its own conversation's messages, so its emptiness above is meaningful.
    const otherInput = other.getByLabel("Message input");
    await otherInput.fill(f.probe.userText);
    await other.getByRole("button", { name: "Send message" }).click();
    await expect(other.locator(`li[data-message-id="${f.probe.messageId}"]`)).toContainText(f.probe.text);
    await expect(otherInput).toBeEnabled();
    const afterProbe = { chat: await domList(chat), mirror: await domList(mirror), other: await domList(other) };
    controlReached = true;
    control.evidence.afterProbe = { ...afterProbe, digests: { chat: digest(afterProbe.chat), mirror: digest(afterProbe.mirror), other: digest(afterProbe.other) } };
    check(control, "liveness: the control view renders its own conversation's run",
      afterProbe.other.some((item) => item.id === f.probe.messageId && item.text === f.probe.text), { other: afterProbe.other });
    check(control, "liveness: the probe run does not appear in either view of the main conversation",
      same(afterProbe.chat, chatList) && same(afterProbe.mirror, mirrorList), { chatDigest: digest(afterProbe.chat), mirrorDigest: digest(afterProbe.mirror) });
    check(oracle, "no uncaught page errors", pageErrors.length === 0, pageErrors);
  } catch (cause) {
    result.error = `harness error: ${harnessError(cause)}`;
  }
  settle(oracle, oracleReached);
  settle(control, controlReached && oracle.exercised);
  record(result);
  expect(result.error, result.error).toBeUndefined();
  expect(oracle.status, JSON.stringify(oracle.checks.filter((item) => !item.pass))).toBe("PASS");
  expect(control.status, JSON.stringify(control.checks.filter((item) => !item.pass))).toBe("PASS");
});

// ── UPG-11 ──

interface Upg11Snapshot {
  supersede: { seq: number; at: number } | null;
  writes: Array<{ seq: number; bucket: string; conversationId: string; messageId: string; at: number }>;
  writesBeforeSupersede: Record<string, number> | null;
  writesAfterSupersede: Record<string, number> | null;
  streams: StreamSnapshot[];
  graph: { superseded: ConversationSnapshot; control: ConversationSnapshot };
}

test("UPG-11 Cancellation stops superseded streams", async ({ page }) => {
  const f = fixtures.upg11;
  const oracle = part();
  const control = part();
  const pageErrors: string[] = [];
  const result: ScenarioResult = { kind: "scenario", id: "UPG-11", name: "Cancellation stops superseded streams", oracle, negativeControl: control, pageErrors };
  let reached = false;
  try {
    await open(page, "upg11", pageErrors);
    const superseded = page.locator('[data-view="superseded"]');
    const controlView = page.locator('[data-view="control"]');

    await page.locator("#send-first").click();
    await waitForRun((item) => item.script === "upg11-a" && item.waitingAt === f.gate, "stream A paused at the gate");
    await expect(superseded.locator(`li[data-message-id="${f.first.messageId}"]`)).toContainText(f.first.beforeGate.trim());

    await page.locator("#send-control").click();
    await waitForRun((item) => item.script === "upg11-c" && item.waitingAt === f.gate, "stream C paused at the gate");
    await expect(controlView.locator(`li[data-message-id="${f.control.messageId}"]`)).toContainText(f.control.beforeGate.trim());

    // The second send supersedes A while A is still open on the wire.
    await page.locator("#send-second").click();
    await expect(superseded.locator(`li[data-message-id="${f.second.messageId}"]`)).toContainText(f.second.text);
    await expect(superseded).toHaveAttribute("data-run-status", "finished");

    // Now A and C emit their later events.
    await release(f.gate);
    const runA = await waitForRun((item) => item.script === "upg11-a" && (item.completed || item.clientClosed), "stream A finished sending");
    const runC = await waitForRun((item) => item.script === "upg11-c" && (item.completed || item.clientClosed), "stream C finished sending");
    await expect.poll(async () => {
      const first = (await snapshot<Upg11Snapshot>(page)).streams.find((item) => item.label === "first");
      return Boolean(first && (first.finished || first.error !== null));
    }, { message: "the client finished receiving stream A" }).toBe(true);
    await expect(controlView.locator(`li[data-message-id="${f.control.lateMessageId}"]`)).toContainText("c-late-message");
    await expect(controlView).toHaveAttribute("data-run-status", "finished");

    const s = await snapshot<Upg11Snapshot>(page);
    const log = await agentLog();
    const runB = log.runs.find((item) => item.script === "upg11-b");
    const first = s.streams.find((item) => item.label === "first");
    const second = s.streams.find((item) => item.label === "second");
    const ctl = s.streams.find((item) => item.label === "control");
    const supersedeAt = s.supersede?.at ?? Number.POSITIVE_INFINITY;
    const firstLate = first?.events.filter((item) => item.at > supersedeAt) ?? [];
    const controlLate = ctl?.events.filter((item) => item.at > supersedeAt) ?? [];
    const after = s.writesAfterSupersede ?? {};
    const before = s.writesBeforeSupersede ?? {};
    const supersededDom = await domList(superseded);
    const controlDom = await domList(controlView);
    const firstMessage = message(s.graph.superseded, f.first.messageId);
    reached = true;

    const writeCounts = { beforeSupersede: before, afterSupersede: after };
    oracle.evidence.graphWriteCounts = writeCounts;
    oracle.evidence.supersede = s.supersede;
    oracle.evidence.streams = { first, second };
    oracle.evidence.agentRuns = { a: runA, b: runB ?? null };
    oracle.evidence.dom = supersededDom;
    oracle.evidence.graph = s.graph.superseded;
    control.evidence.graphWriteCounts = writeCounts;
    control.evidence.stream = ctl;
    control.evidence.agentRun = runC;
    control.evidence.dom = controlDom;
    oracle.evidence.writes = s.writes;

    check(oracle, "the second send was recorded as the supersede point", s.supersede !== null);
    check(oracle, "the AbortSignal passed to streamFactory for the first run is aborted, at or after the second send",
      first?.signalAborted === true && first.abortedAt !== null && first.abortedAt >= supersedeAt,
      { signalAborted: first?.signalAborted, abortedAt: first?.abortedAt, supersedeAt });
    check(oracle, "the second run's signal is not aborted", second?.signalAborted === false, { signalAborted: second?.signalAborted });
    check(oracle, "the first stream's later events were sent by the agent after the second send",
      runA.completed && runA.sent.filter((type) => type === "TEXT_MESSAGE_CONTENT").length === f.lateDeltas + 2,
      { sent: runA.sent, completed: runA.completed, clientClosed: runA.clientClosed });
    check(oracle, "the first stream's later events reached the browser through @ag-ui/client (non-vacuous)",
      firstLate.length >= f.lateDeltas, { laterEventsReceived: firstLate.length, types: firstLate.map((item) => item.type) });
    check(oracle, "the counter observed the first stream while it was current", (before.first ?? 0) > 0, { first: before.first ?? 0 });
    check(oracle, "the first stream's later events cause zero graph writes", (after.first ?? 0) === 0, { first: after.first ?? 0 });
    check(oracle, "the first stream's message is unchanged and its later message was never created",
      firstMessage?.content === f.first.beforeGate && !message(s.graph.superseded, f.first.lateMessageId)
        && !supersededDom.some((item) => item.text.includes("a-late")),
      { content: firstMessage?.content, dom: supersededDom });
    check(oracle, "the conversation record belongs to the second run (the first run's RUN_FINISHED wrote nothing)",
      s.graph.superseded.conversation?.runStatus === "finished" && s.graph.superseded.conversation?.runId === runB?.runId,
      { conversation: s.graph.superseded.conversation, secondRunId: runB?.runId });
    check(oracle, "the second stream rendered and wrote to the graph", (after.second ?? 0) > 0 && Boolean(second?.finished), { second: after.second ?? 0 });

    // Negative control: the un-superseded stream keeps writing after the same instant.
    const expectedControlWrites = f.lateDeltas + 1 + 3;
    check(control, "the control stream emitted later events after the second send, and the browser received them",
      runC.completed && controlLate.length >= f.lateDeltas, { laterEventsReceived: controlLate.length });
    check(control, "the control stream's later events DO write to the graph (the counter observes writes)",
      (after.control ?? 0) >= expectedControlWrites, { control: after.control ?? 0, expectedAtLeast: expectedControlWrites });
    check(control, "the control stream's later content renders",
      controlDom.some((item) => item.id === f.control.messageId && item.text.includes(`c-late-${f.lateDeltas - 1}`))
        && controlDom.some((item) => item.id === f.control.lateMessageId), { dom: controlDom });
    check(control, "the control stream's signal was never aborted and the run finished", ctl?.signalAborted === false && Boolean(ctl?.finished),
      { signalAborted: ctl?.signalAborted, finished: ctl?.finished });
    check(oracle, "no uncaught page errors", pageErrors.length === 0, pageErrors);
  } catch (cause) {
    result.error = `harness error: ${harnessError(cause)}`;
  }
  await page.evaluate(() => window.__aguiRunStack?.dispose()).catch(() => undefined);
  settle(oracle, reached);
  settle(control, reached);
  record(result);
  expect(result.error, result.error).toBeUndefined();
  expect(oracle.status, JSON.stringify(oracle.checks.filter((item) => !item.pass))).toBe("PASS");
  expect(control.status, JSON.stringify(control.checks.filter((item) => !item.pass))).toBe("PASS");
});

// ── UPG-12 ──

interface AuditRecord {
  seq: number;
  status: string;
  name: string | null;
  sourceComponentId: string | null;
  context: Record<string, unknown> | null;
  code?: string;
  reason?: string;
}

interface Upg12Snapshot {
  entities: Record<string, { type: string; id: string; base: unknown; patch: unknown; merged: Record<string, unknown> | null }>;
  audit: AuditRecord[];
  interruptDecisions: Array<{ case: string; interruptId: string; entry: Record<string, unknown>; policyDecision: Record<string, unknown> | null }>;
  streams: StreamSnapshot[];
  conversations: Record<string, ConversationSnapshot>;
}

function entityDigest(entity: { base: unknown; patch: unknown } | undefined): string {
  return digest({ base: entity?.base ?? null, patch: entity?.patch ?? null });
}

test("UPG-12 Interrupt approvals through the entity action policy", async ({ page }) => {
  const oracle = part();
  const control = part();
  const pageErrors: string[] = [];
  const result: ScenarioResult = { kind: "scenario", id: "UPG-12", name: "Interrupt approvals through the entity action policy", oracle, negativeControl: control, pageErrors };
  const completed = { oracle: 0, control: 0 };
  try {
    await open(page, "upg12", pageErrors);
    for (const [caseName, c] of Object.entries(fixtures.upg12.cases)) {
      const target = c.role === "oracle" ? oracle : control;
      const view = page.locator(`[data-view="upg12-${caseName}"]`);
      const entityKey = `${c.action.context.entityType}:${c.action.context.entityId}`;
      const before = (await snapshot<Upg12Snapshot>(page)).entities[entityKey];

      await view.getByLabel("Message input").fill(fixtures.upg12.userText);
      await view.getByRole("button", { name: "Send message" }).click();
      const group = view.getByRole("group", { name: `Approval needed: ${c.reason}` });
      await expect(group).toBeVisible();
      const shownId = await group.getAttribute("data-interrupt-id");
      const paused = (await snapshot<Upg12Snapshot>(page)).conversations[caseName].conversation;

      if (c.decision === "edit-then-approve") await group.locator("textarea").fill(JSON.stringify(c.edited, null, 2));
      await group.getByRole("button", { name: c.decision === "deny" ? "Deny" : "Approve" }).click();
      const resumeRun = await waitForRun((item) => item.script === "upg12" && item.case === caseName && Array.isArray(item.resume) && item.completed, `upg12 ${caseName} resume run`);
      const resumeItem = view.locator(`li[data-message-id="resume-${caseName}"]`);
      await expect(resumeItem).toBeVisible();
      await expect(group).toHaveCount(0);

      const after = await snapshot<Upg12Snapshot>(page);
      const log = await agentLog();
      const firstRun = log.runs.find((item) => item.script === "upg12" && item.case === caseName && item.resume === null);
      const clientResumeStream = after.streams.find((item) => item.label === `upg12-${caseName}` && item.resume !== null);
      const auditRecords = after.audit.filter((item) => item.sourceComponentId === c.interruptId);
      const decision = after.interruptDecisions.find((item) => item.interruptId === c.interruptId);
      const entityAfter = after.entities[entityKey];
      const resumeText = ((await resumeItem.textContent()) ?? "").trim();
      const serverResume = resumeRun.resume ?? [];
      const evidence = {
        interruptShown: { dataInterruptId: shownId, conversationBeforeDecision: paused },
        firstRun: firstRun ?? null,
        resumePayloads: { agentReceived: serverResume, streamFactoryContext: clientResumeStream?.resume ?? null },
        clientPendingInterruptIds: clientResumeStream?.clientPendingInterruptIds ?? null,
        auditRecords,
        interruptDecision: decision ?? null,
        entityDigests: { before: entityDigest(before), after: entityDigest(entityAfter) },
        entities: { before, after: entityAfter },
        resumeRendered: resumeText,
      };
      target.evidence[caseName] = evidence;
      const label = (text: string): string => `${caseName}: ${text}`;

      check(target, label("the interrupt outcome shows the approval UI (EntityInterruptApproval) for that interrupt"),
        shownId === c.interruptId && paused?.runStatus === "interrupted", { shownId, runStatus: paused?.runStatus });
      check(target, label("@ag-ui/client tracked the interrupt as pending before the resume run (it parsed the outcome)"),
        Boolean(clientResumeStream?.clientPendingInterruptIds.includes(c.interruptId)), { pending: clientResumeStream?.clientPendingInterruptIds });
      check(target, label("the resume run's resume[] passed to streamFactory is what the agent received"),
        same(clientResumeStream?.resume, serverResume) && serverResume.length === 1, { client: clientResumeStream?.resume, agent: serverResume });

      if (caseName === "approve" || caseName === "edit") {
        const payload = caseName === "edit" ? c.edited : c.action.context;
        check(target, label("resume[] carries the approval: resolved with the approved values"),
          same(serverResume, [{ interruptId: c.interruptId, status: "resolved", payload }]), { resume: serverResume, expectedPayload: payload });
        check(target, label("the policy audit records one executed decision with those values"),
          auditRecords.length === 1 && auditRecords[0].status === "executed" && auditRecords[0].name === c.action.name && same(auditRecords[0].context, payload),
          { auditRecords });
        const data = (payload as { data: Record<string, unknown> }).data;
        check(target, label("the guarded entity now holds the approved values"),
          Object.entries(data).every(([key, value]) => same(entityAfter?.merged?.[key], value)) && entityDigest(before) !== entityDigest(entityAfter),
          { before: before?.merged, after: entityAfter?.merged });
        check(target, label("the resumed run renders"), resumeText.startsWith("resume resolved"), { resumeText });
        completed.oracle += 1;
      } else if (caseName === "deny") {
        check(target, label("deny resumes with a denial (cancelled, denied-by-user)"),
          same(serverResume, [{ interruptId: c.interruptId, status: "cancelled", payload: { reason: "denied-by-user" } }]), { resume: serverResume });
        check(target, label("deny does not reach the policy (no audit record)"), auditRecords.length === 0, { auditRecords });
        check(target, label("the guarded entity is unchanged"), entityDigest(before) === entityDigest(entityAfter), { before, after: entityAfter });
        check(target, label("the resumed run renders the denial"), resumeText.startsWith("resume cancelled"), { resumeText });
        completed.control += 1;
      } else {
        const entry = serverResume[0] as { status?: string; payload?: { code?: string; reason?: string } } | undefined;
        check(target, label("an approved action on a disallowed entity is refused by policy (audit: denied, unauthorized)"),
          auditRecords.length === 1 && auditRecords[0].status === "denied" && auditRecords[0].code === "unauthorized",
          { auditRecords });
        check(target, label("resume[] carries the refusal (cancelled with the policy's code and reason)"),
          entry?.status === "cancelled" && entry.payload?.code === "unauthorized" && typeof entry.payload?.reason === "string" && entry.payload.reason.includes("not allowlisted"),
          { resume: serverResume });
        check(target, label("the disallowed entity is unchanged"), entityDigest(before) === entityDigest(entityAfter), { before, after: entityAfter });
        completed.control += 1;
      }
    }
    check(oracle, "no uncaught page errors", pageErrors.length === 0, pageErrors);
  } catch (cause) {
    result.error = `harness error: ${harnessError(cause)}`;
  }
  settle(oracle, completed.oracle === 2);
  settle(control, completed.control === 2);
  record(result);
  expect(result.error, result.error).toBeUndefined();
  expect(oracle.status, JSON.stringify(oracle.checks.filter((item) => !item.pass))).toBe("PASS");
  expect(control.status, JSON.stringify(control.checks.filter((item) => !item.pass))).toBe("PASS");
});
