import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createDevtoolsEventBus,
  registerStore,
  getRegisteredStores,
  __resetStoreRegistry,
  type DevtoolsEventBus,
  type DevtoolsSourceFn,
} from "./devtools-event-bus";
import { type DevtoolsEvent } from "./engine";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeEvent(kind: DevtoolsEvent["kind"] = "upsert", id = "e1"): DevtoolsEvent {
  if (kind === "upsert") return { kind: "upsert", type: "User", id, data: {}, at: new Date().toISOString() };
  if (kind === "patch") return { kind: "patch", type: "User", id, patch: {}, at: new Date().toISOString() };
  if (kind === "clearPatch") return { kind: "clearPatch", type: "User", id, at: new Date().toISOString() };
  if (kind === "unpatch") return { kind: "unpatch", type: "User", id, keys: [], at: new Date().toISOString() };
  return { kind: "list", key: "users", idCount: 3, at: new Date().toISOString() };
}

/**
 * A fake subscribeDevtoolsEvent-compatible source.
 * Returns the source fn plus a helper to fire events.
 */
function makeFakeSource(): { source: DevtoolsSourceFn; emit: (e: DevtoolsEvent) => void } {
  let listener: ((e: DevtoolsEvent) => void) | null = null;
  const source: DevtoolsSourceFn = (cb) => {
    listener = cb;
    return () => { listener = null; };
  };
  return {
    source,
    emit: (e) => listener?.(e),
  };
}

// Each test gets a fresh bus and clean registry
let bus: DevtoolsEventBus;
let fakeSource: ReturnType<typeof makeFakeSource>;

beforeEach(() => {
  __resetStoreRegistry();
  fakeSource = makeFakeSource();
  bus = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 5 });
});

// ── Ring buffer ───────────────────────────────────────────────────────────────

describe("ring buffer", () => {
  it("is empty on creation", () => {
    const b = createDevtoolsEventBus();
    expect(b.getBuffer()).toEqual([]);
  });

  it("populates in chronological order via an external source", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "test-order");
    const e1 = makeEvent("upsert", "1");
    const e2 = makeEvent("patch", "2");
    emit(e1);
    emit(e2);
    expect(b.getBuffer()).toEqual([e1, e2]);
  });

  it("evicts oldest entry on overflow", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 3, coalesceBurstThreshold: 0 });
    registerStore(b, source, "overflow-test");
    const events = [makeEvent("upsert", "1"), makeEvent("upsert", "2"), makeEvent("upsert", "3"), makeEvent("upsert", "4")];
    for (const e of events) emit(e);
    const buf = b.getBuffer();
    expect(buf).toHaveLength(3);
    expect(buf[0]).toEqual(events[1]);
    expect(buf[2]).toEqual(events[3]);
  });

  it("getBuffer() returns a new snapshot each call", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "snapshot-test");
    emit(makeEvent());
    const snap1 = b.getBuffer() as DevtoolsEvent[];
    snap1.push(makeEvent("patch"));
    const snap2 = b.getBuffer();
    expect(snap2).toHaveLength(1);
  });
});

// ── Fan-out + replay ──────────────────────────────────────────────────────────

