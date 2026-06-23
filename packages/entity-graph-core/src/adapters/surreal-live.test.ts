import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createSurrealLiveAdapter,
  type SurrealLike,
  type SurrealLiveAction,
  type SurrealCheckpointStore,
  type SurrealTableConfig,
  type SurrealLiveAdapterOptions,
} from "./surreal-live";
import type { ChangeSet, ChannelConfig, RealtimeAdapter, SubscriptionConfig } from "./types";

// ---------------------------------------------------------------------------
// fakeSurreal — hand-rolled fake client with test controls (design D10)
// ---------------------------------------------------------------------------

interface FakeSurreal extends SurrealLike {
  _emit(uuid: string, action: SurrealLiveAction): void;
  _emitToTable(table: string, action: SurrealLiveAction): void;
  _disconnect(uuid: string): void;
  _liveCount(): number;
  _liveUuids(): string[];
  _primeQuery(rows: unknown[]): void;
  _queryCalls(): Array<{ sql: string; vars?: Record<string, unknown> }>;
  _liveCalls(): Array<{ table: string }>;
  _killCalls(): string[];
}

function fakeSurreal(): FakeSurreal {
  const callbacks = new Map<string, (a: SurrealLiveAction) => void>();
  const tableByUuid = new Map<string, string>();
  const queryResponses: unknown[][] = [];
  const queryCalls: Array<{ sql: string; vars?: Record<string, unknown> }> = [];
  const liveCalls: Array<{ table: string }> = [];
  const killCalls: string[] = [];
  let nextUuid = 0;

  return {
    query: vi.fn(async (sql: string, vars?: Record<string, unknown>) => {
      queryCalls.push({ sql, vars });
      return (queryResponses.shift() ?? []) as never;
    }),
    live: vi.fn(async (table: string, cb: (a: SurrealLiveAction) => void) => {
      const uuid = `live-${++nextUuid}`;
      callbacks.set(uuid, cb);
      tableByUuid.set(uuid, table);
      liveCalls.push({ table });
      return uuid;
    }) as SurrealLike["live"],
    kill: vi.fn(async (uuid: string) => {
      killCalls.push(uuid);
      callbacks.delete(uuid);
      tableByUuid.delete(uuid);
    }),
    _emit: (uuid, action) => callbacks.get(uuid)?.(action),
    _emitToTable: (table, action) => {
      for (const [uuid, t] of tableByUuid) {
        if (t === table) callbacks.get(uuid)?.(action);
      }
    },
    _disconnect: (uuid) => callbacks.get(uuid)?.({ action: "CLOSE", result: null }),
    _liveCount: () => callbacks.size,
    _liveUuids: () => [...callbacks.keys()],
    _primeQuery: (rows) => {
      queryResponses.push(rows);
    },
    _queryCalls: () => queryCalls,
    _liveCalls: () => liveCalls,
    _killCalls: () => killCalls,
  };
}

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

function defaultOpts(surreal: SurrealLike, overrides?: Partial<SurrealLiveAdapterOptions>): SurrealLiveAdapterOptions {
  return {
    surreal,
    tables: [{ type: "user" as never }, { type: "task" as never }],
    initialDelayMs: 100,
    maxDelayMs: 1_000,
    connectedSettleMs: 500,
    ...overrides,
  };
}

