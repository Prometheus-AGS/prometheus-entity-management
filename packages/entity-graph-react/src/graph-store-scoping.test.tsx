import { describe, expect, it, afterEach } from "vitest";
import { render } from "@testing-library/react";
import {
  createGraphStore,
  graphStore,
  __resetActiveGraphStore,
} from "@prometheus-ags/entity-graph-core";
import { GraphStoreProvider, useGraphStore, useGraphStoreApi } from "./graph-store";

/**
 * Regression tests for issue #42.
 *
 * 3.0.3 copied the StoreApi off the singleton with `Object.assign`, so imperative
 * access bypassed any provider. 3.0.4 replaced the copies with warning delegates
 * that still targeted the singleton. These assert the actual fix: imperative
 * access resolves the ACTIVE graph.
 */
afterEach(() => __resetActiveGraphStore());

function Mount({ onReady }: { onReady?: () => void }) {
  useGraphStoreApi();
  onReady?.();
  return null;
}

describe("imperative access under GraphStoreProvider", () => {
  it("routes useGraphStore.getState() writes to the PROVIDER's store", () => {
    const scoped = createGraphStore();
    render(
      <GraphStoreProvider store={scoped}>
        <Mount />
      </GraphStoreProvider>,
    );

    // Exactly the shape used by Zustand store actions and module helpers.
    useGraphStore.getState().upsertEntity("Acquisition", "1", { landManName: "SCOPED" });

    expect(scoped.getState().entities.Acquisition?.["1"]).toMatchObject({
      landManName: "SCOPED",
    });
    expect(graphStore.getState().entities.Acquisition?.["1"]).toBeUndefined();
  });

  it("falls back to the singleton with no provider mounted", () => {
    useGraphStore.getState().upsertEntity("Acquisition", "2", { landManName: "GLOBAL" });
    expect(graphStore.getState().entities.Acquisition?.["2"]).toMatchObject({
      landManName: "GLOBAL",
    });
  });

  it("restores the previous active store on unmount", () => {
    const scoped = createGraphStore();
    const { unmount } = render(
      <GraphStoreProvider store={scoped}>
        <Mount />
      </GraphStoreProvider>,
    );
    unmount();

    useGraphStore.getState().upsertEntity("Acquisition", "3", { landManName: "AFTER" });
    expect(graphStore.getState().entities.Acquisition?.["3"]).toMatchObject({
      landManName: "AFTER",
    });
    expect(scoped.getState().entities.Acquisition?.["3"]).toBeUndefined();
  });

  it("still exposes the full StoreApi surface", () => {
    for (const m of ["getState", "setState", "subscribe", "getInitialState"] as const) {
      expect(typeof useGraphStore[m]).toBe("function");
    }
  });

  it("selector form keeps resolving through the provider", () => {
    const scoped = createGraphStore();
    scoped.getState().upsertEntity("Acquisition", "4", { landManName: "VIA_SELECTOR" });
    let seen: unknown = null;
    function Read() {
      seen = useGraphStore((s) => s.entities.Acquisition?.["4"]);
      return null;
    }
    render(
      <GraphStoreProvider store={scoped}>
        <Read />
      </GraphStoreProvider>,
    );
    expect(seen).toMatchObject({ landManName: "VIA_SELECTOR" });
  });
});
