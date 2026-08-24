import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { createGraphStore, graphStore } from "@prometheus-ags/entity-graph-core";
import {
  GraphStoreProvider,
  graphSyncStatusStore,
  useGraphStore,
  useGraphStoreApi,
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

  it("isolates provider-owned graphs from the default singleton and sibling providers", () => {
    const requestA = createGraphStore();
    const requestB = createGraphStore();
    const wrapperA = ({ children }: { children: ReactNode }) => (
      <GraphStoreProvider store={requestA}>{children}</GraphStoreProvider>
    );
    const wrapperB = ({ children }: { children: ReactNode }) => (
      <GraphStoreProvider store={requestB}>{children}</GraphStoreProvider>
    );

    const hookA = renderHook(
      () => ({
        store: useGraphStoreApi(),
        entity: useGraphStore((state) => state.readEntity("Request", "current")),
      }),
      { wrapper: wrapperA },
    );
    const hookB = renderHook(
      () => useGraphStore((state) => state.readEntity("Request", "current")),
      { wrapper: wrapperB },
    );

    act(() => {
      requestA.getState().upsertEntity("Request", "current", { requestId: "a" });
    });

    expect(hookA.result.current.store).toBe(requestA);
    expect(hookA.result.current.entity).toEqual({ requestId: "a" });
    expect(hookB.result.current).toBeNull();
    expect(graphStore.getState().readEntity("Request", "current")).toBeNull();
  });

  it("releases provider-owned graph listeners when the final hook unmounts", () => {
    const request = createGraphStore();
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GraphStoreProvider store={request}>{children}</GraphStoreProvider>
    );

    try {
      const hook = renderHook(() => useGraphStoreApi(), { wrapper });
      expect(addEventListener).toHaveBeenCalledWith("focus", expect.any(Function));

      hook.unmount();

      expect(removeEventListener).toHaveBeenCalledWith("focus", expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
      expect(removeEventListener).toHaveBeenCalledWith(
        "visibilitychange",
        expect.any(Function),
      );
    } finally {
      addEventListener.mockRestore();
      removeEventListener.mockRestore();
    }
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
