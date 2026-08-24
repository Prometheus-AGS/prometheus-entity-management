import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import {
  serializeKey,
  useGraphStore,
} from "@prometheus-ags/entity-graph-core";
import { useEntityQuery } from "../hooks/use-entity-query";
import { useEntityView } from "./use-entity-view";

type Row = { id: string; name: string };

beforeEach(() => {
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
});

describe("entity view projection reactivity", () => {
  it("updates useEntityView items when an existing entity changes", () => {
    const baseKey = serializeKey(["rows"]);
    useGraphStore.getState().upsertEntity("Row", "row-1", {
      id: "row-1",
      name: "Before",
    });
    useGraphStore.getState().setListResult(baseKey, ["row-1"], {
      total: 1,
      hasNextPage: false,
    });

    const { result } = renderHook(() =>
      useEntityView<Row>({
        type: "Row",
        baseQueryKey: ["rows"],
        mode: "local",
        view: {},
      }),
    );
    expect(result.current.items[0]?.name).toBe("Before");

    act(() => {
      useGraphStore.getState().upsertEntity("Row", "row-1", {
        name: "After",
      });
    });

    expect(result.current.viewIds).toEqual(["row-1"]);
    expect(result.current.items[0]?.name).toBe("After");
  });

  it("updates useEntityQuery items when an existing entity changes", () => {
    const baseKey = serializeKey(["QueryRow", "__base__"]);
    useGraphStore.getState().upsertEntity("QueryRow", "row-1", {
      id: "row-1",
      name: "Before",
    });
    useGraphStore.getState().setListResult(baseKey, ["row-1"], {
      total: 1,
      hasNextPage: false,
    });

    const { result } = renderHook(() =>
      useEntityQuery<Row>("QueryRow", { mode: "local" }),
    );
    expect(result.current.items[0]?.name).toBe("Before");

    act(() => {
      useGraphStore.getState().upsertEntity("QueryRow", "row-1", {
        name: "After",
      });
    });

    expect(result.current.viewIds).toEqual(["row-1"]);
    expect(result.current.items[0]?.name).toBe("After");
  });

  it("applies a remote projection page with one success publication", async () => {
    const rows = Array.from({ length: 12 }, (_, index) => ({
      id: `row-${index}`,
      name: index % 2 === 0 ? `Keep ${index}` : `Skip ${index}`,
      rank: 12 - index,
    }));
    const baseKey = serializeKey(["remote-rows"]);
    const remoteFetch = async () => ({ items: rows, total: rows.length });
    const successSnapshots: string[][] = [];
    const unsubscribe = useGraphStore.subscribe((state) => {
      const ids = state.lists[baseKey]?.ids ?? [];
      if (ids.length === 6) successSnapshots.push(ids);
    });

    const { result } = renderHook(() =>
      useEntityView<{ id: string; name: string; rank: number }>({
        type: "RemoteProjectionRow",
        baseQueryKey: ["remote-rows"],
        mode: "remote",
        remoteDebounce: 60_000,
        view: {
          filter: [{ field: "name", op: "startsWith", value: "Keep" }],
          sort: [{ field: "rank", direction: "asc" }],
        },
        remoteFetch,
      }),
    );

    await waitFor(() => expect(result.current.viewIds).toHaveLength(6));
    unsubscribe();

    expect(successSnapshots).toHaveLength(1);
    expect(successSnapshots[0]).toEqual(["row-10", "row-8", "row-6", "row-4", "row-2", "row-0"]);
  });
});
