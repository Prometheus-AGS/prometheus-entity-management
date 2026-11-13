#!/usr/bin/env node
/**
 * Scripted AG-UI 1.0 agent for UPG-10, UPG-11 and UPG-12, served over SSE on a
 * scratch port. Events are encoded by the real @ag-ui/encoder 1.0.x
 * (`EventEncoder.encodeSSE`); the page consumes them with the real
 * @ag-ui/client 1.0.x `HttpAgent`.
 *
 *   POST /agent/<script>[/<case>]   RunAgentInput in, SSE event stream out
 *   POST /gate/<name>               release a gate a script is waiting on
 *   GET  /log                       every run received: input resume[], events sent, gate state
 *   GET  /health                    readiness for Playwright's webServer
 *
 * Gates make the streams deterministic: a script pauses at `{ gate }` until the
 * spec releases it, so the browser is observed mid-run without timing guesses.
 * Started by tests/browser/agui-run-stack.playwright.config.ts.
 */
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { EventEncoder } from "@ag-ui/encoder";
import { EventType } from "@ag-ui/core";

const here = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(join(here, "fixtures.json"), "utf8"));
const require = createRequire(import.meta.url);
const encoderVersion = require("@ag-ui/encoder/package.json").version;
const port = Number(process.env.AGUI_RUN_STACK_AGENT_PORT ?? 4212);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, accept",
};

/** @type {Array<Record<string, unknown>>} */
const runs = [];
/** @type {Map<string, { released: boolean, promise: Promise<void>, release: () => void }>} */
const gates = new Map();

function gate(name) {
  let entry = gates.get(name);
  if (!entry) {
    let release = () => {};
    const promise = new Promise((resolve) => {
      release = resolve;
    });
    entry = { released: false, promise, release: () => {} };
    entry.release = () => {
      entry.released = true;
      release();
    };
    gates.set(name, entry);
  }
  return entry;
}

const text = (messageId, parts, role = "assistant") => [
  { type: EventType.TEXT_MESSAGE_START, messageId, role },
  ...parts.map((delta) => (typeof delta === "string" ? { type: EventType.TEXT_MESSAGE_CONTENT, messageId, delta } : delta)),
  { type: EventType.TEXT_MESSAGE_END, messageId },
];

