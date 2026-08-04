import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createGraphStore, graphStore } from "./graph";
import { createGraphAction } from "./graph-actions";
import {
  hydrateGraphFromStorage,
  persistGraphToStorage,
  replayActionWithRetry,
  startLocalFirstGraph,
} from "./local-first-runtime";
import * as graphActions from "./graph-actions";

const action = { id: "a1", key: "demo", input: {}, enqueuedAt: "now" };

describe("replayActionWithRetry", () => {
  let replaySpy: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    replaySpy = vi.spyOn(graphActions, "replayRegisteredGraphAction");
  });
  afterEach(() => {
    replaySpy.mockRestore();
  });

  it("succeeds on the first attempt", async () => {
    replaySpy.mockResolvedValueOnce(undefined as never);
    const result = await replayActionWithRetry(action, {
      maxAttempts: 3,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
    });
    expect(result.ok).toBe(true);
    expect(replaySpy).toHaveBeenCalledTimes(1);
  });

  it("retries until success", async () => {
    replaySpy
      .mockRejectedValueOnce(new Error("boom"))
      .mockRejectedValueOnce(new Error("boom again"))
      .mockResolvedValueOnce(undefined as never);
    const result = await replayActionWithRetry(action, {
      maxAttempts: 5,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
    });
    expect(result.ok).toBe(true);
    expect(replaySpy).toHaveBeenCalledTimes(3);
  });

  it("escalates to poison after maxAttempts", async () => {
    replaySpy.mockRejectedValue(new Error("permanent"));
    const poison = vi.fn();
    const result = await replayActionWithRetry(action, {
      maxAttempts: 2,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
      poisonHandler: poison,
    });
    expect(result.ok).toBe(false);
    expect((result as { poisoned: boolean }).poisoned).toBe(true);
    expect(replaySpy).toHaveBeenCalledTimes(2);
    expect(poison).toHaveBeenCalledTimes(1);
    expect(poison.mock.calls[0]?.[0]).toBe(action);
  });

  it("swallows poison handler errors", async () => {
    replaySpy.mockRejectedValue(new Error("permanent"));
    const result = await replayActionWithRetry(action, {
      maxAttempts: 1,
      initialDelayMs: 0,
      maxDelayMs: 0,
      backoffFactor: 2,
      jitter: "none",
      poisonHandler: () => {
        throw new Error("handler broke");
      },
    });
    expect(result.ok).toBe(false);
  });
});

describe("scoped local-first persistence", () => {
  beforeEach(() => {
    graphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      syncMetadata: {},
      lists: {},
    });
  });

  it("persists and hydrates the supplied graph store without touching the singleton", async () => {
    const values = new Map<string, string>();
    const storage = {
      get: (key: string) => values.get(key) ?? null,
      set: (key: string, value: string) => { values.set(key, value); },
    };
    const source = createGraphStore();
    const runtime = startLocalFirstGraph({
      storage,
      store: source,
      key: "scoped",
      persistDebounceMs: 0,
    });

    await runtime.ready;
    source.getState().upsertEntity("Project", "p1", { name: "Scoped" });
    await vi.waitFor(() => expect(values.has("scoped")).toBe(true));
    runtime.dispose();

    const target = createGraphStore();
    const result = await hydrateGraphFromStorage({ storage, store: target, key: "scoped" });
    expect(result.ok).toBe(true);
    expect(target.getState().readEntity("Project", "p1")).toEqual({ name: "Scoped" });
    expect(graphStore.getState().readEntity("Project", "p1")).toBeNull();
  });

  it("replays hydrated graph actions against the supplied store", async () => {
    const values = new Map<string, string>();
    const storage = {
      get: (key: string) => values.get(key) ?? null,
      set: (key: string, value: string) => { values.set(key, value); },
    };
    const source = createGraphStore();
    createGraphAction<{ value: number }, void>({
      key: "scoped-replay-test",
      run: (tx, input) => {
        tx.upsertEntity("Replay", "r1", { value: input.value });
      },
    });
    await persistGraphToStorage({
      storage,
      store: source,
      key: "replay",
      pendingActions: [{
        id: "scoped-replay-test:1",
        key: "scoped-replay-test",
        input: { value: 7 },
        enqueuedAt: "2026-08-04T00:00:00.000Z",
      }],
    });

    const target = createGraphStore();
    const runtime = startLocalFirstGraph({
      storage,
      store: target,
      key: "replay",
      replayPendingActions: true,
      retryPolicy: {
        maxAttempts: 1,
        initialDelayMs: 0,
        maxDelayMs: 0,
        backoffFactor: 2,
        jitter: "none",
      },
    });

    await runtime.ready;
    runtime.dispose();
    expect(target.getState().readEntity("Replay", "r1")).toEqual({ value: 7 });
    expect(graphStore.getState().readEntity("Replay", "r1")).toBeNull();
  });
});
