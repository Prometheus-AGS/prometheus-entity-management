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

/**
 * ADR-009 G1 — runtime-scoped state.
 *
 * These are regressions for a data-loss defect, not a style preference.
 * `pendingActions` and the sync-status store were module-level singletons, so
 * two runtimes in one process shared them. `hydrateGraphFromStorage` clears the
 * pending set before repopulating it, which meant a second runtime hydrating
 * **erased the first runtime's un-settled actions** — silent write loss on an
 * account or practice switch.
 */
describe("runtime-scoped state (ADR-009 G1)", () => {
  /** A storage adapter over a plain map, one per test. */
  function memoryStorage(seed: Record<string, string> = {}) {
    const map = new Map<string, string>(Object.entries(seed));
    return {
      get: (key: string) => map.get(key) ?? null,
      set: (key: string, value: string) => void map.set(key, value),
      map,
    };
  }

  /** A persisted payload carrying one pending action. */
  function snapshotWithPending(id: string): string {
    return JSON.stringify({
      version: 1,
      snapshot: { entities: {}, patches: {}, entityStates: {}, syncMetadata: {}, lists: {} },
      pendingActions: [{ id, key: "demo", input: {}, enqueuedAt: "now" }],
    });
  }

  it("gives two runtimes independent pending sets", async () => {
    const a = startLocalFirstGraph({ storage: memoryStorage(), store: createGraphStore(), key: "a" });
    const b = startLocalFirstGraph({ storage: memoryStorage(), store: createGraphStore(), key: "b" });
    await Promise.all([a.ready, b.ready]);

    expect(a.scope.pendingActions).not.toBe(b.scope.pendingActions);
    expect(a.scope.statusStore).not.toBe(b.scope.statusStore);

    a.scope.pendingActions.set("only-a", action);
    expect(b.scope.pendingActions.has("only-a")).toBe(false);

    a.dispose();
    b.dispose();
  });

  it("does not let one runtime's hydrate erase another's pending actions", async () => {
    // The defect this change exists to fix. Runtime A holds an un-settled
    // action; runtime B then hydrates. Before scoping, B's hydrate called
    // pendingActions.clear() on the shared map and A's action vanished.
    const a = startLocalFirstGraph({ storage: memoryStorage(), store: createGraphStore(), key: "a" });
    await a.ready;
    a.scope.pendingActions.set("a-unsettled", action);

    const b = startLocalFirstGraph({
      storage: memoryStorage({ b: snapshotWithPending("b-pending") }),
      store: createGraphStore(),
      key: "b",
    });
    await b.ready;
    await b.hydrate();

    expect(a.scope.pendingActions.has("a-unsettled")).toBe(true);
    expect(b.scope.pendingActions.has("a-unsettled")).toBe(false);
    expect(b.scope.pendingActions.has("b-pending")).toBe(true);

    a.dispose();
    b.dispose();
  });

  it("reports each runtime's own status, not whichever wrote last", async () => {
    const a = startLocalFirstGraph({ storage: memoryStorage(), store: createGraphStore(), key: "key-a" });
    const b = startLocalFirstGraph({ storage: memoryStorage(), store: createGraphStore(), key: "key-b" });
    await Promise.all([a.ready, b.ready]);

    expect(a.getStatus().storageKey).toBe("key-a");
    expect(b.getStatus().storageKey).toBe("key-b");

    a.dispose();
    b.dispose();
  });

  it("keeps standalone helpers working without a scope", async () => {
    // The exported helpers are public API and are called outside any runtime.
    // They fall back to a process-wide scope rather than requiring one.
    const storage = memoryStorage();
    const store = createGraphStore();
    const persisted = await persistGraphToStorage({ storage, key: "standalone", store });
    expect(persisted.ok).toBe(true);

    const hydrated = await hydrateGraphFromStorage({ storage, key: "standalone", store });
    expect(hydrated.ok).toBe(true);
  });
});

/**
 * ADR-009 G2 — the disposal barrier.
 *
 * `dispose()` used to clear the debounce timer and return. A write already in
 * flight kept running with its promise discarded (`void persistGraphToStorage`),
 * so it could land after teardown. These assert that awaiting disposal means
 * quiescence, not merely "the timer is cancelled".
 */
describe("dispose drains in-flight persistence (ADR-009 G2)", () => {
  /** Storage whose writes block until the test releases them. */
  function blockingStorage() {
    const settled: string[] = [];
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    return {
      settled,
      release,
      adapter: {
        get: () => null,
        set: async (key: string) => {
          await gate;
          settled.push(key);
        },
      },
    };
  }

  it("does not resolve until an in-flight write settles", async () => {
    const storage = blockingStorage();
    const runtime = startLocalFirstGraph({
      storage: storage.adapter,
      store: createGraphStore(),
      key: "drain",
      persistDebounceMs: 0,
    });
    await runtime.ready;

    // Start a write and leave it hanging inside storage.set.
    const persisting = runtime.persistNow();

    let disposed = false;
    const disposal = runtime.dispose().then(() => {
      disposed = true;
    });

    // The write has not settled, so disposal must not have resolved either.
    await Promise.resolve();
    expect(disposed).toBe(false);

    storage.release();
    await disposal;
    await persisting;

    expect(disposed).toBe(true);
    expect(storage.settled).toContain("drain");
  });

  it("covers a write started immediately before disposal", async () => {
    const storage = blockingStorage();
    const runtime = startLocalFirstGraph({
      storage: storage.adapter,
      store: createGraphStore(),
      key: "race",
      persistDebounceMs: 0,
    });
    await runtime.ready;

    // No await between these two lines — the race the barrier must cover.
    const persisting = runtime.persistNow();
    const disposal = runtime.dispose();

    storage.release();
    await disposal;
    await persisting;

    // Settled before the barrier resolved, not after it.
    expect(storage.settled).toContain("race");
  });

  it("is idempotent — a second dispose shares the first teardown", async () => {
    // What makes a StrictMode double-unmount safe: two calls must not start
    // two teardowns.
    const storage = blockingStorage();
    const runtime = startLocalFirstGraph({
      storage: storage.adapter,
      store: createGraphStore(),
      key: "twice",
      persistDebounceMs: 0,
    });
    await runtime.ready;

    const first = runtime.dispose();
    const second = runtime.dispose();
    expect(first).toBe(second);

    storage.release();
    await first;
  });

  it("schedules no further write after disposal", async () => {
    const storage = blockingStorage();
    const store = createGraphStore();
    const runtime = startLocalFirstGraph({
      storage: storage.adapter,
      store,
      key: "post",
      persistDebounceMs: 0,
    });
    await runtime.ready;

    storage.release();
    await runtime.dispose();
    const countAtDisposal = storage.settled.length;

    // A store mutation after teardown must not reach storage: the subscription
    // is gone and scheduling is refused.
    store.getState().ingestFetchedList("Post", [{ id: "p1", data: { v: 1 } }], {});
    await new Promise((resolve) => setTimeout(resolve, 5));

    expect(storage.settled.length).toBe(countAtDisposal);
  });
});
