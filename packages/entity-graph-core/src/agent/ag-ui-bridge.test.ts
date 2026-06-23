import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "../graph";
import { __resetMergeStrategies } from "../merge/registry";
import { applyAgUiSnapshot, applyAgUiDelta, type AgUiStateMapping } from "./ag-ui-bridge";

describe("AG-UI ingestion bridge", () => {
  beforeEach(() => {
    __resetMergeStrategies();
    const s = useGraphStore.getState();
    for (const id of Object.keys(s.entities.Order ?? {})) s.removeEntity("Order", id);
    for (const id of Object.keys(s.entities.LineItem ?? {})) s.removeEntity("LineItem", id);
  });

  it("applyAgUiSnapshot writes a single mapped entity into the graph", () => {
    const mappings: AgUiStateMapping[] = [
      { entityType: "Order", pointer: "/order", kind: "single", write: "replace" },
    ];
    applyAgUiSnapshot(
      { type: "STATE_SNAPSHOT", snapshot: { order: { id: "o1", status: "open", total: 10 } } },
      { mappings },
    );
    const row = useGraphStore.getState().readEntity<Record<string, unknown>>("Order", "o1");
    expect(row).toEqual({ id: "o1", status: "open", total: 10 });
  });

  it("applyAgUiSnapshot writes a collection keyed by idField", () => {
    const mappings: AgUiStateMapping[] = [
      { entityType: "LineItem", pointer: "/items", kind: "collection", idField: "id" },
    ];
    applyAgUiSnapshot(
      { snapshot: { items: [{ id: "li1", qty: 1 }, { id: "li2", qty: 2 }] } },
      { mappings },
    );
    const s = useGraphStore.getState();
    expect(s.readEntity("LineItem", "li1")).toEqual({ id: "li1", qty: 1 });
    expect(s.readEntity("LineItem", "li2")).toEqual({ id: "li2", qty: 2 });
  });

  it("applyAgUiDelta applies an RFC-6902 replace to a mapped entity", () => {
    const mappings: AgUiStateMapping[] = [
      { entityType: "Order", pointer: "/order", kind: "single", constantId: "o1" },
    ];
    // seed
    useGraphStore.getState().upsertEntity("Order", "o1", { id: "o1", status: "open", total: 10 });
    applyAgUiDelta(
      { type: "STATE_DELTA", delta: [{ op: "replace", path: "/order/status", value: "shipped" }] },
      { mappings },
      { order: { id: "o1", status: "open", total: 10 } },
    );
    const row = useGraphStore.getState().readEntity<Record<string, unknown>>("Order", "o1");
    expect(row?.status).toBe("shipped");
    expect(row?.total).toBe(10); // unrelated field preserved (upsert merge)
  });

  it("delta reconstructs state from the graph when currentState is omitted", () => {
    const mappings: AgUiStateMapping[] = [
      { entityType: "LineItem", pointer: "/items", kind: "collection", idField: "id" },
    ];
    useGraphStore.getState().upsertEntity("LineItem", "li1", { id: "li1", qty: 1 });
    applyAgUiDelta(
      { delta: [{ op: "replace", path: "/items/0/qty", value: 5 }] },
      { mappings },
    );
    expect(useGraphStore.getState().readEntity<Record<string, unknown>>("LineItem", "li1")?.qty).toBe(5);
  });

  it("ignores snapshots whose mapped slice is absent", () => {
    const mappings: AgUiStateMapping[] = [
      { entityType: "Order", pointer: "/order", kind: "single", constantId: "o1" },
    ];
    applyAgUiSnapshot({ snapshot: { somethingElse: true } }, { mappings });
    expect(useGraphStore.getState().readEntity("Order", "o1")).toBeNull();
  });
});
