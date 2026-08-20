import { act, renderHook } from "@testing-library/react";
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
});
