import { describe, it, expect, vi, beforeEach } from "vitest";
import { subscribeDevtoolsEvent, notifyDevtools, type DevtoolsEvent } from "./engine";
import { createGraphTransaction } from "./graph-actions";
import { useGraphStore } from "./graph";

// Reset the graph store between tests so each `it` starts clean.
beforeEach(() => {
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
});

// ---------------------------------------------------------------------------
// Public observation surface
// ---------------------------------------------------------------------------
describe("entity-engine-devtools-tap — public observation surface", () => {
  it("subscribeDevtoolsEvent returns a no-arg UnsubscribeFn", () => {
    const unsub = subscribeDevtoolsEvent(() => undefined);
    expect(typeof unsub).toBe("function");
    expect(unsub.length).toBe(0);
    unsub();
  });

  it("type re-export resolves (compile-time)", () => {
    // Smoke: building a value of the type proves the type narrows correctly
    const event: DevtoolsEvent = {
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: "2026-01-01T00:00:00Z",
    };
    expect(event.kind).toBe("upsert");
  });

  it("multiple subscribers all receive the event in registration order", () => {
    const seen: string[] = [];
    const unsub1 = subscribeDevtoolsEvent(() => seen.push("a"));
    const unsub2 = subscribeDevtoolsEvent(() => seen.push("b"));
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    expect(seen).toEqual(["a", "b"]);
    unsub1();
    unsub2();
  });

  it("UnsubscribeFn stops delivery; other subscribers continue", () => {
    const seen: string[] = [];
    const unsubA = subscribeDevtoolsEvent(() => seen.push("a"));
    subscribeDevtoolsEvent(() => seen.push("b"));
    unsubA();
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    expect(seen).toEqual(["b"]);
  });
});

// ---------------------------------------------------------------------------
// Event payload shape
// ---------------------------------------------------------------------------
describe("entity-engine-devtools-tap — event payload shape", () => {
  it("upsert payload carries type/id/data + ISO-8601 at", () => {
    const events: DevtoolsEvent[] = [];
    const unsub = subscribeDevtoolsEvent((e) => events.push(e));
    const tx = createGraphTransaction();
    tx.upsertEntity("user" as never, "u1" as never, { name: "Alice" });
    unsub();
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.kind).toBe("upsert");
    if (ev.kind === "upsert") {
      expect(ev.type).toBe("user");
      expect(ev.id).toBe("u1");
      expect(ev.data).toEqual({ name: "Alice" });
      expect(ev.at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });

  it("patch payload carries patch field, not data", () => {
    const events: DevtoolsEvent[] = [];
    const unsub = subscribeDevtoolsEvent((e) => events.push(e));
    const tx = createGraphTransaction();
    tx.patchEntity("user" as never, "u1" as never, { name: "Bob" });
    unsub();
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.kind).toBe("patch");
    if (ev.kind === "patch") {
      expect(ev.patch).toEqual({ name: "Bob" });
      expect("data" in ev).toBe(false);
    }
  });

  it("clearPatch payload has no data or patch field", () => {
    const events: DevtoolsEvent[] = [];
    const unsub = subscribeDevtoolsEvent((e) => events.push(e));
    const tx = createGraphTransaction();
    tx.clearPatch("user" as never, "u1" as never);
    unsub();
    expect(events).toHaveLength(1);
    const ev = events[0];
    expect(ev.kind).toBe("clearPatch");
    if (ev.kind === "clearPatch") {
      expect("data" in ev).toBe(false);
      expect("patch" in ev).toBe(false);
    }
  });

  it("DevtoolsEvent union includes forward-compat unpatch + list kinds", () => {
    // Compile-time assertion via satisfies — if these aren't valid members,
    // typecheck fails.
    const unpatch = {
      kind: "unpatch",
      type: "user" as never,
      id: "u1" as never,
      keys: ["name"],
      at: "2026-01-01T00:00:00Z",
    } satisfies DevtoolsEvent;
    const list = {
      kind: "list",
      key: "users-by-role-admin",
      idCount: 5,
      at: "2026-01-01T00:00:00Z",
    } satisfies DevtoolsEvent;
    expect(unpatch.kind).toBe("unpatch");
    expect(list.kind).toBe("list");
  });
});

