import type { ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createGraphStore, type SyncAdapter } from "@prometheus-ags/entity-graph-core";
import { GraphStoreProvider } from "../graph-store";
import { usePGliteQuery } from "./electricsql-react";

type Row = { id: string; value: number };

describe("usePGliteQuery fetched-list integration", () => {
  it("publishes one complete graph success state for the returned rows", async () => {
    let resolveQuery!: (result: { rows: Row[] }) => void;
    const queryStarted = vi.fn();
    const adapter: SyncAdapter = {
      name: "test-pglite",
      query: async <T,>() => {
        queryStarted();
        return new Promise<{ rows: T[] }>((resolve) => {
          resolveQuery = (result) => resolve({ rows: result.rows as unknown as T[] });
        });
      },
      execute: vi.fn(async () => undefined),
      isSynced: () => true,
      onSyncComplete: () => () => undefined,
      subscribe: () => () => undefined,
    };
    const store = createGraphStore();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <GraphStoreProvider store={store}>{children}</GraphStoreProvider>
    );
    const { result } = renderHook(
      () => usePGliteQuery<Row>({ adapter, type: "PGliteRow", sql: "SELECT * FROM rows" }),
      { wrapper },
    );
    await waitFor(() => expect(queryStarted).toHaveBeenCalledTimes(1));

    let successPublications = 0;
    const unsubscribe = store.subscribe(() => { successPublications += 1; });
    await act(async () => {
      resolveQuery({ rows: [{ id: "row-1", value: 1 }, { id: "row-2", value: 2 }] });
    });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    unsubscribe();

    expect(result.current.error).toBeNull();
    expect(successPublications).toBe(1);
    expect(store.getState().entities.PGliteRow).toEqual({
      "row-1": { id: "row-1", value: 1 },
      "row-2": { id: "row-2", value: 2 },
    });
    expect(store.getState().entityStates["PGliteRow:row-2"]).toMatchObject({
      isFetching: false,
      error: null,
      stale: false,
    });
  });
});
