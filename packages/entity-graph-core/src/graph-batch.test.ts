import { afterEach, describe, expect, it, vi } from "vitest";
import { createGraphStore, type GraphStore } from "./graph";
import { createGraphTransaction } from "./graph-actions";
import { applyGraphChanges, batchGraphWrites, type GraphChange } from "./graph-batch";

/** Deterministic PRNG so the randomized equivalence check is reproducible. */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dataOf(store: GraphStore) {
  const { entities, patches, lists, syncMetadata } = store.getState();
  return { entities, patches, lists, syncMetadata };
}

function seed(store: GraphStore, count: number) {
  store.getState().upsertEntities(
    "Row",
    Array.from({ length: count }, (_, i) => ({ id: `r${i}`, data: { id: `r${i}`, n: i } })),
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("batchGraphWrites", () => {
  it("applies writes across several entity types with exactly one notification", () => {
    const store = createGraphStore();
    const listener = vi.fn();
    store.subscribe(listener);

    batchGraphWrites((batch) => {
      batch.upsertEntity("Message", "m1", { id: "m1", text: "hi" });
      batch.upsertEntities("ToolCall", [{ id: "t1", data: { id: "t1" } }, { id: "t2", data: { id: "t2" } }]);
      batch.replaceEntity("Thread", "th", { id: "th", order: ["m1"] });
      batch.patchEntity("Message", "m1", { selected: true });
      batch.insertIdInList("thread:messages", "m1", "end");
      batch.setEntitySyncMetadata("Message", "m1", { synced: false, origin: "optimistic" });
    }, store);

    expect(listener).toHaveBeenCalledTimes(1);
    const s = store.getState();
    expect(s.readEntity("Message", "m1")).toEqual({ id: "m1", text: "hi", selected: true });
    expect(Object.keys(s.entities.ToolCall)).toEqual(["t1", "t2"]);
    expect(s.entities.Thread.th).toEqual({ id: "th", order: ["m1"] });
    expect(s.lists["thread:messages"].ids).toEqual(["m1"]);
    expect(s.syncMetadata["Message:m1"].synced).toBe(false);
  });

  it("is atomic: a throw inside the batch leaves the graph untouched and notifies nobody", () => {
    const store = createGraphStore();
    seed(store, 3);
    const before = dataOf(store);
    const listener = vi.fn();
    store.subscribe(listener);

    expect(() =>
      batchGraphWrites((batch) => {
        batch.upsertEntity("Row", "r0", { n: 100 });
        batch.removeEntity("Row", "r1");
        throw new Error("abort");
      }, store),
    ).toThrow("abort");

    expect(listener).not.toHaveBeenCalled();
    expect(dataOf(store)).toEqual(before);
    expect(store.getState().entities).toBe(before.entities);
  });

  it("reads inside the batch see earlier writes of the same batch", () => {
    const store = createGraphStore();
    const seen = batchGraphWrites((batch) => {
      batch.upsertEntity("Message", "m1", { text: "a" });
      batch.patchEntity("Message", "m1", { draft: true });
      return batch.readEntity<{ text: string; draft: boolean }>("Message", "m1");
    }, store);
    expect(seen).toEqual({ text: "a", draft: true });
  });

  it("flattens a nested batch on the same store into the outer publication", () => {
    const store = createGraphStore();
    const listener = vi.fn();
    store.subscribe(listener);
    batchGraphWrites((outer) => {
      outer.upsertEntity("A", "1", { v: 1 });
      batchGraphWrites((inner) => inner.upsertEntity("B", "1", { v: 2 }), store);
      outer.upsertEntity("C", "1", { v: 3 });
    }, store);
    expect(listener).toHaveBeenCalledTimes(1);
    const { entities } = store.getState();
    expect([entities.A["1"], entities.B["1"], entities.C["1"]]).toEqual([{ v: 1 }, { v: 2 }, { v: 3 }]);
  });

  it("structurally shares untouched entity types (no whole-graph copy)", () => {
    const store = createGraphStore();
    seed(store, 1000);
    const rowsBefore = store.getState().entities.Row;
    const cloneSpy = vi.spyOn(globalThis, "structuredClone");
    batchGraphWrites((batch) => batch.upsertEntity("Message", "m1", { text: "x" }), store);
    expect(cloneSpy).not.toHaveBeenCalled();
    expect(store.getState().entities.Row).toBe(rowsBefore);
  });

  it("matches the result of the equivalent sequential store actions (seeded randomized)", () => {
    for (let run = 0; run < 25; run++) {
      const random = mulberry32(run + 1);
      const changes: GraphChange[] = [];
      for (let i = 0; i < 40; i++) {
        const id = `e${Math.floor(random() * 6)}`;
        const roll = random();
        if (roll < 0.3) changes.push({ op: "upsert", type: "T", id, data: { v: i, [`k${i % 3}`]: i } });
        else if (roll < 0.4) changes.push({ op: "replace", type: "T", id, data: { v: -i } });
        else if (roll < 0.5) changes.push({ op: "remove", type: "T", id });
        else if (roll < 0.65) changes.push({ op: "patch", type: "T", id, patch: { p: i } });
        else if (roll < 0.7) changes.push({ op: "unpatch", type: "T", id, keys: ["p"] });
        else if (roll < 0.75) changes.push({ op: "clearPatch", type: "T", id });
        else if (roll < 0.9) changes.push({ op: "insertId", key: "L", id, position: random() < 0.5 ? "start" : "end" });
        else changes.push({ op: "removeIdFromAllLists", type: "T", id });
      }

      const sequential = createGraphStore();
      const api = sequential.getState();
      for (const c of changes) {
        if (c.op === "upsert") api.upsertEntity(c.type, c.id, c.data);
        else if (c.op === "replace") api.replaceEntity(c.type, c.id, c.data);
        else if (c.op === "remove") api.removeEntity(c.type, c.id);
        else if (c.op === "patch") api.patchEntity(c.type, c.id, c.patch);
        else if (c.op === "unpatch") api.unpatchEntity(c.type, c.id, c.keys);
        else if (c.op === "clearPatch") api.clearPatch(c.type, c.id);
        else if (c.op === "insertId") api.insertIdInList(c.key, c.id, c.position);
        else if (c.op === "removeIdFromAllLists") api.removeIdFromAllLists(c.type, c.id);
      }

      const batched = createGraphStore();
      applyGraphChanges(changes, batched);
      expect(dataOf(batched)).toEqual(dataOf(sequential));
    }
  });
});

describe("batchGraphWrites misuse fails loudly instead of losing writes", () => {
  it("a store write made around the handle aborts the batch", () => {
    const store = createGraphStore();
    expect(() =>
      batchGraphWrites((batch) => {
        store.getState().upsertEntity("A", "1", { v: 1 });
        batch.upsertEntity("A", "2", { v: 2 });
      }, store),
    ).toThrow(/outside the batch handle/);
    expect(store.getState().entities.A).toEqual({ "1": { v: 1 } });
  });

  it("an async callback is rejected and writes nothing", () => {
    const store = createGraphStore();
    expect(() =>
      batchGraphWrites(async (batch) => {
        batch.upsertEntity("A", "1", { v: 1 });
      }, store),
    ).toThrow(/synchronous/);
    expect(store.getState().entities.A).toBeUndefined();
  });
});

describe("applyGraphChanges", () => {
  it("re-applying the same change set is idempotent for the default merge strategy", () => {
    const store = createGraphStore();
    const changes: GraphChange[] = [
      { op: "upsert", type: "Interrupt", id: "i1", data: { id: "i1", status: "pending" } },
      { op: "insertId", key: "thread:interrupts", id: "i1", position: "end" },
      { op: "patch", type: "Interrupt", id: "i1", patch: { focused: true } },
      { op: "remove", type: "Interrupt", id: "gone" },
      { op: "setListIds", key: "thread:order", ids: ["m1", "m2"], entityType: "Message" },
    ];
    applyGraphChanges(changes, store);
    const first = dataOf(store);
    applyGraphChanges(changes, store);
    expect(dataOf(store)).toEqual(first);
  });

  it("setListIds keeps list metadata and dedupes ids in order", () => {
    const store = createGraphStore();
    store.getState().setListResult("k", ["x"], { total: 7 });
    applyGraphChanges([{ op: "setListIds", key: "k", ids: ["b", "a", "b"], entityType: "T" }], store);
    const list = store.getState().lists.k;
    expect(list.ids).toEqual(["b", "a"]);
    expect(list.total).toBe(7);
    expect(list.entityType).toBe("T");
  });
});

describe("createGraphTransaction without a whole-graph copy", () => {
  it("opening a transaction does not clone the graph", () => {
    const store = createGraphStore();
    seed(store, 1000);
    const cloneSpy = vi.spyOn(globalThis, "structuredClone");
    const tx = createGraphTransaction(store);
    tx.upsertEntity("Row", "r1", { n: -1 });
    tx.commit();
    expect(cloneSpy).not.toHaveBeenCalled();
  });

  it("rollback still restores the exact pre-transaction graph", () => {
    const store = createGraphStore();
    seed(store, 5);
    store.getState().setListResult("rows", ["r0", "r1"], {});
    const before = dataOf(store);

    const tx = createGraphTransaction(store);
    tx.upsertEntity("Row", "r0", { n: 99 })
      .removeEntity("Row", "r4")
      .patchEntity("Row", "r1", { selected: true })
      .insertIdInList("rows", "r9", "start")
      .markEntityPending("Row", "r2");
    tx.rollback();

    expect(dataOf(store)).toEqual(before);
    expect(store.getState().entities).toBe(before.entities);
  });

  it("snapshot() still returns a caller-owned deep copy", () => {
    const store = createGraphStore();
    seed(store, 1);
    const tx = createGraphTransaction(store);
    const snap = tx.snapshot();
    (snap.entities.Row.r0 as { n: number }).n = 42;
    expect(store.getState().entities.Row.r0).toEqual({ id: "r0", n: 0 });
  });
});
