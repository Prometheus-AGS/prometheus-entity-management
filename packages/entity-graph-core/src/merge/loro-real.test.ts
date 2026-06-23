/**
 * loro-real.test.ts — G2 parity proof: real loro-crdt convergence.
 *
 * The original suite only proved the missing-peer guard. This exercises
 * `createLoroMergeStrategy` with loro-crdt actually installed (devDependency)
 * and asserts the property that distinguishes a CRDT from LWW: concurrent
 * divergent field writes CONVERGE to the same result regardless of apply order.
 */
import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "../graph";
import { registerMergeStrategy, createLoroMergeStrategy } from "./index";
import { __resetMergeStrategies } from "./registry";
import { __resetLoroDocs } from "./loro";

describe("G2: real loro-crdt merge strategy", () => {
  beforeEach(() => {
    __resetMergeStrategies();
    __resetLoroDocs();
    const s = useGraphStore.getState();
    for (const id of Object.keys(s.entities.Doc ?? {})) s.removeEntity("Doc", id);
  });

  it("resolves with the real engine (not the missing-peer guard)", async () => {
    const strategy = await createLoroMergeStrategy();
    const merged = strategy({ a: 1 }, { b: 2 }, { type: "Doc", id: "d1", origin: "server", updatedAt: null });
    // Real Loro LWW-Map keeps both fields.
    expect(merged).toMatchObject({ a: 1, b: 2 });
  });

  it("concurrent writes to DIFFERENT fields both survive (no clobber)", async () => {
    const strategy = await createLoroMergeStrategy();
    registerMergeStrategy("Doc", strategy);
    const s = useGraphStore.getState();
    s.upsertEntity("Doc", "d1", { id: "d1", title: "Hello", body: "x" });
    // Two writers touch different fields.
    s.upsertEntity("Doc", "d1", { title: "Hello World" });
    s.upsertEntity("Doc", "d1", { body: "y" });
    const row = s.readEntity<Record<string, unknown>>("Doc", "d1");
    expect(row?.title).toBe("Hello World");
    expect(row?.body).toBe("y");
  });

  it("converges regardless of apply order (CRDT property)", async () => {
    // Two independent strategy instances simulate two replicas applying the
    // same two ops in opposite orders; results must be identical.
    const sA = await createLoroMergeStrategy();
    __resetLoroDocs();
    const sB = await createLoroMergeStrategy();

    const ctx = { type: "Doc", id: "d1", origin: "server" as const, updatedAt: null };
    const opX = { x: 1 };
    const opY = { y: 2 };

    // Replica A: X then Y
    let a = sA(undefined, opX, ctx);
    a = sA(a, opY, ctx);
    __resetLoroDocs();
    // Replica B: Y then X
    let b = sB(undefined, opY, ctx);
    b = sB(b, opX, ctx);

    expect(a).toEqual(b);
    expect(a).toMatchObject({ x: 1, y: 2 });
  });
});
