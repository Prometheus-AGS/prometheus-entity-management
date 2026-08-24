import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchList, getEngineOptions } from "./engine";
import { createGraphStore } from "./graph";
import { __resetMergeStrategies, registerMergeStrategy } from "./merge/registry";

afterEach(() => {
  vi.restoreAllMocks();
  __resetMergeStrategies();
});

describe("ingestFetchedList", () => {
  it.each([1, 12, 7_248])(
    "publishes one complete success state for %i fetched rows",
    (rowCount) => {
      const store = createGraphStore();
      const entries = Array.from({ length: rowCount }, (_, index) => ({
        id: `row-${index}`,
        data: { id: `row-${index}`, value: index },
      }));
      let publications = 0;
      const unsubscribe = store.subscribe(() => { publications += 1; });

      store.getState().ingestFetchedList("Row", entries, {
        lists: [{ key: "rows", meta: { total: rowCount, hasNextPage: false } }],
      });
      unsubscribe();

      expect(publications).toBe(1);
      expect(store.getState().lists.rows.ids).toHaveLength(rowCount);
      expect(Object.keys(store.getState().entities.Row)).toHaveLength(rowCount);
    },
  );

  it("atomically preserves merge semantics and completes entity, sync, and list lifecycle state", () => {
    const store = createGraphStore();
    store.getState().upsertEntity("MergeRow", "row-1", { id: "row-1", preserved: true, value: 1 });
    store.getState().setEntityFetching("MergeRow", "row-1", true);
    store.getState().setEntityError("MergeRow", "row-1", "old entity error");
    store.getState().setEntityStale("MergeRow", "row-1", true);
    store.getState().setEntitySyncMetadata("MergeRow", "row-1", {
      synced: false,
      origin: "client",
      updatedAt: 5,
    });
    store.getState().setListResult("rows", ["old-row"], { total: 1 });
    store.getState().setListError("rows", "old list error");
    store.getState().setListFetching("base", true);

    const observedTimestamps: Array<number | null> = [];
    registerMergeStrategy("MergeRow", (previous, next, context) => {
      observedTimestamps.push(context.updatedAt);
      return { ...previous, ...next, merged: true };
    });
    vi.spyOn(Date, "now").mockReturnValue(1_234_567);

    let publications = 0;
    const unsubscribe = store.subscribe(() => { publications += 1; });
    store.getState().ingestFetchedList(
      "MergeRow",
      [{ id: "row-1", data: { value: 2 } }],
      {
        lists: [{
          key: "rows",
          meta: {
            total: 1,
            nextCursor: "next",
            prevCursor: "previous",
            hasNextPage: true,
            hasPrevPage: true,
            currentPage: 3,
            pageSize: 25,
          },
        }],
        finishListFetches: ["base"],
      },
    );
    unsubscribe();

    const state = store.getState();
    expect(publications).toBe(1);
    expect(observedTimestamps).toEqual([1_234_567]);
    expect(state.entities.MergeRow["row-1"]).toEqual({
      id: "row-1",
      preserved: true,
      value: 2,
      merged: true,
    });
    expect(state.entityStates["MergeRow:row-1"]).toEqual({
      isFetching: false,
      lastFetched: 1_234_567,
      error: null,
      stale: false,
    });
    expect(state.syncMetadata["MergeRow:row-1"]).toEqual({
      synced: true,
      origin: "server",
      updatedAt: 1_234_567,
    });
    expect(state.lists.rows).toMatchObject({
      ids: ["row-1"],
      total: 1,
      nextCursor: "next",
      prevCursor: "previous",
      hasNextPage: true,
      hasPrevPage: true,
      isFetching: false,
      isFetchingMore: false,
      error: null,
      lastError: null,
      lastFetched: 1_234_567,
      stale: false,
      currentPage: 3,
      pageSize: 25,
    });
    expect(state.lists.base.isFetching).toBe(false);
  });

  it("appends with stable deduplication and accepts an empty replacement page", () => {
    const store = createGraphStore();
    store.getState().setListResult("rows", ["existing", "duplicate"], { total: 2 });

    store.getState().ingestFetchedList(
      "Row",
      [
        { id: "duplicate", data: { value: 1 } },
        { id: "new", data: { value: 2 } },
        { id: "new", data: { value: 3 } },
      ],
      { lists: [{ key: "rows", mode: "append", meta: { total: 3 } }] },
    );
    expect(store.getState().lists.rows.ids).toEqual(["existing", "duplicate", "new"]);
    expect(store.getState().entities.Row.new.value).toBe(3);

    let publications = 0;
    const unsubscribe = store.subscribe(() => { publications += 1; });
    store.getState().ingestFetchedList("Row", [], {
      lists: [{ key: "rows", meta: { total: 0, hasNextPage: false } }],
    });
    unsubscribe();

    expect(publications).toBe(1);
    expect(store.getState().lists.rows.ids).toEqual([]);
    expect(store.getState().lists.rows.total).toBe(0);
  });

  it("keeps the pre-ingestion merge origin for repeated ids", () => {
    const store = createGraphStore();
    store.getState().upsertEntity("RepeatedRow", "row-1", { id: "row-1", value: 0 });
    store.getState().setEntitySyncMetadata("RepeatedRow", "row-1", {
      synced: false,
      origin: "client",
      updatedAt: 10,
    });
    const origins: string[] = [];
    registerMergeStrategy("RepeatedRow", (previous, next, context) => {
      origins.push(context.origin);
      return { ...previous, ...next };
    });

    store.getState().ingestFetchedList("RepeatedRow", [
      { id: "row-1", data: { value: 1 } },
      { id: "row-1", data: { value: 2 } },
    ]);

    expect(origins).toEqual(["client", "client"]);
    expect(store.getState().entities.RepeatedRow["row-1"].value).toBe(2);
    expect(store.getState().syncMetadata["RepeatedRow:row-1"].origin).toBe("server");
  });

  it("projects matching fetched rows into a sorted base list in the same publication", () => {
    const store = createGraphStore();
    store.getState().ingestFetchedList("ProjectedRow", [
      { id: "existing", data: { id: "existing", status: "open", rank: 20 } },
    ], { lists: [{ key: "base" }] });

    let publications = 0;
    const unsubscribe = store.subscribe(() => { publications += 1; });
    store.getState().ingestFetchedList("ProjectedRow", [
      { id: "later", data: { id: "later", status: "open", rank: 30 } },
      { id: "filtered", data: { id: "filtered", status: "closed", rank: 10 } },
      { id: "earlier", data: { id: "earlier", status: "open", rank: 5 } },
    ], {
      lists: [{ key: "remote" }],
      projections: [{
        key: "base",
        view: {
          filter: [{ field: "status", op: "eq", value: "open" }],
          sort: [{ field: "rank", direction: "asc" }],
        },
      }],
    });
    unsubscribe();

    expect(publications).toBe(1);
    expect(store.getState().lists.base.ids).toEqual(["earlier", "existing", "later"]);
    expect(store.getState().lists.remote.ids).toEqual(["later", "filtered", "earlier"]);
  });

  it("rolls back the primary list when a side batch merge fails", () => {
    const store = createGraphStore();
    registerMergeStrategy("BrokenSide", () => {
      throw new Error("side merge failed");
    });
    let publications = 0;
    const unsubscribe = store.subscribe(() => { publications += 1; });

    expect(() => store.getState().ingestFetchedList(
      "PrimaryRow",
      [{ id: "primary", data: { id: "primary" } }],
      {
        lists: [{ key: "primary-list" }],
        sideBatches: [{
          type: "BrokenSide",
          entries: [{ id: "side", data: { id: "side" } }],
        }],
      },
    )).toThrow("side merge failed");
    unsubscribe();

    expect(publications).toBe(0);
    expect(store.getState().entities.PrimaryRow).toBeUndefined();
    expect(store.getState().lists["primary-list"]).toBeUndefined();
  });
});

