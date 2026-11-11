import { beforeEach, describe, expect, it, vi } from "vitest";
import { createGraphStore, type GraphStore } from "../graph";
import { __resetMergeStrategies } from "../merge/registry";
import {
  AGUI_STATE_ENTITY_TYPE,
  agUiListKey,
  applyAgUiDelta,
  applyAgUiSnapshot,
  readAgUiState,
  type AgUiStateMapping,
} from "./ag-ui-bridge";
import { applyJsonPatch, type JsonPatchOp } from "./json-patch";

const AGENDA: AgUiStateMapping = { entityType: "AgendaItem", pointer: "/agenda", kind: "collection", idField: "id" };
const COUNTERS: AgUiStateMapping = {
  entityType: "Counters", pointer: "/counters", kind: "single", constantId: "counters", write: "replace",
};
const MAPPINGS = [AGENDA, COUNTERS];

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

function orderedAgenda(store: GraphStore): Array<Record<string, unknown>> {
  const s = store.getState();
  return (s.lists[agUiListKey(AGENDA)]?.ids ?? []).map((id) => s.entities.AgendaItem[id]);
}

let store: GraphStore;
beforeEach(() => {
  __resetMergeStrategies();
  store = createGraphStore();
});

describe("AG-UI bridge — lossless state document", () => {
  it("keeps plain (unmapped) fields from a snapshot, including scalars", () => {
    applyAgUiSnapshot(
      { snapshot: { phase: "voting", round: 2, agenda: [{ id: "a", title: "A" }], counters: { seats: 6 } } },
      { mappings: MAPPINGS, store },
    );
    expect(readAgUiState(undefined, store)).toEqual({
      phase: "voting", round: 2, agenda: [{ id: "a", title: "A" }], counters: { seats: 6 },
    });
    expect(store.getState().entities.Counters.counters).toEqual({ seats: 6 });
  });

  it("applies scalar deltas to the stored document without a caller-supplied base", () => {
    applyAgUiSnapshot({ snapshot: { phase: "draft", agenda: [] } }, { mappings: MAPPINGS, store });
    applyAgUiDelta({ delta: [{ op: "replace", path: "/phase", value: "final" }] }, { mappings: MAPPINGS, store });
    expect(readAgUiState(undefined, store)?.phase).toBe("final");
  });

  it("supports a root pointer mapping", () => {
    const root: AgUiStateMapping = { entityType: "Session", pointer: "", kind: "single", constantId: "s" };
    applyAgUiSnapshot({ snapshot: { phase: "a", n: 1 } }, { mappings: [root], store });
    applyAgUiDelta({ delta: [{ op: "replace", path: "/n", value: 2 }] }, { mappings: [root], store });
    expect(store.getState().entities.Session.s).toEqual({ phase: "a", n: 2 });
  });

  it("separate stateIds keep separate documents", () => {
    applyAgUiSnapshot({ snapshot: { phase: "x" } }, { mappings: [], store, stateId: "agent-1" });
    applyAgUiSnapshot({ snapshot: { phase: "y" } }, { mappings: [], store, stateId: "agent-2" });
    expect(readAgUiState("agent-1", store)?.phase).toBe("x");
    expect(readAgUiState("agent-2", store)?.phase).toBe("y");
    expect(Object.keys(store.getState().entities[AGUI_STATE_ENTITY_TYPE])).toEqual(["agent-1", "agent-2"]);
  });
});

