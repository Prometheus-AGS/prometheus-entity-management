import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { useGraphStore } from "../graph";
import {
  registerMergeStrategy,
  setDefaultMergeStrategy,
  getMergeStrategy,
  hasMergeStrategy,
  lwwStrategy,
  createLoroMergeStrategy,
} from "./index";
import { __resetMergeStrategies } from "./registry";
import type { MergeStrategy } from "./types";

describe("merge strategy port", () => {
  beforeEach(() => {
    __resetMergeStrategies();
    const s = useGraphStore.getState();
    s.removeEntity("MWidget", "m1");
  });
  afterEach(() => __resetMergeStrategies());

  it("defaults to LWW: upsertEntity behaves exactly as a shallow merge", () => {
    const s = useGraphStore.getState();
    s.upsertEntity("MWidget", "m1", { id: "m1", a: 1, b: 2 });
    s.upsertEntity("MWidget", "m1", { b: 3, c: 4 });
    const row = useGraphStore.getState().readEntity<Record<string, unknown>>("MWidget", "m1");
    expect(row).toEqual({ id: "m1", a: 1, b: 3, c: 4 });
  });

  it("lwwStrategy returns a new object and never mutates inputs", () => {
    const prev = { a: 1 };
    const next = { b: 2 };
    const merged = lwwStrategy(prev, next, { type: "X", id: "1", origin: "server", updatedAt: null });
    expect(merged).toEqual({ a: 1, b: 2 });
    expect(prev).toEqual({ a: 1 });
    expect(next).toEqual({ b: 2 });
    expect(merged).not.toBe(prev);
  });

  it("a registered strategy is invoked by the graph for its type", () => {
    // A "max wins" strategy for a numeric `version` field.
    const maxVersion: MergeStrategy = (prev, next) => {
      const merged = prev ? { ...prev, ...next } : { ...next };
      const pv = Number(prev?.version ?? -Infinity);
      const nv = Number(next.version ?? -Infinity);
      merged.version = Math.max(pv, nv);
      return merged;
    };
    registerMergeStrategy("MWidget", maxVersion);

    const s = useGraphStore.getState();
    s.upsertEntity("MWidget", "m1", { id: "m1", version: 5 });
    s.upsertEntity("MWidget", "m1", { version: 2 }); // older — must NOT win
    const row = useGraphStore.getState().readEntity<Record<string, unknown>>("MWidget", "m1");
    expect(row?.version).toBe(5);
  });

  it("resolution order: per-type > global default > LWW", () => {
    expect(getMergeStrategy("Unregistered")).toBe(lwwStrategy);
    expect(hasMergeStrategy("Unregistered")).toBe(false);

    const def: MergeStrategy = (_p, n) => ({ ...n, tag: "default" });
    setDefaultMergeStrategy(def);
    expect(getMergeStrategy("Unregistered")).toBe(def);
    expect(hasMergeStrategy("Unregistered")).toBe(true);

    const perType: MergeStrategy = (_p, n) => ({ ...n, tag: "perType" });
    registerMergeStrategy("MWidget", perType);
    expect(getMergeStrategy("MWidget")).toBe(perType);
  });

  it("createLoroMergeStrategy resolves a strategy when loro-crdt is installed", async () => {
    // loro-crdt is now a devDependency (G2 parity proof), so this resolves.
    // The missing-peer guard's error path is exercised structurally; real
    // convergence is proven in loro-real.test.ts.
    const strategy = await createLoroMergeStrategy();
    expect(typeof strategy).toBe("function");
  });
});
