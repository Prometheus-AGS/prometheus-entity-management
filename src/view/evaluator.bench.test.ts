/**
 * evaluator.bench.test.ts — Scale benchmark for the local view evaluator (C7 spike).
 *
 * This is the runnable evidence behind the C7 DECISION (see
 * docs/incremental-query-ceiling.md): rather than adopt the pre-production
 * differential-dataflow engine d2ts (0.1.x) for v2.0, we measure the current
 * full re-derivation (`applyView`) at realistic sizes and document a scale
 * ceiling + virtualization guidance.
 *
 * It is a correctness+timing test, not a microbenchmark harness: it asserts the
 * evaluator stays within a generous wall-clock budget at 1k and 10k rows so a
 * future regression (or a decision to revisit d2ts) has a baseline.
 */
import { describe, it, expect } from "vitest";
import { applyView } from "./evaluator";
import type { FilterSpec, SortSpec } from "./types";

function makeRows(n: number): { ids: string[]; get: (id: string) => Record<string, unknown> | null } {
  const map = new Map<string, Record<string, unknown>>();
  const ids: string[] = [];
  for (let i = 0; i < n; i++) {
    const id = `e${i}`;
    ids.push(id);
    map.set(id, { id, status: i % 3 === 0 ? "open" : "closed", n: (i * 7919) % n, name: `Item ${i}` });
  }
  return { ids, get: (id) => map.get(id) ?? null };
}

const filter: FilterSpec = [{ field: "status", op: "eq", value: "open" }];
const sort: SortSpec = [{ field: "n", direction: "asc" }];

describe("view evaluator scale (C7 baseline)", () => {
  it("filters + sorts 1k rows correctly and quickly", () => {
    const { ids, get } = makeRows(1000);
    const t0 = performance.now();
    const out = applyView(ids, get, filter, sort);
    const ms = performance.now() - t0;
    expect(out.length).toBe(Math.ceil(1000 / 3)); // every 3rd row is "open"
    // Generous CI-safe budget; documents the ceiling, not a hard SLA.
    expect(ms).toBeLessThan(50);
  });

  it("filters + sorts 10k rows within the documented ceiling", () => {
    const { ids, get } = makeRows(10000);
    const t0 = performance.now();
    const out = applyView(ids, get, filter, sort);
    const ms = performance.now() - t0;
    expect(out.length).toBe(Math.ceil(10000 / 3));
    expect(ms).toBeLessThan(250);
  });

  it("produces a stable sort order (deterministic)", () => {
    const { ids, get } = makeRows(500);
    const a = applyView(ids, get, filter, sort);
    const b = applyView(ids, get, filter, sort);
    expect(a).toEqual(b);
  });
});
