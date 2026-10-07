import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGraphStore, type GraphStore } from "./graph";
import { configureEngine, startGarbageCollector } from "./engine";

// Regression for issue #43: GC emptied mounted lists because list membership was not a GC
// reference, and removeIdFromAllLists stripped ids from lists of every entity type.

const GC_TIME = 100;
const GC_INTERVAL = 10;

function ingest(store: GraphStore, type: string, key: string, ids: string[]): void {
  store.getState().ingestFetchedList(
    type,
    ids.map((id) => ({ id, data: { id } })),
    { lists: [{ key, mode: "replace" }] },
  );
}

function collectAfterGcTime(store: GraphStore): void {
  vi.setSystemTime(Date.now() + GC_TIME + 1);
  const stop = startGarbageCollector(store);
  vi.advanceTimersByTime(GC_INTERVAL);
  stop();
}

describe("garbage collection respects list membership", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-15T12:00:00.000Z"));
    vi.stubGlobal("window", {});
    configureEngine({ defaultGcTime: GC_TIME, gcInterval: GC_INTERVAL });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    configureEngine({});
    vi.useRealTimers();
  });

  it("keeps entities referenced by a typed list, and the list itself", () => {
    const store = createGraphStore();
    ingest(store, "User", '["users"]', ["1", "2"]);

    collectAfterGcTime(store);

    expect(Object.keys(store.getState().entities.User ?? {})).toEqual(["1", "2"]);
    expect(store.getState().lists['["users"]']?.ids).toEqual(["1", "2"]);
  });

  it("keeps entities referenced by an untyped list", () => {
    const store = createGraphStore();
    store.getState().upsertEntity("User", "7", { id: "7" });
    store.getState().setEntityFetched("User", "7");
    store.getState().setListResult('["legacy"]', ["7"], {});

    collectAfterGcTime(store);

    expect(store.getState().entities.User?.["7"]).toEqual({ id: "7" });
    expect(store.getState().lists['["legacy"]']?.ids).toEqual(["7"]);
  });

  it("collects an entity once a refetch drops it from every list", () => {
    const store = createGraphStore();
    ingest(store, "User", '["users"]', ["1", "2"]);
    ingest(store, "User", '["users"]', ["2"]);

    collectAfterGcTime(store);

    expect(store.getState().entities.User?.["1"]).toBeUndefined();
    expect(store.getState().entities.User?.["2"]).toEqual({ id: "2" });
  });

  it("does not let a typed list of another type retain an entity", () => {
    const store = createGraphStore();
    ingest(store, "County", '["counties"]', ["1"]);
    store.getState().upsertEntity("User", "1", { id: "1" });
    store.getState().setEntityFetched("User", "1");

    collectAfterGcTime(store);

    expect(store.getState().entities.User?.["1"]).toBeUndefined();
    expect(store.getState().entities.County?.["1"]).toEqual({ id: "1" });
    expect(store.getState().lists['["counties"]']?.ids).toEqual(["1"]);
  });
});

describe("removeIdFromAllLists respects entity type", () => {
  it("leaves typed lists of another type intact but still splices untyped lists", () => {
    const store = createGraphStore();
    ingest(store, "Task", '["tasks"]', ["1", "2"]);
    ingest(store, "Project", '["projects"]', ["1"]);
    store.getState().setListResult('["untyped"]', ["1"], { total: 1 });

    store.getState().removeIdFromAllLists("Project", "1");

    expect(store.getState().lists['["tasks"]']?.ids).toEqual(["1", "2"]);
    expect(store.getState().lists['["projects"]']?.ids).toEqual([]);
    expect(store.getState().lists['["untyped"]']).toMatchObject({ ids: [], total: 0 });
  });

  it("records the entity type on lists written by ingestFetchedList", () => {
    const store = createGraphStore();
    ingest(store, "Task", '["tasks"]', ["1"]);

    expect(store.getState().lists['["tasks"]']?.entityType).toBe("Task");
  });
});