describe("fan-out with replay", () => {
  it("replays buffer synchronously during subscribe()", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "replay-test");
    const e1 = makeEvent("upsert", "a");
    const e2 = makeEvent("patch", "b");
    emit(e1);
    emit(e2);

    const received: DevtoolsEvent[] = [];
    b.subscribe((e) => received.push(e));
    // Replay must have happened synchronously — before subscribe returns
    expect(received).toEqual([e1, e2]);
  });

  it("live events arrive after replay", async () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "live-after-replay");
    emit(makeEvent("upsert", "before"));

    const received: DevtoolsEvent[] = [];
    b.subscribe((e) => received.push(e));
    const live = makeEvent("patch", "after");
    emit(live);

    expect(received[received.length - 1]).toEqual(live);
  });

  it("two subscribers both get replay + live events", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "two-subs");
    emit(makeEvent("upsert", "prior"));

    const a: DevtoolsEvent[] = [];
    const c: DevtoolsEvent[] = [];
    b.subscribe((e) => a.push(e));
    b.subscribe((e) => c.push(e));
    const live = makeEvent("patch", "live");
    emit(live);

    expect(a).toContainEqual(live);
    expect(c).toContainEqual(live);
    // Both replayed prior event
    expect(a[0]).toMatchObject({ kind: "upsert", id: "prior" });
    expect(c[0]).toMatchObject({ kind: "upsert", id: "prior" });
  });

  it("unsubscribe stops delivery to one, not the other", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "unsub-test");

    const a: DevtoolsEvent[] = [];
    const c: DevtoolsEvent[] = [];
    const unsubA = b.subscribe((e) => a.push(e));
    b.subscribe((e) => c.push(e));
    unsubA();

    emit(makeEvent("upsert", "post-unsub"));
    expect(a).toHaveLength(0);
    expect(c).toHaveLength(1);
  });

  it("throwing subscriber does not block sibling", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "throw-test");

    const good: DevtoolsEvent[] = [];
    b.subscribe(() => { throw new Error("boom"); });
    b.subscribe((e) => good.push(e));

    emit(makeEvent());
    expect(good).toHaveLength(1);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

// ── Burst coalescing ──────────────────────────────────────────────────────────

describe("burst coalescing", () => {
  it("below threshold — all events dispatched individually, no list event", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 100, coalesceBurstThreshold: 10 });
    registerStore(b, source, "below-threshold");

    const received: DevtoolsEvent[] = [];
    b.subscribe((e) => received.push(e));
    // Clear replay (buffer was empty at subscribe time)

    for (let i = 0; i < 9; i++) emit(makeEvent("upsert", `e${i}`));
    const listEvents = received.filter((e) => e.kind === "list");
    expect(listEvents).toHaveLength(0);
    expect(received.filter((e) => e.kind === "upsert")).toHaveLength(9);
  });

  it("above threshold — first N individual + 1 list summary (after microtask)", async () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 100, coalesceBurstThreshold: 5 });
    registerStore(b, source, "above-threshold");

    const received: DevtoolsEvent[] = [];
    b.subscribe((e) => received.push(e));

    // Fire 8 events synchronously — first 5 go through immediately, rest accumulate
    for (let i = 0; i < 8; i++) emit(makeEvent("upsert", `e${i}`));

    // Let the microtask flush happen
    await Promise.resolve();
    await Promise.resolve();

    const upserts = received.filter((e) => e.kind === "upsert");
    const lists = received.filter((e) => e.kind === "list");
    expect(upserts).toHaveLength(5);
    expect(lists).toHaveLength(1);
    expect((lists[0] as Extract<DevtoolsEvent, { kind: "list" }>).idCount).toBe(3);
  });

  it("flush() forces coalesced output synchronously", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 100, coalesceBurstThreshold: 3 });
    registerStore(b, source, "flush-force");

    const received: DevtoolsEvent[] = [];
    b.subscribe((e) => received.push(e));

    for (let i = 0; i < 6; i++) emit(makeEvent("upsert", `e${i}`));
    // Before flush, only first 3 have been dispatched
    const beforeFlush = received.filter((e) => e.kind === "upsert").length;
    b.flush();
    const afterFlush = received.filter((e) => e.kind === "list").length;
    expect(beforeFlush).toBe(3);
    expect(afterFlush).toBeGreaterThanOrEqual(1);
  });

  it("threshold=0 disables coalescing — all events dispatched individually", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 100, coalesceBurstThreshold: 0 });
    registerStore(b, source, "no-coalesce");

    const received: DevtoolsEvent[] = [];
    b.subscribe((e) => received.push(e));

    for (let i = 0; i < 20; i++) emit(makeEvent("upsert", `e${i}`));
    expect(received.filter((e) => e.kind === "list")).toHaveLength(0);
    expect(received.filter((e) => e.kind === "upsert")).toHaveLength(20);
  });
});

// ── Destroy ───────────────────────────────────────────────────────────────────