/** Each script returns the steps of one run: an AG-UI event, or `{ gate: name }`. */
const scripts = {
  upg10: (input) => {
    const f = fixtures.upg10;
    return [
      { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
      { type: EventType.REASONING_START, messageId: f.reasoning.messageId },
      { type: EventType.REASONING_MESSAGE_START, messageId: f.reasoning.messageId, role: "reasoning" },
      { type: EventType.REASONING_MESSAGE_CONTENT, messageId: f.reasoning.messageId, delta: f.reasoning.text },
      { type: EventType.REASONING_MESSAGE_END, messageId: f.reasoning.messageId },
      { type: EventType.REASONING_END, messageId: f.reasoning.messageId },
      ...text(f.text.messageId, [f.text.beforeGate, { gate: f.midGate }, f.text.afterGate]),
      { type: EventType.TOOL_CALL_START, toolCallId: f.toolCall.id, toolCallName: f.toolCall.name, parentMessageId: f.text.messageId },
      ...f.toolCall.argsChunks.map((delta) => ({ type: EventType.TOOL_CALL_ARGS, toolCallId: f.toolCall.id, delta })),
      { type: EventType.TOOL_CALL_END, toolCallId: f.toolCall.id },
      { type: EventType.TOOL_CALL_RESULT, messageId: f.toolResult.messageId, toolCallId: f.toolCall.id, content: f.toolResult.content },
      { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId, outcome: { type: "success" } },
    ];
  },
  "upg10-probe": (input) => [
    { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
    ...text(fixtures.upg10.probe.messageId, [fixtures.upg10.probe.text]),
    { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId },
  ],
  // The superseded stream: it keeps sending after the gate, whatever the client did.
  "upg11-a": (input) => {
    const f = fixtures.upg11;
    return [
      { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
      { type: EventType.TEXT_MESSAGE_START, messageId: f.first.messageId, role: "assistant" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: f.first.messageId, delta: f.first.beforeGate },
      { gate: f.gate },
      ...Array.from({ length: f.lateDeltas }, (_, index) => ({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: f.first.messageId, delta: `a-late-${index} ` })),
      { type: EventType.TEXT_MESSAGE_END, messageId: f.first.messageId },
      ...text(f.first.lateMessageId, ["a-late-message"]),
      { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId },
    ];
  },
  "upg11-b": (input) => [
    { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
    ...text(fixtures.upg11.second.messageId, [fixtures.upg11.second.text]),
    { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId },
  ],
  // The un-superseded control stream: same shape, its own conversation.
  "upg11-c": (input) => {
    const f = fixtures.upg11;
    return [
      { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
      { type: EventType.TEXT_MESSAGE_START, messageId: f.control.messageId, role: "assistant" },
      { type: EventType.TEXT_MESSAGE_CONTENT, messageId: f.control.messageId, delta: f.control.beforeGate },
      { gate: f.gate },
      ...Array.from({ length: f.lateDeltas }, (_, index) => ({ type: EventType.TEXT_MESSAGE_CONTENT, messageId: f.control.messageId, delta: `c-late-${index} ` })),
      { type: EventType.TEXT_MESSAGE_END, messageId: f.control.messageId },
      ...text(f.control.lateMessageId, ["c-late-message"]),
      { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId },
    ];
  },
  // First run: pause on an interrupt outcome. Resume run: report the resume entry back as text.
  upg12: (input, caseName) => {
    const scenario = fixtures.upg12.cases[caseName];
    if (!scenario) throw new Error(`unknown upg12 case ${caseName}`);
    if (Array.isArray(input.resume) && input.resume.length > 0) {
      const entry = input.resume.find((item) => item.interruptId === scenario.interruptId) ?? input.resume[0];
      return [
        { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
        ...text(`resume-${caseName}`, [`resume ${entry.status} ${JSON.stringify(entry.payload ?? null)}`]),
        { type: EventType.RUN_FINISHED, threadId: input.threadId, runId: input.runId, outcome: { type: "success" } },
      ];
    }
    return [
      { type: EventType.RUN_STARTED, threadId: input.threadId, runId: input.runId },
      ...text(`ask-${caseName}`, [scenario.message]),
      {
        type: EventType.RUN_FINISHED,
        threadId: input.threadId,
        runId: input.runId,
        outcome: {
          type: "interrupt",
          interrupts: [
            {
              id: scenario.interruptId,
              reason: scenario.reason,
              message: scenario.message,
              metadata: { "prometheus.action": scenario.action },
            },
          ],
        },
      },
    ];
  },
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

function json(res, status, body) {
  res.writeHead(status, { ...CORS, "Content-Type": "application/json" });
  res.end(JSON.stringify(body));
}

async function runScript(req, res, scriptName, caseName) {
  const input = JSON.parse(await readBody(req));
  const script = scripts[scriptName];
  if (!script) return json(res, 404, { error: `unknown script ${scriptName}` });
  const run = {
    seq: runs.length,
    script: scriptName,
    case: caseName ?? null,
    threadId: input.threadId,
    runId: input.runId,
    resume: input.resume ?? null,
    messageRoles: Array.isArray(input.messages) ? input.messages.map((message) => message.role) : [],
    receivedAt: Date.now(),
    sent: [],
    waitingAt: null,
    completed: false,
    clientClosed: false,
    error: null,
  };
  runs.push(run);
  let steps;
  try {
    steps = script(input, caseName);
  } catch (cause) {
    run.error = String(cause);
    return json(res, 400, { error: run.error });
  }
  const encoder = new EventEncoder({ accept: req.headers.accept });
  res.writeHead(200, { ...CORS, "Content-Type": encoder.getContentType(), "Cache-Control": "no-cache", Connection: "keep-alive" });
  res.on("close", () => {
    if (!run.completed) run.clientClosed = true;
  });
  for (const step of steps) {
    if (run.clientClosed) break;
    if (step.gate) {
      run.waitingAt = step.gate;
      await gate(step.gate).promise;
      run.waitingAt = null;
      continue;
    }
    res.write(encoder.encodeSSE({ ...step, timestamp: Date.now() }));
    run.sent.push(step.type);
    // One event per macrotask, so later events reach the browser as separate chunks.
    await new Promise((resolve) => setImmediate(resolve));
  }
  run.completed = !run.clientClosed;
  res.end();
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${port}`);
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    return res.end();
  }
  if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, encoderVersion });
  if (req.method === "GET" && url.pathname === "/log") {
    return json(res, 200, {
      encoderVersion,
      runs,
      gates: Object.fromEntries([...gates].map(([name, entry]) => [name, entry.released])),
    });
  }
  const gateMatch = /^\/gate\/([\w-]+)$/.exec(url.pathname);
  if (req.method === "POST" && gateMatch) {
    gate(gateMatch[1]).release();
    return json(res, 200, { released: gateMatch[1] });
  }
  const agentMatch = /^\/agent\/([\w-]+)(?:\/([\w-]+))?$/.exec(url.pathname);
  if (req.method === "POST" && agentMatch) {
    runScript(req, res, agentMatch[1], agentMatch[2]).catch((cause) => {
      if (!res.headersSent) json(res, 500, { error: String(cause) });
      else res.end();
    });
    return undefined;
  }
  return json(res, 404, { error: "not found" });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`agui-run-stack agent on http://127.0.0.1:${port} (@ag-ui/encoder ${encoderVersion})\n`);
});
