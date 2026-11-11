/**
 * Restart and hydration at the library level: a streaming agent session is
 * persisted mid-stream, the "page" reloads into a fresh graph, and hydration
 * restores durable state (including pending and expired interrupts and queued
 * actions) while ephemeral live text is gone. Re-delivering the same events or
 * change sets after the reload is idempotent.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { agUiListKey, applyAgUiDelta, applyAgUiSnapshot, readAgUiState, type AgUiStateMapping } from "./agent/ag-ui-bridge";
import { createGraphStore, type GraphStore } from "./graph";
import { applyGraphChanges, type GraphChange } from "./graph-batch";
import { createLiveLayer } from "./live-layer";
import {
  createRuntimeScope,
  hydrateGraphFromStorage,
  persistGraphToStorage,
  type GraphPersistenceAdapter,
} from "./local-first-runtime";
import { __resetMergeStrategies } from "./merge/registry";

const AGENDA: AgUiStateMapping = { entityType: "AgendaItem", pointer: "/agenda", kind: "collection" };
const NOW = Date.parse("2026-11-10T12:00:00Z");

function memoryStorage(): GraphPersistenceAdapter {
  const data = new Map<string, string>();
  return { get: (key) => data.get(key) ?? null, set: (key, value) => void data.set(key, value) };
}

/** Durable events of one run, as an application would journal them. */
const RUN_CHANGES: GraphChange[] = [
  { op: "upsert", type: "Message", id: "m1", data: { id: "m1", role: "assistant", text: "", status: "streaming" } },
  { op: "insertId", key: "thread:messages", id: "m1", position: "end" },
  { op: "upsert", type: "Interrupt", id: "i-pending", data: { id: "i-pending", status: "pending", expiresAt: NOW + 60_000 } },
  { op: "upsert", type: "Interrupt", id: "i-expired", data: { id: "i-expired", status: "expired", expiresAt: NOW - 1_000 } },
  { op: "setListIds", key: "thread:interrupts", ids: ["i-pending", "i-expired"], entityType: "Interrupt" },
];

function durable(store: GraphStore) {
  const { entities, patches, lists, syncMetadata } = store.getState();
  return { entities, patches, lists, syncMetadata };
}

let storage: GraphPersistenceAdapter;
beforeEach(() => {
  __resetMergeStrategies();
  storage = memoryStorage();
});

async function runUntilMidStream(): Promise<GraphStore> {
  const before = createGraphStore();
  const live = createLiveLayer({ store: before });
  applyGraphChanges(RUN_CHANGES, before);
  applyAgUiSnapshot({ snapshot: { phase: "collecting", agenda: [{ id: "a" }, { id: "b" }] } }, { mappings: [AGENDA], store: before, eventId: "e1" });
  applyAgUiDelta({ delta: [{ op: "move", from: "/agenda/1", path: "/agenda/0" }] }, { mappings: [AGENDA], store: before, eventId: "e2" });
  for (const token of ["The ", "answer ", "is"]) live.append("Message", "m1", "text", token);
  // Checkpoint: the first sentence fragment becomes durable, the rest stays live.
  live.commit("Message", "m1");
  live.append("Message", "m1", "text", " 42 (still streaming)");

  const scope = createRuntimeScope();
  scope.pendingActions.set("resume-1", {
    id: "resume-1", key: "interrupt.resume", input: { interruptId: "i-pending", decision: "approve" }, enqueuedAt: new Date(NOW).toISOString(),
  });
  await persistGraphToStorage({ storage, key: "session", store: before, scope });
  return before;
}

describe("restart and hydration", () => {
  it("a reload mid-stream restores durable state and drops in-flight live text", async () => {
    const before = await runUntilMidStream();

    const after = createGraphStore();
    const scope = createRuntimeScope();
    const result = await hydrateGraphFromStorage({ storage, key: "session", store: after, scope });
    expect(result.ok).toBe(true);

    expect(durable(after)).toEqual(durable(before));
    expect(after.getState().entities.Message.m1).toMatchObject({ text: "The answer is", status: "streaming" });
    expect(createLiveLayer({ store: after }).get("Message", "m1")).toBeUndefined();
  });

  it("pending and expired interrupts and queued resumes survive the reload", async () => {
    await runUntilMidStream();
    const after = createGraphStore();
    const scope = createRuntimeScope();
    await hydrateGraphFromStorage({ storage, key: "session", store: after, scope });

    const s = after.getState();
    expect(s.lists["thread:interrupts"].ids).toEqual(["i-pending", "i-expired"]);
    expect(s.entities.Interrupt["i-pending"]).toEqual({ id: "i-pending", status: "pending", expiresAt: NOW + 60_000 });
    expect(s.entities.Interrupt["i-expired"]).toEqual({ id: "i-expired", status: "expired", expiresAt: NOW - 1_000 });
    expect([...scope.pendingActions.keys()]).toEqual(["resume-1"]);
  });

  it("the AG-UI document, its order and its applied event ids survive the reload", async () => {
    await runUntilMidStream();
    const after = createGraphStore();
    await hydrateGraphFromStorage({ storage, key: "session", store: after, scope: createRuntimeScope() });

    expect(readAgUiState(undefined, after)).toEqual({ phase: "collecting", agenda: [{ id: "b" }, { id: "a" }] });
    expect(after.getState().lists[agUiListKey(AGENDA)].ids).toEqual(["b", "a"]);
    // The transport replays from its last acknowledged id after reconnecting.
    const replay = applyAgUiDelta({ delta: [{ op: "move", from: "/agenda/1", path: "/agenda/0" }] }, { mappings: [AGENDA], store: after, eventId: "e2" });
    expect(replay.applied).toBe(false);
    expect(after.getState().lists[agUiListKey(AGENDA)].ids).toEqual(["b", "a"]);
  });

  it("replaying the run's journal (changes plus the checkpoint) after hydration changes nothing", async () => {
    const before = await runUntilMidStream();
    const after = createGraphStore();
    await hydrateGraphFromStorage({ storage, key: "session", store: after, scope: createRuntimeScope() });

    const checkpoint: GraphChange = { op: "upsert", type: "Message", id: "m1", data: { text: "The answer is" } };
    applyGraphChanges([...RUN_CHANGES, checkpoint], after);
    applyGraphChanges([...RUN_CHANGES, checkpoint], after);
    expect(durable(after)).toEqual(durable(before));
  });

  it("persisting the hydrated graph again produces the same payload (stable round trip)", async () => {
    await runUntilMidStream();
    const after = createGraphStore();
    const scope = createRuntimeScope();
    await hydrateGraphFromStorage({ storage, key: "session", store: after, scope });
    const first = await storage.get("session");
    await persistGraphToStorage({ storage, key: "session", store: after, scope });
    expect(await storage.get("session")).toBe(first);
  });
});
