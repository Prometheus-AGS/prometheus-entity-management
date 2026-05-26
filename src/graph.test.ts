import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "./graph";

describe("graph store", () => {
  beforeEach(() => {
    const s = useGraphStore.getState();
    s.removeEntity("TestWidget", "w1");
    s.removeEntity("TestWidget", "w2");
    s.removeEntity("TestWidget", "w3");
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

  it("readEntitySnapshot keeps identity stable until graph refs change", () => {
    const store = useGraphStore.getState();
    store.upsertEntity("TestWidget", "w3", { id: "w3", name: "Stable" });

    const first = store.readEntitySnapshot("TestWidget", "w3");
    const second = store.readEntitySnapshot("TestWidget", "w3");
    expect(second).toBe(first);

    store.patchEntity("TestWidget", "w3", { _selected: true });
    const patched = useGraphStore.getState().readEntitySnapshot("TestWidget", "w3");
    expect(patched).not.toBe(first);
    expect(patched?._selected).toBe(true);
    expect(useGraphStore.getState().readEntitySnapshot("TestWidget", "w3")).toBe(patched);

    useGraphStore
      .getState()
      .setEntitySyncMetadata("TestWidget", "w3", { synced: false, origin: "client", updatedAt: 123 });
    const metadataChanged = useGraphStore.getState().readEntitySnapshot("TestWidget", "w3");
    expect(metadataChanged).not.toBe(patched);
    expect(metadataChanged?.$synced).toBe(false);
    expect(metadataChanged?.$origin).toBe("client");
    expect(metadataChanged?.$updatedAt).toBe(123);

    store.upsertEntity("TestWidget", "w3", { name: "Updated" });
    const baseChanged = useGraphStore.getState().readEntitySnapshot("TestWidget", "w3");
    expect(baseChanged).not.toBe(metadataChanged);
    expect(baseChanged?.name).toBe("Updated");
  });
});
