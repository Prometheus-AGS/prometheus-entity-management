import { describe, it, expect, afterEach } from "vitest";
import { getRealtimeManager, RealtimeManager, resetRealtimeManager } from "./adapters/realtime-manager";
import { createGraphStore, useGraphStore } from "./graph";
import type { RealtimeAdapter, ChangeSet } from "./adapters/types";

afterEach(() => {
  resetRealtimeManager();
  useGraphStore.getState().removeEntity("RtDemo", "r1");
});

describe("RealtimeManager", () => {
  it("applies ChangeSet to graph with flushInterval 0", () => {
    const adapter: RealtimeAdapter = {
      name: "test-adapter",
      subscribe(_cfg, handler) {
        const cs: ChangeSet = {
          changes: [{ op: "upsert", type: "RtDemo", id: "r1", data: { id: "r1", title: "hello" } }],
        };
        handler(cs);
        return () => {};
      },
    };

    const mgr = getRealtimeManager({ flushInterval: 0 });
    mgr.register(adapter, [{ type: "RtDemo" }]);

    const row = useGraphStore.getState().readEntity<Record<string, unknown>>("RtDemo", "r1");
    expect(row?.title).toBe("hello");
  });

  it("coalesces repeated patches into one graph write without changing update semantics", () => {
    let emit: (changes: ChangeSet) => void = () => undefined;
    const adapter: RealtimeAdapter = {
      name: "coalesced-updates",
      subscribe(_cfg, handler) {
        emit = handler;
        return () => {};
      },
    };
    useGraphStore.getState().upsertEntity("RtDemo", "r1", {
      id: "r1",
      status: "todo",
    });
    let graphWrites = 0;
    const unsubscribe = useGraphStore.subscribe(() => {
      graphWrites += 1;
    });
    const manager = new RealtimeManager({ flushInterval: 16 });
    manager.register(adapter, [{ type: "RtDemo" }]);

    emit({
      changes: [
        { op: "update", type: "RtDemo", id: "r1", patch: { status: "todo" } },
        { op: "update", type: "RtDemo", id: "r1", patch: { status: "in-progress" } },
        { op: "update", type: "RtDemo", id: "r1", patch: { status: "review" } },
      ],
    });
    manager.forceFlush();
    unsubscribe();
    manager.unregisterAll();

    expect(graphWrites).toBe(1);
    expect(
      useGraphStore.getState().readEntity<Record<string, unknown>>("RtDemo", "r1")?.status,
    ).toBe("review");
  });

  it("applies client takeover events only to the selected graph", () => {
    const requestStore = createGraphStore();
    const adapter: RealtimeAdapter = {
      name: "request-scoped-adapter",
      subscribe(_cfg, handler) {
        handler({
          changes: [
            {
              op: "upsert",
              type: "RtDemo",
              id: "request-only",
              data: { id: "request-only", status: "connected" },
            },
          ],
        });
        return () => {};
      },
    };

    const manager = new RealtimeManager({ store: requestStore, flushInterval: 0 });
    manager.register(adapter, [{ type: "RtDemo" }]);

    expect(
      requestStore.getState().readEntity<Record<string, unknown>>("RtDemo", "request-only"),
    ).toEqual({ id: "request-only", status: "connected" });
    expect(
      useGraphStore.getState().readEntity("RtDemo", "request-only"),
    ).toBeNull();
  });
});
