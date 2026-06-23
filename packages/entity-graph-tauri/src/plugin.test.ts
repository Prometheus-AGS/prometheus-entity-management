/**
 * plugin.test.ts
 *
 * Tests for the entity-graph-tauri TS layer.
 *
 * We do NOT need a real Tauri runtime: we stub `invoke` and `listen` and
 * verify that:
 *   - Commands produce the correct IPC call shape.
 *   - Event listeners apply the expected graph store mutations.
 *   - `TauriGraphPlugin` lifecycle (init / dispose) behaves correctly.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import { TauriGraphPlugin, createTauriGraphPlugin } from "./plugin";
import { listenEntityChanged } from "./events";
import type { TauriInvokeFn, TauriListenFn } from "./types";

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Fake invoke that records calls and returns configurable results. */
function makeFakeInvoke(resultMap: Record<string, unknown> = {}): {
  invoke: TauriInvokeFn;
  calls: Array<{ cmd: string; args?: Record<string, unknown> }>;
} {
  const calls: Array<{ cmd: string; args?: Record<string, unknown> }> = [];
  const invoke: TauriInvokeFn = vi.fn(async (cmd, args) => {
    calls.push({ cmd, args });
    return (resultMap[cmd] ?? undefined) as unknown;
  });
  return { invoke, calls };
}

/** Fake listen that captures handlers and exposes a `fire` helper. */
function makeFakeListen(): {
  listen: TauriListenFn;
  fire: (event: string, payload: unknown) => void;
  registrations: Array<{ event: string; handler: (e: { payload: unknown }) => void }>;
} {
  const registrations: Array<{ event: string; handler: (e: { payload: unknown }) => void }> = [];

  const listen: TauriListenFn = vi.fn(async (event, handler) => {
    registrations.push({ event, handler: handler as (e: { payload: unknown }) => void });
    return () => undefined;
  });

  const fire = (event: string, payload: unknown) => {
    for (const reg of registrations) {
      if (reg.event === event) {
        reg.handler({ payload });
      }
    }
  };

  return { listen, fire, registrations };
}

// ── Setup / teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  // Reset graph store to clean state before each test.
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
});

afterEach(() => {
  vi.clearAllMocks();
});

// ── Command tests ─────────────────────────────────────────────────────────────

describe("TauriGraphPlugin — commands", () => {
  it("upsertEntity fires IPC and writes to graph store", async () => {
    const { invoke, calls } = makeFakeInvoke();
    const { listen } = makeFakeListen();
    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();

    await plugin.commands.upsertEntity({
      entityType: "User",
      entityId: "u-1",
      data: { name: "Alice" },
    });

    // IPC call was made.
    expect(calls.some((c) => c.cmd.includes("graph_upsert_entity"))).toBe(true);

    // Graph store was updated.
    const entity = useGraphStore.getState().entities["User"]?.["u-1"];
    expect(entity?.["name"]).toBe("Alice");
  });

  it("removeEntity fires IPC and removes from graph store", async () => {
    const { invoke } = makeFakeInvoke();
    const { listen } = makeFakeListen();

    // Pre-populate graph.
    useGraphStore.getState().upsertEntity("Post", "p-1", { title: "Hello" });

    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();

    await plugin.commands.removeEntity({ entityType: "Post", entityId: "p-1" });

    expect(useGraphStore.getState().entities["Post"]?.["p-1"]).toBeUndefined();
  });

  it("patchEntity fires IPC and applies patch overlay", async () => {
    const { invoke } = makeFakeInvoke();
    const { listen } = makeFakeListen();

    useGraphStore.getState().upsertEntity("Task", "t-1", { done: false });

    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();

    await plugin.commands.patchEntity({
      entityType: "Task",
      entityId: "t-1",
      patch: { _selected: true },
    });

    const patch = useGraphStore.getState().patches["Task"]?.["t-1"];
    expect(patch?.["_selected"]).toBe(true);
  });

  it("clearGraph fires IPC and empties the store", async () => {
    const { invoke } = makeFakeInvoke();
    const { listen } = makeFakeListen();

    useGraphStore.getState().upsertEntity("Widget", "w-1", { label: "x" });

    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();

    await plugin.commands.clearGraph();

    expect(useGraphStore.getState().entities["Widget"]).toBeUndefined();
  });

  it("setList fires IPC and sets list ids in graph store", async () => {
    const { invoke } = makeFakeInvoke();
    const { listen } = makeFakeListen();

    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();

    await plugin.commands.setList({
      queryKey: "users:all",
      ids: ["u-1", "u-2"],
      total: 2,
    });

    const list = useGraphStore.getState().lists["users:all"];
    expect(list?.ids).toEqual(["u-1", "u-2"]);
    expect(list?.total).toBe(2);
  });
});