describe("fetchList atomic success boundary", () => {
  it("publishes fetch-start then one complete success before side effects and callbacks", async () => {
    const store = createGraphStore();
    store.getState().setListResult('["rows"]', ["old"], { total: 1 });
    store.getState().setListStale('["rows"]', true);
    const observations: string[] = [];
    let publications = 0;
    const unsubscribe = store.subscribe(() => { publications += 1; });

    await fetchList(
      {
        type: "EngineRow",
        queryKey: ["rows"],
        fetch: async () => ({
          items: [{ id: "row-1", value: 1 }],
          total: 1,
          nextCursor: null,
          hasNextPage: false,
        }),
        normalize: (row) => ({ id: row.id, data: row }),
        sideEffects: (_items, graph) => {
          observations.push(`side-effect:${graph.getState().lists['["rows"]'].ids.join(",")}`);
        },
        onSuccess: () => {
          observations.push(`success:${store.getState().lists['["rows"]'].stale}`);
        },
      },
      {},
      { ...getEngineOptions(), maxRetries: 0 },
      false,
      store,
    );
    unsubscribe();

    expect(publications).toBe(2);
    expect(observations).toEqual(["side-effect:row-1", "success:false"]);
    expect(store.getState().entityStates["EngineRow:row-1"].lastFetched).not.toBeNull();
  });

  it("retries without partial state and publishes one final success", async () => {
    const store = createGraphStore();
    let attempts = 0;
    let publications = 0;
    const unsubscribe = store.subscribe(() => { publications += 1; });

    await fetchList(
      {
        type: "RetryRow",
        queryKey: ["retry"],
        fetch: async () => {
          attempts += 1;
          if (attempts === 1) throw new Error("transient");
          return { items: [{ id: "row-1" }], total: 1 };
        },
        normalize: (row) => ({ id: row.id, data: row }),
      },
      {},
      { ...getEngineOptions(), maxRetries: 1, retryBaseDelay: 0 },
      false,
      store,
    );
    unsubscribe();

    expect(attempts).toBe(2);
    expect(publications).toBe(2);
    expect(store.getState().lists['["retry"]'].ids).toEqual(["row-1"]);
  });

  it("keeps entity data untouched when the fetch fails", async () => {
    const store = createGraphStore();
    const onError = vi.fn();

    await fetchList(
      {
        type: "FailedRow",
        queryKey: ["failed"],
        fetch: async () => { throw new Error("failed request"); },
        normalize: (row: { id: string }) => ({ id: row.id, data: row }),
        onError,
      },
      {},
      { ...getEngineOptions(), maxRetries: 0 },
      false,
      store,
    );

    expect(store.getState().entities.FailedRow).toBeUndefined();
    expect(store.getState().lists['["failed"]']).toMatchObject({
      ids: [],
      isFetching: false,
      error: "failed request",
    });
    expect(onError).toHaveBeenCalledTimes(1);
  });
});