// ---------------------------------------------------------------------------
// Op-site instrumentation
// ---------------------------------------------------------------------------
describe("entity-engine-devtools-tap — op-site instrumentation", () => {
  it("upsertEntity triggers exactly one upsert event", () => {
    const events: DevtoolsEvent[] = [];
    const unsub = subscribeDevtoolsEvent((e) => events.push(e));
    const tx = createGraphTransaction();
    tx.upsertEntity("user" as never, "u1" as never, { name: "A" });
    unsub();
    expect(events.filter((e) => e.kind === "upsert")).toHaveLength(1);
  });

  it("patchEntity triggers exactly one patch event", () => {
    const events: DevtoolsEvent[] = [];
    const unsub = subscribeDevtoolsEvent((e) => events.push(e));
    const tx = createGraphTransaction();
    tx.patchEntity("user" as never, "u1" as never, { name: "B" });
    unsub();
    expect(events.filter((e) => e.kind === "patch")).toHaveLength(1);
  });

  it("clearPatch triggers exactly one clearPatch event", () => {
    const events: DevtoolsEvent[] = [];
    const unsub = subscribeDevtoolsEvent((e) => events.push(e));
    const tx = createGraphTransaction();
    tx.clearPatch("user" as never, "u1" as never);
    unsub();
    expect(events.filter((e) => e.kind === "clearPatch")).toHaveLength(1);
  });

  it("sequential upsert → patch → clearPatch produces three events in that order", () => {
    const kinds: DevtoolsEvent["kind"][] = [];
    const unsub = subscribeDevtoolsEvent((e) => kinds.push(e.kind));
    const tx = createGraphTransaction();
    tx.upsertEntity("user" as never, "u1" as never, { name: "A" });
    tx.patchEntity("user" as never, "u1" as never, { name: "B" });
    tx.clearPatch("user" as never, "u1" as never);
    unsub();
    expect(kinds).toEqual(["upsert", "patch", "clearPatch"]);
  });
});

// ---------------------------------------------------------------------------
// Hot-path no-op
// ---------------------------------------------------------------------------
describe("entity-engine-devtools-tap — hot-path no-op", () => {
  it("zero subscribers — graph-actions op doesn't throw", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    expect(() => {
      const tx = createGraphTransaction();
      tx.upsertEntity("user" as never, "u1" as never, {});
    }).not.toThrow();
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it("late subscribers don't receive backfill (events are fire-and-forget)", () => {
    const tx = createGraphTransaction();
    tx.upsertEntity("user" as never, "u1" as never, { name: "A" });
    tx.upsertEntity("user" as never, "u2" as never, { name: "B" });
    const events: DevtoolsEvent[] = [];
    const unsub = subscribeDevtoolsEvent((e) => events.push(e));
    expect(events).toHaveLength(0);
    tx.upsertEntity("user" as never, "u3" as never, { name: "C" });
    unsub();
    expect(events).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Production tree-shake gate (W7 will verify against prod bundles)
// ---------------------------------------------------------------------------
describe("entity-engine-devtools-tap — production tree-shake gate", () => {
  it.todo("W7 (seim-em-explorer-production-treeshake-check) verifies elision");
});

// ---------------------------------------------------------------------------
// Subscriber lifecycle
// ---------------------------------------------------------------------------
describe("entity-engine-devtools-tap — subscriber lifecycle", () => {
  it("same function subscribed twice → invoked once per event", () => {
    let count = 0;
    const cb = () => {
      count += 1;
    };
    const unsubA = subscribeDevtoolsEvent(cb);
    const unsubB = subscribeDevtoolsEvent(cb);
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    expect(count).toBe(1);
    unsubA();
    unsubB();
  });

  it("UnsubscribeFn called twice — no error, no double-removal effect", () => {
    const seen: string[] = [];
    const cbA = () => seen.push("a");
    const cbB = () => seen.push("b");
    const unsubA = subscribeDevtoolsEvent(cbA);
    subscribeDevtoolsEvent(cbB);
    unsubA();
    expect(() => unsubA()).not.toThrow();
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    expect(seen).toEqual(["b"]);
  });

  it("subscribe / unsubscribe / re-subscribe cycle works", () => {
    let count = 0;
    const cb = () => {
      count += 1;
    };
    const u1 = subscribeDevtoolsEvent(cb);
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    u1();
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    const u2 = subscribeDevtoolsEvent(cb);
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    u2();
    expect(count).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// Re-entrancy safety
// ---------------------------------------------------------------------------
describe("entity-engine-devtools-tap — re-entrancy safety", () => {
  it("subscriber that subscribes during dispatch: new sub gets FUTURE events only", () => {
    const seen: string[] = [];
    let unsubB: (() => void) | null = null;
    const unsubA = subscribeDevtoolsEvent(() => {
      seen.push("a");
      if (!unsubB) {
        unsubB = subscribeDevtoolsEvent(() => seen.push("b"));
      }
    });
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    // First dispatch — only A fires; B was added during dispatch but iteration was snapshotted
    expect(seen).toEqual(["a"]);
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u2" as never,
      data: {},
      at: new Date().toISOString(),
    });
    // Second dispatch — both A and B
    expect(seen).toEqual(["a", "a", "b"]);
    unsubA();
    unsubB?.();
  });

  it("throwing subscriber doesn't block delivery; console.warn invoked", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const seen: string[] = [];
    const unsubA = subscribeDevtoolsEvent(() => {
      throw new Error("boom");
    });
    const unsubB = subscribeDevtoolsEvent(() => seen.push("b"));
    notifyDevtools({
      kind: "upsert",
      type: "user" as never,
      id: "u1" as never,
      data: {},
      at: new Date().toISOString(),
    });
    expect(seen).toEqual(["b"]);
    expect(warnSpy).toHaveBeenCalled();
    unsubA();
    unsubB();
    warnSpy.mockRestore();
  });
});
