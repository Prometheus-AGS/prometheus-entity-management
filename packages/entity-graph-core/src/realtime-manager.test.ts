import { describe, it, expect, afterEach } from "vitest";
import { getRealtimeManager, resetRealtimeManager } from "./adapters/realtime-manager";
import { useGraphStore } from "./graph";
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
});