function subscribeAll(adapter: RealtimeAdapter, types: string[], handler: (cs: ChangeSet) => void) {
  return types.map((type) =>
    adapter.subscribe({ label: `${adapter.name}/${type}` } as SubscriptionConfig, handler),
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("createSurrealLiveAdapter — RealtimeAdapter contract", () => {
  it("returns an object satisfying RealtimeAdapter", () => {
    const surreal = fakeSurreal();
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    expect(typeof adapter.name).toBe("string");
    expect(typeof adapter.subscribe).toBe("function");
    expect(typeof adapter.onStatusChange).toBe("function");
  });

  it("default name is 'surreal-live'; opts.name overrides", () => {
    const a = createSurrealLiveAdapter(defaultOpts(fakeSurreal()));
    expect(a.name).toBe("surreal-live");
    const b = createSurrealLiveAdapter(defaultOpts(fakeSurreal(), { name: "custom" }));
    expect(b.name).toBe("custom");
  });
});

describe("createSurrealLiveAdapter — per-channel subscription", () => {
  it("opens one LIVE SELECT per channel", async () => {
    const surreal = fakeSurreal();
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    subscribeAll(adapter, ["user", "task"], () => undefined);
    await flush();
    await flush();
    expect(surreal._liveCount()).toBe(2);
    expect(surreal._liveCalls().map((c) => c.table).sort()).toEqual(["task", "user"]);
  });

  it("UnsubscribeFn kills only the targeted channel", async () => {
    const surreal = fakeSurreal();
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    const [unsubUser] = subscribeAll(adapter, ["user", "task"], () => undefined);
    await flush();
    await flush();
    expect(surreal._liveCount()).toBe(2);
    unsubUser();
    await flush();
    expect(surreal._liveCount()).toBe(1);
    expect(surreal._killCalls()).toHaveLength(1);
  });
});

describe("createSurrealLiveAdapter — initial seed", () => {
  it("emits an initial ChangeSet of inserts before live deltas", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([{ id: "u1", name: "Alice" }, { id: "u2", name: "Bob" }]);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    expect(sets).toHaveLength(1);
    expect(sets[0].changes).toHaveLength(2);
    expect(sets[0].changes.every((c) => c.op === "insert")).toBe(true);
  });

  it("emits an empty ChangeSet when seed returns zero rows", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    expect(sets).toHaveLength(1);
    expect(sets[0].changes).toHaveLength(0);
  });

  it("'live-only' strategy skips the SELECT", async () => {
    const surreal = fakeSurreal();
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal, { initialQueryStrategy: "live-only" }));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    expect(surreal._queryCalls().filter((c) => c.sql.startsWith("SELECT * FROM user"))).toHaveLength(0);
    expect(sets).toHaveLength(0);
  });

  it("buffers live actions during seed; flushes in arrival order", async () => {
    const surreal = fakeSurreal();
    let resolveQuery: ((rows: unknown[]) => void) | null = null;
    const slowQuery = vi.fn(
      () =>
        new Promise<unknown[]>((resolve) => {
          resolveQuery = resolve;
        }),
    );
    (surreal.query as unknown as { mockImplementation: (fn: typeof slowQuery) => void }).mockImplementation(slowQuery);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    // Live notifications arrive BEFORE the seed query resolves
    surreal._emit("live-1", { action: "UPDATE", result: { id: "u1", name: "Alice2" } });
    surreal._emit("live-1", { action: "CREATE", result: { id: "u9", name: "Zed" } });
    expect(sets).toHaveLength(0);
    // Resolve the seed
    resolveQuery!([{ id: "u1", name: "Alice" }]);
    await flush();
    await flush();
    expect(sets[0].changes[0].op).toBe("insert");
    expect(sets[0].changes[0].id).toBe("u1");
    expect(sets[1].changes[0].op).toBe("update");
    expect(sets[2].changes[0].op).toBe("insert");
    expect(sets[2].changes[0].id).toBe("u9");
  });
});

describe("createSurrealLiveAdapter — action mapping", () => {
  it("CREATE → insert, UPDATE → update, DELETE → delete", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    surreal._emit("live-1", { action: "CREATE", result: { id: "u1", name: "A" } });
    surreal._emit("live-1", { action: "UPDATE", result: { id: "u1", name: "A2" } });
    surreal._emit("live-1", { action: "DELETE", result: { id: "u1" } });
    await flush();
    const nonEmpty = sets.filter((s) => s.changes.length > 0);
    expect(nonEmpty.map((s) => s.changes[0].op)).toEqual(["insert", "update", "delete"]);
    // UPDATE carries the full row; no patch field set.
    const updateChange = nonEmpty.find((s) => s.changes[0].op === "update")!.changes[0];
    expect(updateChange.data).toEqual({ id: "u1", name: "A2" });
    expect("patch" in updateChange).toBe(false);
  });

  it("unknown action is warned and skipped", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    surreal._emit("live-1", { action: "BOGUS", result: { id: "u1" } });
    await flush();
    // Only the empty seed remains.
    expect(sets).toHaveLength(1);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("EntityType comes from ChannelConfig.type, not parsed from row id", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([{ id: "anything", name: "A" }]);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    expect(sets[0].changes[0].type).toBe("user");
  });
});

describe("createSurrealLiveAdapter — onStatusChange aggregation", () => {
  it("registers and unsubscribes status callbacks", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    const seen: string[] = [];
    const unsub = adapter.onStatusChange!((s) => seen.push(s));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, () => undefined);
    await flush();
    await flush();
    expect(seen).toContain("connected");
    unsub();
    seen.length = 0;
    // After unsubscribe, no new status received
    adapter.subscribe({ label: "surreal-live/task" } as SubscriptionConfig, () => undefined);
    await flush();
    await flush();
    expect(seen).toHaveLength(0);
  });

  it("aggregates worst-of across channels", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    surreal._primeQuery([]);
    const status: string[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal, { permanentErrorPatterns: [/perm/i] }));
    adapter.onStatusChange!((s) => status.push(s));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, () => undefined);
    adapter.subscribe({ label: "surreal-live/task" } as SubscriptionConfig, () => undefined);
    await flush();
    await flush();
    expect(status[status.length - 1]).toBe("connected");
    // make the next live() call throw a permanent error, then trigger CLOSE
    surreal.live = vi.fn(async () => {
      throw new Error("perm error");
    }) as SurrealLike["live"];
    vi.useFakeTimers();
    surreal._disconnect("live-1");
    await vi.advanceTimersByTimeAsync(2000);
    vi.useRealTimers();
    await flush();
    expect(status).toContain("error");
  });
});

