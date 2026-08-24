import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetEntityTransports,
  createGraphStore,
  registerEntityTransport,
  serializeKey,
} from "@prometheus-ags/entity-graph-core";
import { GraphStoreProvider } from "../graph-store";
import { useEntities } from "./use-entities";

type Row = { id: string; value: number };

afterEach(() => {
  __resetEntityTransports();
});

describe("useEntities atomic fetched-list integration", () => {
  it("publishes one complete graph success state after the transport resolves", async () => {
    let resolveList!: (result: { rows: Row[]; total: number; nextCursor: null }) => void;
    const list = vi.fn(() => new Promise<{ rows: Row[]; total: number; nextCursor: null }>((resolve) => {
      resolveList = resolve;
    }));
    registerEntityTransport<Row>("AtomicHookRow", {
      identify: (row) => row.id,
      authoritative: true,
      list,
    });

    const store = createGraphStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GraphStoreProvider store={store}>{children}</GraphStoreProvider>
    );
    const { result } = renderHook(
      () => useEntities<Row>("AtomicHookRow"),
      { wrapper },
    );

    await waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    const key = serializeKey(["AtomicHookRow", {
      filter: undefined,
      sort: undefined,
      search: undefined,
      limit: undefined,
      cursor: undefined,
    }]);
    await waitFor(() => expect(store.getState().lists[key]?.isFetching).toBe(true));

    let successPublications = 0;
    const unsubscribe = store.subscribe(() => { successPublications += 1; });
    await act(async () => {
      resolveList({
        rows: [{ id: "row-1", value: 1 }, { id: "row-2", value: 2 }],
        total: 2,
        nextCursor: null,
      });
    });
    await waitFor(() => expect(result.current.items).toHaveLength(2));
    unsubscribe();

    expect(successPublications).toBe(1);
    expect(store.getState().lists[key]?.ids).toEqual(["row-1", "row-2"]);
    expect(store.getState().entityStates["AtomicHookRow:row-1"]).toMatchObject({
      isFetching: false,
      error: null,
      stale: false,
    });
  });
});
