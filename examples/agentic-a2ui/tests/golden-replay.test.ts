/**
 * Golden protocol fixtures for the deterministic agent flows.
 *
 * Each scenario replays against the real A2A server with a fixed clock and
 * deterministic IDs, and the normalized transcript is compared byte-for-byte
 * with the checked-in fixture. Regenerate intentionally with:
 *   UPDATE_GOLDEN=1 pnpm --filter prometheus-entity-management-agentic-a2ui test:golden
 */
import assert from "node:assert/strict";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { graphStore } from "@prometheus-ags/entity-graph-core";
import { createPrometheusA2uiRuntime } from "@prometheus-ags/a2ui-react";
import { createShowcaseAgentServer, FIXED_CLOCK, demoCaller } from "../src/agent/agent-server";
import {
  cancelTask,
  graphRequestMessage,
  runStreamingTask,
  surfaceRequestMessage,
} from "../src/agent/agent-client";
import { createTaskBoardSurfaceMessages, TASK_BOARD_SURFACE_ID } from "../src/agent/surface-messages";
import { seedDemoGraph } from "../src/lib/graph-seed";

const here = dirname(fileURLToPath(import.meta.url));
const goldenDir = join(here, "golden");
const update = process.env.UPDATE_GOLDEN === "1";

function deterministicIds() {
  let id = 0;
  return () => `golden-${++id}`;
}

function makeServer(stepDelayMs = 0) {
  return createShowcaseAgentServer({
    clock: () => FIXED_CLOCK,
    idFactory: deterministicIds(),
    stepDelayMs,
  });
}

async function compareGolden(name: string, actual: unknown): Promise<void> {
  const path = join(goldenDir, `${name}.json`);
  const serialized = `${JSON.stringify(actual, null, 2)}\n`;
  if (update) {
    await mkdir(goldenDir, { recursive: true });
    await writeFile(path, serialized);
    return;
  }
  const expected = await readFile(path, "utf8");
  assert.equal(serialized, expected, `golden transcript drifted: ${name}`);
}

/** Strip volatile fields (message ids, timestamps outside the fixed clock). */
function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(record)) {
      if (key === "messageId" && typeof entry === "string" && entry.startsWith("ui-message-")) {
        out[key] = "ui-message-<n>";
      } else {
        out[key] = normalize(entry);
      }
    }
    return out;
  }
  return value;
}

test.beforeEach(() => {
  seedDemoGraph();
});

test("happy: authorized patch streams to completed and mutates the graph", async () => {
  const server = makeServer();
  const events: unknown[] = [];
  const message = graphRequestMessage({
    kind: "prometheus.entity-graph.request",
    version: "1.0",
    operation: "mutate",
    mutations: [
      { op: "upsert", entityType: "Task", id: "task-schema", data: { status: "done" } },
    ],
  });
  const { finalState } = await runStreamingTask(server, message, demoCaller("tenant-a"), (event) => {
    events.push({ kind: event.kind, state: event.state ?? null });
  });
  const canonical = graphStore.getState().entities.Task?.["task-schema"] as Record<string, unknown>;
  await compareGolden("happy", normalize({
    finalState,
    canonicalStatus: canonical.status,
    events,
  }));
  assert.equal(finalState, "TASK_STATE_COMPLETED");
  assert.equal(canonical.status, "done");
});

test("denied: remove is not allowlisted and the task is rejected", async () => {
  const server = makeServer();
  const events: unknown[] = [];
  const message = graphRequestMessage({
    kind: "prometheus.entity-graph.request",
    version: "1.0",
    operation: "mutate",
    mutations: [{ op: "remove", entityType: "Task", id: "task-sync" }],
  });
  const { finalState } = await runStreamingTask(server, message, demoCaller("tenant-a"), (event) => {
    events.push({ kind: event.kind, state: event.state ?? null });
  });
  const stillThere = graphStore.getState().entities.Task?.["task-sync"];
  await compareGolden("denied", normalize({ finalState, survived: Boolean(stillThere), events }));
  assert.equal(finalState, "TASK_STATE_REJECTED");
  assert.ok(stillThere, "denied mutation must not touch the graph");
});

test("malformed: invalid SendMessage params return a JSON-RPC error", async () => {
  const server = makeServer();
  const response = (await server.handleRequest(
    { jsonrpc: "2.0", id: "malformed-1", method: "SendMessage", params: { nope: true } },
    { caller: demoCaller("tenant-a") },
  )) as { error?: { code?: number; message?: string } };
  assert.ok(response.error, "malformed payload must error");
  await compareGolden("malformed", normalize({ code: response.error.code }));
});

test("cancelled: CancelTask during the working window ends the task canceled", async () => {
  const server = makeServer(200);
  const events: unknown[] = [];
  const caller = demoCaller("tenant-a");
  const message = surfaceRequestMessage("Render the task board surface.");
  let cancelled = false;
  const { finalState } = await runStreamingTask(server, message, caller, (event) => {
    events.push({ kind: event.kind, state: event.state ?? null });
    const result = event.raw.result as Record<string, any> | undefined;
    const taskId: string | undefined =
      result?.task?.id ?? result?.statusUpdate?.taskId ?? result?.artifactUpdate?.taskId;
    if (!cancelled && taskId && event.state === "TASK_STATE_WORKING") {
      cancelled = true;
      void cancelTask(server, taskId, caller);
    }
  });
  await compareGolden("cancelled", normalize({ finalState, events }));
  assert.equal(finalState, "TASK_STATE_CANCELED");
});

test("surface: task board messages build the contract surface in the runtime", async () => {
  const runtime = createPrometheusA2uiRuntime();
  try {
    const messages = createTaskBoardSurfaceMessages({
      taskId: "task-sync",
      title: "Wire realtime sync",
      status: "todo",
    });
    runtime.processMessages(messages);
    const surface = runtime.getSurface(TASK_BOARD_SURFACE_ID);
    assert.ok(surface, "surface must exist after processing");
    assert.equal(surface.id, TASK_BOARD_SURFACE_ID);
    await compareGolden("surface-task-sync", normalize(messages));
    const model = runtime.getClientDataModel() as Record<string, any>;
    assert.equal(model.surfaces[TASK_BOARD_SURFACE_ID].title, "Wire realtime sync");
  } finally {
    runtime.dispose();
  }
});

test("tenant mismatch: foreign caller is refused before any graph access", async () => {
  const server = makeServer();
  const message = graphRequestMessage({
    kind: "prometheus.entity-graph.request",
    version: "1.0",
    operation: "query",
    entityType: "Task",
  });
  const error = await runStreamingTask(server, message, demoCaller("tenant-b"), () => {}).then(
    () => null,
    (caught: unknown) => caught as { name?: string; status?: number },
  );
  assert.ok(error, "foreign caller must be refused");
  await compareGolden("tenant-denied", normalize({ name: error.name, status: error.status }));
  assert.equal(error.status, 403);
});
