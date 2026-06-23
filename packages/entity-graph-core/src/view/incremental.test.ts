/**
 * incremental.test.ts — G3 parity proof: incremental view maintenance.
 *
 * Two things must hold:
 *  1. Correctness parity — incremental result == full applyView result.
 *  2. Sub-linear single-row update — applyChange touches O(log n) entities,
 *     not O(n), at 100k rows (the TanStack-DB-class property).
 */
import { describe, it, expect } from "vitest";
import { applyView } from "./evaluator";
import { IncrementalView } from "./incremental";
import type { FilterSpec, SortSpec } from "./types";

const filter: FilterSpec = [{ field: "status", op: "eq", value: "open" }];
const sort: SortSpec = [{ field: "n", direction: "asc" }];

function dataset(n: number) {
  const map = new Map<string, Record<string, unknown>>();
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `e${i}`;
    ids.push(id);
    map.set(id, { id, status: i % 3 === 0 ? "open" : "closed", n: (i * 7919) % n });
  }
  return { ids, map, get: (id: string) => map.get(id) ?? null };
}

describe("G3: incremental view maintenance", () => {
  it("seed result is byte-identical to applyView", () => {
    const { ids, get } = dataset(1000);
    const view = new IncrementalView({ filter, sort, getEntity: get });
    view.seed(ids);
    expect(view.result()).toEqual(applyView(ids, get, filter, sort));
  });

  it("applyChange keeps parity with full re-derivation after a field edit", () => {
    const { ids, map, get } = dataset(2000);
    const view = new IncrementalView({ filter, sort, getEntity: get });
    view.seed(ids);

    // Edit one entity's sort key.
    map.set("e9", { ...(map.get("e9") as object), n: -1 } as Record<string, unknown>);
    view.applyChange("e9");

    expect(view.result()).toEqual(applyView(ids, get, filter, sort));
  });

  it("applyChange handles enter/leave membership in parity", () => {
    const { ids, map, get } = dataset(1000);
    const view = new IncrementalView({ filter, sort, getEntity: get });
    view.seed(ids);

    // e1 was "closed" → make it "open" (enters the view).
    map.set("e1", { ...(map.get("e1") as object), status: "open" } as Record<string, unknown>);
    view.applyChange("e1");
    expect(view.result()).toEqual(applyView(ids, get, filter, sort));

    // e0 was "open" → make it "closed" (leaves the view).
    map.set("e0", { ...(map.get("e0") as object), status: "closed" } as Record<string, unknown>);
    view.applyChange("e0");
    expect(view.result()).toEqual(applyView(ids, get, filter, sort));
  });

  it("single-row update is SUB-LINEAR at 100k rows (O(log n) entity reads)", () => {
    const N = 100_000;
    const { ids, map, get } = dataset(N);

    // Count entity reads as a proxy for work done.
    let reads = 0;
    const countingGet = (id: string) => { reads++; return get(id); };

    const view = new IncrementalView({ filter, sort, getEntity: countingGet });
    view.seed(ids);            // O(n log n) one-time — not measured
    reads = 0;                 // reset; measure only the incremental update

    // Change one entity's sort key and update incrementally.
    map.set("e123", { ...(map.get("e123") as object), n: 7 } as Record<string, unknown>);
    view.applyChange("e123");

    // Full re-derivation would read ~N entities (>=100k). Incremental does a
    // binary search (~2*log2(memberCount) reads) plus a couple lookups.
    // Assert we stayed WELL under linear — a generous sub-linear ceiling.
    expect(reads).toBeLessThan(200); // ~2*log2(33k) ≈ 30; 200 is a safe ceiling
    expect(reads).toBeGreaterThan(0);
  });

  it("incremental 100k update matches full applyView result", () => {
    const N = 100_000;
    const { ids, map, get } = dataset(N);
    const view = new IncrementalView({ filter, sort, getEntity: get });
    view.seed(ids);

    map.set("e500", { ...(map.get("e500") as object), n: 1 } as Record<string, unknown>);
    view.applyChange("e500");

    expect(view.result()).toEqual(applyView(ids, get, filter, sort));
  });
});
