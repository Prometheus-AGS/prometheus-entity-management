import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { graphStore } from "@prometheus-ags/entity-graph-core";
import {
  graphSyncStatusStore,
  useGraphStore,
  useGraphSyncStatus,
} from "./graph-store";

describe("React bindings over the vanilla core store", () => {
  beforeEach(() => {
    graphStore.setState({
      entities: {},
      patches: {},
      entityStates: {},
      syncMetadata: {},
      lists: {},
    });
    graphSyncStatusStore.getState().setStatus({
      phase: "idle",
      isOnline: true,
      isSynced: true,
      pendingActions: 0,
      lastHydratedAt: null,
      lastPersistedAt: null,
      storageKey: null,
      error: null,
    });
  });

  it("subscribes components to writes made through the core singleton", () => {
    const { result } = renderHook(() =>
      useGraphStore((state) => state.readEntity<{ name: string }>("Project", "p1")),
    );

    expect(result.current).toBeNull();
    act(() => {
      graphStore.getState().upsertEntity("Project", "p1", { name: "Prometheus" });
    });
    expect(result.current).toEqual({ name: "Prometheus" });
  });

  it("preserves imperative StoreApi methods on the React compatibility hook", () => {
    expect(useGraphStore.getState).toBe(graphStore.getState);
    expect(useGraphStore.setState).toBe(graphStore.setState);
    expect(useGraphStore.subscribe).toBe(graphStore.subscribe);
  });

  it("subscribes to framework-neutral local-first status", () => {
    const { result } = renderHook(() => useGraphSyncStatus());
    expect(result.current.phase).toBe("idle");

    act(() => {
      graphSyncStatusStore.getState().setStatus({
        phase: "syncing",
        pendingActions: 2,
        isSynced: false,
      });
    });
    expect(result.current.phase).toBe("syncing");
    expect(result.current.pendingActions).toBe(2);
  });
});
