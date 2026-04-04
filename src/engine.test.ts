import { describe, it, expect } from "vitest";
import { dedupe } from "./engine";

describe("engine dedupe", () => {
  it("returns the same promise for concurrent identical keys", async () => {
    let calls = 0;
    const p1 = dedupe("k1", async () => {
      calls += 1;
      return 42;
    });
    const p2 = dedupe("k1", async () => {
      calls += 1;
      return 99;
    });
    const [a, b] = await Promise.all([p1, p2]);
    expect(a).toBe(42);
    expect(b).toBe(42);
    expect(calls).toBe(1);
  });

  it("runs separately for different keys", async () => {
    let calls = 0;
    const run = (key: string) =>
      dedupe(key, async () => {
        calls += 1;
        return key;
      });
    const [a, b] = await Promise.all([run("a"), run("b")]);
    expect(a).toBe("a");
    expect(b).toBe("b");
    expect(calls).toBe(2);
  });
});