describe("AG-UI bridge — order and removals (RFC 6902)", () => {
  const start = { agenda: [{ id: "a" }, { id: "b" }, { id: "c" }], counters: { seats: 6 } };

  it("records collection order as an ordered list", () => {
    applyAgUiSnapshot({ snapshot: start }, { mappings: MAPPINGS, store });
    expect(store.getState().lists[agUiListKey(AGENDA)].ids).toEqual(["a", "b", "c"]);
  });

  it("move reorders the list", () => {
    applyAgUiSnapshot({ snapshot: start }, { mappings: MAPPINGS, store });
    applyAgUiDelta({ delta: [{ op: "move", from: "/agenda/2", path: "/agenda/0" }] }, { mappings: MAPPINGS, store });
    expect(store.getState().lists[agUiListKey(AGENDA)].ids).toEqual(["c", "a", "b"]);
  });

  it("remove deletes the entity and its list membership", () => {
    applyAgUiSnapshot({ snapshot: start }, { mappings: MAPPINGS, store });
    store.getState().setListResult("user-list", ["a", "b"], {});
    applyAgUiDelta({ delta: [{ op: "remove", path: "/agenda/1" }] }, { mappings: MAPPINGS, store });
    const s = store.getState();
    expect(s.entities.AgendaItem.b).toBeUndefined();
    expect(s.lists[agUiListKey(AGENDA)].ids).toEqual(["a", "c"]);
    expect(s.lists["user-list"].ids).toEqual(["a"]);
  });

  it("replace of an array element swaps the entity in place", () => {
    applyAgUiSnapshot({ snapshot: start }, { mappings: MAPPINGS, store });
    applyAgUiDelta({ delta: [{ op: "replace", path: "/agenda/1", value: { id: "z", t: 1 } }] }, { mappings: MAPPINGS, store });
    const s = store.getState();
    expect(s.lists[agUiListKey(AGENDA)].ids).toEqual(["a", "z", "c"]);
    expect(s.entities.AgendaItem.b).toBeUndefined();
    expect(s.entities.AgendaItem.z).toEqual({ id: "z", t: 1 });
  });

  it("a snapshot that drops items removes them; a removed single slice removes its entity", () => {
    applyAgUiSnapshot({ snapshot: start }, { mappings: MAPPINGS, store });
    applyAgUiSnapshot({ snapshot: { agenda: [{ id: "c" }] } }, { mappings: MAPPINGS, store });
    const s = store.getState();
    expect(Object.keys(s.entities.AgendaItem)).toEqual(["c"]);
    expect(s.entities.Counters.counters).toBeUndefined();
  });

  it("never removes entities the bridge did not see in the previous state", () => {
    store.getState().upsertEntity("AgendaItem", "manual", { id: "manual" });
    applyAgUiSnapshot({ snapshot: start }, { mappings: MAPPINGS, store });
    applyAgUiSnapshot({ snapshot: { agenda: [] } }, { mappings: MAPPINGS, store });
    expect(Object.keys(store.getState().entities.AgendaItem)).toEqual(["manual"]);
  });

  it("uses the caller's currentState as the base when supplied", () => {
    applyAgUiDelta(
      { delta: [{ op: "remove", path: "/agenda/0" }] },
      { mappings: MAPPINGS, store },
      { agenda: [{ id: "a" }, { id: "b" }] },
    );
    expect(store.getState().lists[agUiListKey(AGENDA)].ids).toEqual(["b"]);
  });

  it("publishes each snapshot or delta as one graph notification", () => {
    const listener = vi.fn();
    store.subscribe(listener);
    applyAgUiSnapshot({ snapshot: start }, { mappings: MAPPINGS, store });
    applyAgUiDelta({ delta: [{ op: "remove", path: "/agenda/0" }, { op: "add", path: "/agenda/-", value: { id: "d" } }] }, { mappings: MAPPINGS, store });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("graph order and membership always equal the document (seeded randomized patches)", () => {
    for (let run = 0; run < 30; run++) {
      const random = mulberry32(1000 + run);
      const local = createGraphStore();
      let doc: { agenda: Array<{ id: string; v: number }>; phase: string } = { agenda: [], phase: "p0" };
      applyAgUiSnapshot({ snapshot: doc }, { mappings: [AGENDA], store: local });
      let next = 0;
      for (let step = 0; step < 30; step++) {
        const len = doc.agenda.length;
        const roll = random();
        let op: JsonPatchOp;
        if (len === 0 || roll < 0.35) {
          const at = len === 0 || random() < 0.5 ? "-" : String(Math.floor(random() * len));
          op = { op: "add", path: `/agenda/${at}`, value: { id: `i${next++}`, v: step } };
        } else if (roll < 0.55) {
          op = { op: "remove", path: `/agenda/${Math.floor(random() * len)}` };
        } else if (roll < 0.75) {
          op = { op: "move", from: `/agenda/${Math.floor(random() * len)}`, path: `/agenda/${Math.floor(random() * len)}` };
        } else if (roll < 0.9) {
          op = { op: "replace", path: `/agenda/${Math.floor(random() * len)}/v`, value: -step };
        } else {
          op = { op: "replace", path: "/phase", value: `p${step}` };
        }
        doc = applyJsonPatch(doc, [op]);
        applyAgUiDelta({ delta: [op] }, { mappings: [AGENDA], store: local });
        expect(orderedAgenda(local)).toEqual(doc.agenda);
        expect(Object.keys(local.getState().entities.AgendaItem ?? {}).sort()).toEqual(doc.agenda.map((i) => i.id).sort());
        expect(readAgUiState(undefined, local)).toEqual(doc);
      }
    }
  });
});

describe("AG-UI bridge — review regressions", () => {
  it("an item moving between two slices of the same entity type survives", () => {
    const todo: AgUiStateMapping = { entityType: "Task", pointer: "/todo", kind: "collection" };
    const done: AgUiStateMapping = { entityType: "Task", pointer: "/done", kind: "collection" };
    const mappings = [done, todo];
    applyAgUiSnapshot({ snapshot: { todo: [{ id: "1" }], done: [] } }, { mappings, store });
    applyAgUiDelta({ delta: [{ op: "move", from: "/todo/0", path: "/done/-" }] }, { mappings, store });
    const s = store.getState();
    expect(s.entities.Task["1"]).toEqual({ id: "1" });
    expect(s.lists[agUiListKey(done)].ids).toEqual(["1"]);
    expect(s.lists[agUiListKey(todo)].ids).toEqual([]);
  });

  it("legacy reconstruction (no stored document) handles nested mappings and removes nothing", () => {
    const order: AgUiStateMapping = { entityType: "Order", pointer: "/order", kind: "single", constantId: "o1" };
    const items: AgUiStateMapping = { entityType: "Item", pointer: "/order/items", kind: "collection" };
    store.getState().upsertEntity("Order", "o1", { id: "o1", status: "open" });
    store.getState().upsertEntity("Item", "i1", { id: "i1", qty: 1 });
    store.getState().upsertEntity("Item", "unrelated", { id: "unrelated" });
    applyAgUiDelta({ delta: [{ op: "replace", path: "/order/status", value: "paid" }, { op: "remove", path: "/order/items/1" }] }, { mappings: [order, items], store });
    const s = store.getState();
    expect(s.entities.Order.o1.status).toBe("paid");
    expect(s.entities.Item.unrelated).toEqual({ id: "unrelated" });
  });
});

describe("AG-UI bridge — caller objects stay mutable (no immer freeze leak)", () => {
  it("does not freeze the snapshot object the caller handed in", () => {
    const counters = { seats: 6 };
    const snapshot = { counters, agenda: [{ id: "a", meta: { n: 1 } }] };
    applyAgUiSnapshot({ snapshot }, { mappings: MAPPINGS, store });
    expect(Object.isFrozen(counters)).toBe(false);
    expect(Object.isFrozen(snapshot.agenda[0].meta)).toBe(false);
    counters.seats = 7; // A2UI-style in-place mutation must keep working
    expect(store.getState().entities.Counters.counters).toEqual({ seats: 6 });
  });

  it("does not freeze delta op values or the caller's currentState", () => {
    const value = { id: "x", nested: { k: 1 } };
    const current = { agenda: [{ id: "a" }] };
    applyAgUiDelta({ delta: [{ op: "add", path: "/agenda/-", value }] }, { mappings: MAPPINGS, store }, current);
    expect(Object.isFrozen(value)).toBe(false);
    expect(Object.isFrozen(value.nested)).toBe(false);
    expect(Object.isFrozen(current.agenda[0])).toBe(false);
  });
});

describe("AG-UI bridge — idempotent re-application", () => {
  it("a delta re-delivered with the same eventId is applied once", () => {
    applyAgUiSnapshot({ snapshot: { agenda: [] } }, { mappings: MAPPINGS, store, eventId: "1" });
    const delta = { delta: [{ op: "add" as const, path: "/agenda/-", value: { id: "a" } }] };
    expect(applyAgUiDelta(delta, { mappings: MAPPINGS, store, eventId: "2" }).applied).toBe(true);
    expect(applyAgUiDelta(delta, { mappings: MAPPINGS, store, eventId: "2" }).applied).toBe(false);
    expect(readAgUiState(undefined, store)).toEqual({ agenda: [{ id: "a" }] });
    expect(store.getState().lists[agUiListKey(AGENDA)].ids).toEqual(["a"]);
  });

  it("re-applying an identical snapshot leaves the graph equal", () => {
    const snapshot = { phase: "x", agenda: [{ id: "a" }, { id: "b" }], counters: { seats: 1 } };
    applyAgUiSnapshot({ snapshot }, { mappings: MAPPINGS, store });
    const first = { entities: store.getState().entities, lists: store.getState().lists };
    applyAgUiSnapshot({ snapshot }, { mappings: MAPPINGS, store });
    expect({ entities: store.getState().entities, lists: store.getState().lists }).toEqual(first);
  });
});