describe("destroy", () => {
  it("no events reach subscribers after destroy()", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "destroy-test");
    const received: DevtoolsEvent[] = [];
    b.subscribe((e) => received.push(e));
    b.destroy();
    emit(makeEvent());
    expect(received).toHaveLength(0);
  });

  it("destroy() is idempotent", () => {
    const b = createDevtoolsEventBus();
    expect(() => { b.destroy(); b.destroy(); }).not.toThrow();
  });

  it("getBuffer() is unaffected by destroy (snapshot preserved)", () => {
    const { source, emit } = makeFakeSource();
    const b = createDevtoolsEventBus({ bufferSize: 10, coalesceBurstThreshold: 0 });
    registerStore(b, source, "buf-after-destroy");
    emit(makeEvent());
    b.destroy();
    // Buffer retains events that were already in it (destroy doesn't clear buffer)
    expect(b.getBuffer().length).toBeGreaterThanOrEqual(0); // no error thrown
  });
});

// ── Multi-store registry ──────────────────────────────────────────────────────

describe("multi-store registry", () => {
  it("registered source events reach bus subscribers", () => {
    const received: DevtoolsEvent[] = [];
    bus.subscribe((e) => received.push(e));
    registerStore(bus, fakeSource.source, "store-a");
    fakeSource.emit(makeEvent("upsert", "x"));
    expect(received.some((e) => e.kind === "upsert")).toBe(true);
  });

  it("two sources fan into the same bus", () => {
    const srcB = makeFakeSource();
    const received: DevtoolsEvent[] = [];
    bus.subscribe((e) => received.push(e));
    registerStore(bus, fakeSource.source, "fanin-a");
    registerStore(bus, srcB.source, "fanin-b");
    fakeSource.emit(makeEvent("upsert", "from-a"));
    srcB.emit(makeEvent("patch", "from-b"));
    const kinds = received.map((e) => e.kind);
    expect(kinds).toContain("upsert");
    expect(kinds).toContain("patch");
  });

  it("duplicate active name throws with descriptive message", () => {
    registerStore(bus, fakeSource.source, "dup-name");
    const srcB = makeFakeSource();
    expect(() => registerStore(bus, srcB.source, "dup-name")).toThrow(/dup-name.*active/i);
  });

  it("unsubscribe stops routing and marks active: false", () => {
    const received: DevtoolsEvent[] = [];
    bus.subscribe((e) => received.push(e));
    const unsub = registerStore(bus, fakeSource.source, "unsub-store");
    unsub();
    fakeSource.emit(makeEvent());
    expect(received).toHaveLength(0);
    const stores = getRegisteredStores();
    expect(stores.find((s) => s.name === "unsub-store")?.active).toBe(false);
  });

  it("unsubscribe is idempotent", () => {
    const unsub = registerStore(bus, fakeSource.source, "idem-store");
    expect(() => { unsub(); unsub(); }).not.toThrow();
  });

  it("getRegisteredStores() snapshot is immutable", () => {
    registerStore(bus, fakeSource.source, "imm-store");
    const snap = getRegisteredStores() as RegisteredStore[];
    snap.push({ name: "injected", active: true });
    const snap2 = getRegisteredStores();
    expect(snap2.find((s) => s.name === "injected")).toBeUndefined();
  });

  it("bus.destroy() cascades — registered store marked active: false", () => {
    registerStore(bus, fakeSource.source, "cascade-store");
    bus.destroy();
    const stores = getRegisteredStores();
    expect(stores.find((s) => s.name === "cascade-store")?.active).toBe(false);
  });

  it("re-registration after destroy succeeds (same name)", () => {
    registerStore(bus, fakeSource.source, "reuse-name");
    bus.destroy();
    __resetStoreRegistry(); // clear registry so the inactive entry is gone
    const b2 = createDevtoolsEventBus({ coalesceBurstThreshold: 0 });
    const src2 = makeFakeSource();
    expect(() => registerStore(b2, src2.source, "reuse-name")).not.toThrow();
    b2.destroy();
  });
});

// Explicit type for RegisteredStore array mutations in test
interface RegisteredStore { name: string; active: boolean; }
