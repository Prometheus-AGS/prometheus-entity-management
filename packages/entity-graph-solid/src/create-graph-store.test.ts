/**
 * Tests for createGraphStore — verifies the generic graph selector bridge.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("solid-js", () => {
  const cleanups: Array<() => void> = [];
  return {
    createSignal: vi.fn(<T>(init: T) => {
      let val = init;
      const get = () => val;
      const set = (next: T | ((prev: T) => T)) => {
        val = typeof next === "function" ? (next as (p: T) => T)(val) : next;
      };
      return [get, set];
    }),
    onCleanup: vi.fn((fn: () => void) => cleanups.push(fn)),
  };
});

import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import { createGraphStore } from "./create-graph-store";

beforeEach(() => {
  const s = useGraphStore.getState();
  for (const type of Object.keys(s.entities)) {
    for (const id of Object.keys(s.entities[type])) {
      s.removeEntity(type, id);
    }
  }
});

describe("createGraphStore", () => {
  it("returns a function (SolidJS accessor)", () => {
    const accessor = createGraphStore((s) => Object.keys(s.entities).length);
    expect(typeof accessor).toBe("function");
  });

  it("reflects initial graph state", () => {
    useGraphStore.getState().upsertEntity("Project", "proj-1", { id: "proj-1" });

    const projectCount = createGraphStore(
      (s) => Object.keys(s.entities["Project"] ?? {}).length,
    );

    // In our mock, the signal is initialized with the selector result at construction time.
    expect(projectCount()).toBe(1);
  });

  it("accepts a custom equality function", () => {
    const eqFn = vi.fn((a: number, b: number) => a === b);
    const accessor = createGraphStore(
      (s) => Object.keys(s.entities).length,
      eqFn,
    );
    expect(typeof accessor).toBe("function");
  });
});
