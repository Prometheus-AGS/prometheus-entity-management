/**
 * Reference-stability tests for the array memoization inside
 * `useEntityListAsTable`. The React hook itself is exercised end-to-end in
 * example apps; here we keep a deterministic, framework-free check on the
 * stability rule (which is the whole point of the helper).
 */
import { describe, it, expect } from "vitest";

interface Row {
  id: string;
}

/**
 * Mirror of the stability rule inside the hook: return the previous array
 * when length + element identity match, otherwise return the new array.
 */
function stabilize(prev: Row[] | null, next: Row[]): Row[] {
  if (prev && prev.length === next.length) {
    let same = true;
    for (let i = 0; i < prev.length; i++) {
      if (prev[i] !== next[i]) {
        same = false;
        break;
      }
    }
    if (same) return prev;
  }
  return next;
}

describe("useEntityListAsTable stability rule", () => {
  it("returns the previous array when contents are identical by reference", () => {
    const a: Row = { id: "a" };
    const b: Row = { id: "b" };
    const prev = [a, b];
    const next = [a, b];
    expect(stabilize(prev, next)).toBe(prev);
  });

  it("returns the new array when length changes", () => {
    const a: Row = { id: "a" };
    const prev = [a];
    const next = [a, { id: "b" }];
    expect(stabilize(prev, next)).toBe(next);
  });

  it("returns the new array when an element reference changes", () => {
    const prev = [{ id: "a" }];
    const next = [{ id: "a" }];
    expect(stabilize(prev, next)).toBe(next);
  });

  it("returns the new array on first render", () => {
    const next = [{ id: "a" }];
    expect(stabilize(null, next)).toBe(next);
  });
});
