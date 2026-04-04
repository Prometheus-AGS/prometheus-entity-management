import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "./graph";

describe("graph store", () => {
  beforeEach(() => {
    const s = useGraphStore.getState();
    s.removeEntity("TestWidget", "w1");
    s.removeEntity("TestWidget", "w2");
  });

  it("upsertEntity and readEntity merge patches at read time", () => {
    const store = useGraphStore.getState();
    store.upsertEntity("TestWidget", "w1", { id: "w1", name: "A" });
    store.patchEntity("TestWidget", "w1", { _selected: true });
    const row = store.readEntity<Record<string, unknown>>("TestWidget", "w1");
    expect(row?.name).toBe("A");
    expect(row?._selected).toBe(true);
    expect(store.entities.TestWidget?.w1?._selected).toBeUndefined();
  });

  it("setListResult stores ids only", () => {
    const key = '["test-list"]';
    useGraphStore.getState().upsertEntity("TestWidget", "w1", { id: "w1", name: "Row" });
    useGraphStore.getState().setListResult(key, ["w1"], { total: 1 });
    const next = useGraphStore.getState();
    expect(next.lists[key]?.ids).toEqual(["w1"]);
    expect(next.readEntity("TestWidget", "w1")?.name).toBe("Row");
  });
});
