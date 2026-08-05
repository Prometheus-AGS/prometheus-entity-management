import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import {
  createGraphStore,
  GraphStoreProvider,
  type ChangeSet,
  type RealtimeAdapter,
} from "@prometheus-ags/prometheus-entity-management";
import { useScopedRealtimeManager } from "./use-scoped-realtime-manager";

function createAdapter() {
  const handlers = new Set<(changeSet: ChangeSet) => void>();
  const adapter: RealtimeAdapter = {
    name: "provider-replacement",
    subscribe: (_config, handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
  };

  return {
    adapter,
    emit(changeSet: ChangeSet) {
      for (const handler of handlers) handler(changeSet);
    },
  };
}

describe("useScopedRealtimeManager", () => {
  it("rebinds realtime writes when the provider store changes", () => {
    const firstStore = createGraphStore();
    const secondStore = createGraphStore();
    let activeStore = firstStore;
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GraphStoreProvider store={activeStore}>{children}</GraphStoreProvider>
    );
    const hook = renderHook(
      () => useScopedRealtimeManager({ flushInterval: 0 }),
      { wrapper },
    );
    const firstManager = hook.result.current;

    activeStore = secondStore;
    hook.rerender();

    expect(hook.result.current).not.toBe(firstManager);
    const source = createAdapter();
    const unregister = hook.result.current.register(source.adapter, [{ type: "Task" }]);

    act(() => {
      source.emit({
        timestamp: "2026-08-03T00:00:00.000Z",
        changes: [
          {
            op: "upsert",
            type: "Task",
            id: "t1",
            data: { title: "Scoped to the replacement provider" },
          },
        ],
      });
    });

    expect(firstStore.getState().readEntity("Task", "t1")).toBeNull();
    expect(secondStore.getState().readEntity("Task", "t1")).toEqual({
      title: "Scoped to the replacement provider",
    });

    unregister();
    hook.unmount();
  });
});
