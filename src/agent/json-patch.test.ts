import { describe, it, expect } from "vitest";
import { applyJsonPatch } from "./json-patch";

describe("applyJsonPatch (RFC-6902)", () => {
  it("add inserts a new key", () => {
    expect(applyJsonPatch({ a: 1 }, [{ op: "add", path: "/b", value: 2 }])).toEqual({ a: 1, b: 2 });
  });

  it("replace overwrites an existing value", () => {
    expect(applyJsonPatch({ a: 1 }, [{ op: "replace", path: "/a", value: 9 }])).toEqual({ a: 9 });
  });

  it("remove deletes a key", () => {
    expect(applyJsonPatch({ a: 1, b: 2 }, [{ op: "remove", path: "/a" }])).toEqual({ b: 2 });
  });

  it("nested paths and array append with '-'", () => {
    const doc = { items: [1, 2] };
    expect(applyJsonPatch(doc, [{ op: "add", path: "/items/-", value: 3 }])).toEqual({ items: [1, 2, 3] });
  });

  it("move relocates a value", () => {
    expect(applyJsonPatch({ a: { x: 1 }, b: {} }, [{ op: "move", from: "/a/x", path: "/b/y" }]))
      .toEqual({ a: {}, b: { y: 1 } });
  });

  it("copy duplicates a value", () => {
    expect(applyJsonPatch({ a: 1 }, [{ op: "copy", from: "/a", path: "/b" }])).toEqual({ a: 1, b: 1 });
  });

  it("test passes silently and fails loudly", () => {
    expect(applyJsonPatch({ a: 1 }, [{ op: "test", path: "/a", value: 1 }])).toEqual({ a: 1 });
    expect(() => applyJsonPatch({ a: 1 }, [{ op: "test", path: "/a", value: 2 }])).toThrow(/test failed/);
  });

  it("does not mutate the input document", () => {
    const doc = { a: 1 };
    applyJsonPatch(doc, [{ op: "add", path: "/b", value: 2 }]);
    expect(doc).toEqual({ a: 1 });
  });

  it("decodes ~1 and ~0 pointer escapes", () => {
    expect(applyJsonPatch({}, [{ op: "add", path: "/a~1b", value: 1 }])).toEqual({ "a/b": 1 });
  });
});