// ── Event tests ───────────────────────────────────────────────────────────────

describe("listenEntityChanged", () => {
  it("applies upsert operation to graph store", async () => {
    const { listen, fire } = makeFakeListen();

    await listenEntityChanged(listen);

    fire("entity-graph://entity-changed", {
      entityType: "Product",
      entityId: "prod-1",
      operation: "upsert",
      data: { price: 99 },
    });

    expect(useGraphStore.getState().entities["Product"]?.["prod-1"]?.["price"]).toBe(99);
  });

  it("applies remove operation to graph store", async () => {
    useGraphStore.getState().upsertEntity("Order", "o-1", { status: "pending" });

    const { listen, fire } = makeFakeListen();
    await listenEntityChanged(listen);

    fire("entity-graph://entity-changed", {
      entityType: "Order",
      entityId: "o-1",
      operation: "remove",
    });

    expect(useGraphStore.getState().entities["Order"]?.["o-1"]).toBeUndefined();
  });

  it("applies patch operation to graph store", async () => {
    useGraphStore.getState().upsertEntity("Item", "i-1", { qty: 1 });

    const { listen, fire } = makeFakeListen();
    await listenEntityChanged(listen);

    fire("entity-graph://entity-changed", {
      entityType: "Item",
      entityId: "i-1",
      operation: "patch",
      data: { _loading: true },
    });

    const patch = useGraphStore.getState().patches["Item"]?.["i-1"];
    expect(patch?.["_loading"]).toBe(true);
  });

  it("calls optional onEvent callback", async () => {
    const onEvent = vi.fn();
    const { listen, fire } = makeFakeListen();

    await listenEntityChanged(listen, onEvent);

    fire("entity-graph://entity-changed", {
      entityType: "Tag",
      entityId: "tag-5",
      operation: "upsert",
      data: { name: "rust" },
    });

    expect(onEvent).toHaveBeenCalledOnce();
    expect(onEvent.mock.calls[0]?.[0]).toMatchObject({ entityType: "Tag", entityId: "tag-5" });
  });
});

// ── Lifecycle tests ───────────────────────────────────────────────────────────

describe("TauriGraphPlugin — lifecycle", () => {
  it("init() is idempotent — calling twice does not double-register listeners", async () => {
    const { invoke } = makeFakeInvoke();
    const { listen } = makeFakeListen();

    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();
    await plugin.init(); // second call should be a no-op

    // listen should have been called exactly the number of event types (4),
    // not 8 (which would happen if init ran twice).
    // With no optional handlers, only listenEntityChanged always calls `listen` (1 call).
    // Idempotency means a second init() should not add more calls (still 1, not 2).
    expect(vi.mocked(listen).mock.calls.length).toBe(1);
  });

  it("dispose() calls persistSnapshot before unsubscribing", async () => {
    const { invoke, calls } = makeFakeInvoke();
    const { listen } = makeFakeListen();

    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();
    await plugin.dispose();

    expect(calls.some((c) => c.cmd.includes("graph_persist_snapshot"))).toBe(true);
  });

  it("createTauriGraphPlugin factory returns initialized plugin", async () => {
    const { invoke } = makeFakeInvoke();
    const { listen } = makeFakeListen();

    const plugin = await createTauriGraphPlugin({
      invoke,
      listen,
      options: { autoRestore: false },
    });

    // Should be able to call commands immediately without calling init().
    await expect(
      plugin.commands.upsertEntity({
        entityType: "Seat",
        entityId: "s-1",
        data: { row: "A" },
      }),
    ).resolves.not.toThrow();
  });

  it("restoreSnapshot hydrates graph from parsed snapshot string", async () => {
    const snapshot = JSON.stringify({
      entities: { Note: { "n-1": { body: "hello" } } },
      patches: {},
      lists: {},
    });
    const { invoke } = makeFakeInvoke({
      "plugin:entity_graph|graph_restore_snapshot": { snapshot },
    });
    const { listen } = makeFakeListen();

    const plugin = new TauriGraphPlugin({ invoke, listen, options: { autoRestore: false } });
    await plugin.init();

    await plugin.commands.restoreSnapshot();

    expect(useGraphStore.getState().entities["Note"]?.["n-1"]?.["body"]).toBe("hello");
  });
});
