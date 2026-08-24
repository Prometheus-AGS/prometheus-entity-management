import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  registerMergeStrategy,
  serializeKey,
  useGraphStore,
} from "@prometheus-ags/entity-graph-core";
import { createGQLClient, normalizeGQLResponse } from "./client";
import { useGQLEntity, useGQLList } from "./hooks";

type Row = { id: string; name: string };
type QueryData = { rows: Row[]; total: number };

beforeEach(() => {
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("useGQLList atomic normalization", () => {
  it("publishes one complete success state regardless of row count", async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index}`,
      name: `Row ${index}`,
    }));
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { rows, total: rows.length } }),
    })));
    const client = createGQLClient({ url: "https://example.invalid/graphql" });
    const key = serializeKey(["gql-rows"]);
    const selectedRows = rows.slice(0, 6);
    const successSnapshots: string[][] = [];
    const unsubscribe = useGraphStore.subscribe((state) => {
      const ids = state.lists[key]?.ids ?? [];
      if (ids.length === selectedRows.length) successSnapshots.push(ids);
    });

    const { result } = renderHook(() => useGQLList<QueryData, Row>({
      client,
      document: "query Rows { rows { id name } }",
      type: "GQLRow",
      queryKey: ["gql-rows"],
      descriptor: {
        type: "GQLRow",
        path: "rows",
        normalize: (node) => node as Row,
      },
      getItems: () => selectedRows,
      getPagination: (data) => ({ total: data.total }),
    }));

    await waitFor(() => expect(result.current.ids).toHaveLength(selectedRows.length));
    unsubscribe();

    expect(successSnapshots).toHaveLength(1);
    expect(result.current.items.map((row) => row.id)).toEqual(selectedRows.map((row) => row.id));
    expect(Object.keys(useGraphStore.getState().entities.GQLRow)).toHaveLength(rows.length);
  });

  it("publishes no primary state when a side descriptor merge fails", () => {
    const primaryDescriptor = {
      type: "PrimaryGQLRow",
      path: "rows",
      normalize: (node: unknown) => node as Row,
    };
    const sideDescriptor = {
      type: "BrokenGQLSide",
      path: "side",
      normalize: (node: unknown) => node as Row,
    };
    registerMergeStrategy("BrokenGQLSide", () => {
      throw new Error("side descriptor failed");
    });
    let publications = 0;
    const unsubscribe = useGraphStore.subscribe(() => { publications += 1; });

    expect(() => normalizeGQLResponse(
      { rows: [{ id: "primary", name: "Primary" }], side: { id: "side", name: "Side" } },
      [primaryDescriptor, sideDescriptor],
      useGraphStore,
      {
        listIngestion: {
          descriptor: primaryDescriptor,
          targets: [{ key: "primary-gql-list" }],
        },
      },
    )).toThrow("side descriptor failed");
    unsubscribe();

    expect(publications).toBe(0);
    expect(useGraphStore.getState().entities.PrimaryGQLRow).toBeUndefined();
    expect(useGraphStore.getState().lists["primary-gql-list"]).toBeUndefined();
  });

  it("completes a missing entity response instead of staying fetching", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: null }),
    })));
    const client = createGQLClient({ url: "https://example.invalid/graphql" });
    const { result } = renderHook(() => useGQLEntity<null, Row>({
      client,
      document: "query Row($id: ID!) { row(id: $id) { id name } }",
      type: "MissingGQLRow",
      id: "missing",
      descriptor: {
        type: "MissingGQLRow",
        path: "row",
        normalize: (node) => node as Row,
      },
    }));

    await waitFor(() => expect(result.current.isFetching).toBe(false));
    expect(result.current.data).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it("completes an empty list response atomically", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({
      ok: true,
      json: async () => ({ data: { rows: [], total: 0 } }),
    })));
    const client = createGQLClient({ url: "https://example.invalid/graphql" });
    const key = serializeKey(["empty-gql-rows"]);
    const { result } = renderHook(() => useGQLList<QueryData, Row>({
      client,
      document: "query EmptyRows { rows { id name } }",
      type: "EmptyGQLRow",
      queryKey: ["empty-gql-rows"],
      descriptor: {
        type: "EmptyGQLRow",
        path: "rows",
        normalize: (node) => node as Row,
      },
      getItems: (data) => data.rows,
      getPagination: (data) => ({ total: data.total }),
    }));

    await waitFor(() => expect(useGraphStore.getState().lists[key]?.lastFetched).not.toBeNull());
    expect(result.current.ids).toEqual([]);
    expect(result.current.isFetching).toBe(false);
    expect(result.current.total).toBe(0);
  });
});