describe("createSurrealLiveAdapter — reconnection with backoff", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("schedules reconnect on CLOSE notification", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, () => undefined);
    await vi.runAllTimersAsync();
    expect(surreal._liveCount()).toBe(1);
    surreal._disconnect("live-1");
    // After the timer fires, a new LIVE call is made.
    surreal._primeQuery([]); // for any potential checkpoint replay (no-op here)
    await vi.runAllTimersAsync();
    expect(surreal._liveCalls().length).toBeGreaterThanOrEqual(2);
  });

  it("permanent error stops reconnect attempts", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    const status: string[] = [];
    const adapter = createSurrealLiveAdapter(
      defaultOpts(surreal, { permanentErrorPatterns: [/authentication/i] }),
    );
    adapter.onStatusChange!((s) => status.push(s));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, () => undefined);
    await vi.runAllTimersAsync();
    // Replace live to throw a permanent error on reconnect attempts.
    surreal.live = vi.fn(async () => {
      throw new Error("authentication failed");
    }) as SurrealLike["live"];
    surreal._disconnect("live-1");
    await vi.runAllTimersAsync();
    expect(status).toContain("error");
    // No further live calls after the error.
    const liveCount = (surreal.live as unknown as { mock: { calls: unknown[][] } }).mock.calls.length;
    await vi.runAllTimersAsync();
    expect((surreal.live as unknown as { mock: { calls: unknown[][] } }).mock.calls.length).toBe(liveCount);
  });
});

describe("createSurrealLiveAdapter — checkpoint replay", () => {
  it("persists per-channel checkpoint and replays on reconnect when store is supplied", async () => {
    vi.useFakeTimers();
    const surreal = fakeSurreal();
    surreal._primeQuery([{ id: "u1", updated_at: "2026-01-01T00:00:00Z" }]);
    const store: SurrealCheckpointStore & { _state: Map<string, string> } = {
      _state: new Map(),
      get: vi.fn(async (k) => store._state.get(k)),
      set: vi.fn(async (k, v) => {
        store._state.set(k, v);
      }),
    };
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal, { checkpointStore: store }));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, () => undefined);
    await vi.runAllTimersAsync();
    expect(store._state.get("surreal-live/user")).toBe("2026-01-01T00:00:00Z");
    // Disconnect and prime the replay query result
    surreal._primeQuery([{ id: "u1", updated_at: "2026-01-02T00:00:00Z" }]);
    surreal._disconnect("live-1");
    await vi.runAllTimersAsync();
    const replayQuery = surreal._queryCalls().find((c) => c.sql.includes("updated_at >"));
    expect(replayQuery).toBeDefined();
    expect(replayQuery?.vars).toEqual({ stored: "2026-01-01T00:00:00Z" });
    vi.useRealTimers();
  });

  it("no checkpointStore = no replay query on reconnect", async () => {
    vi.useFakeTimers();
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, () => undefined);
    await vi.runAllTimersAsync();
    surreal._disconnect("live-1");
    await vi.runAllTimersAsync();
    const replayQuery = surreal._queryCalls().find((c) => c.sql.includes("updated_at >"));
    expect(replayQuery).toBeUndefined();
    vi.useRealTimers();
  });
});

describe("createSurrealLiveAdapter — list refresh hints", () => {
  it("populates affectedListKeys via listKeyResolver", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([
      { id: "u1", role: "admin" },
      { id: "u2", role: "user" },
    ]);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(
      defaultOpts(surreal, {
        listKeyResolver: (c) => {
          const role = (c.data as { role?: string } | undefined)?.role;
          return role ? [`users/by-role/${role}`] : undefined;
        },
      }),
    );
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    expect(sets[0].affectedListKeys?.sort()).toEqual(["users/by-role/admin", "users/by-role/user"]);
  });

  it("absent listKeyResolver leaves affectedListKeys undefined", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([{ id: "u1" }]);
    const sets: ChangeSet[] = [];
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    adapter.subscribe({ label: "surreal-live/user" } as SubscriptionConfig, (cs) => sets.push(cs));
    await flush();
    await flush();
    expect(sets[0].affectedListKeys).toBeUndefined();
  });
});

describe("createSurrealLiveAdapter — test infrastructure asserts", () => {
  it("no leaked live subscriptions after unsubscribe-all", async () => {
    const surreal = fakeSurreal();
    surreal._primeQuery([]);
    surreal._primeQuery([]);
    const adapter = createSurrealLiveAdapter(defaultOpts(surreal));
    const unsubs = subscribeAll(adapter, ["user", "task"], () => undefined);
    await flush();
    await flush();
    expect(surreal._liveCount()).toBe(2);
    for (const u of unsubs) u();
    await flush();
    expect(surreal._liveCount()).toBe(0);
    expect(surreal._killCalls()).toHaveLength(2);
  });
});

// Type-only export smoke (compile-time only — proves the names resolve)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Smoke = SurrealLike | SurrealLiveAction | SurrealCheckpointStore | SurrealTableConfig | SurrealLiveAdapterOptions;
