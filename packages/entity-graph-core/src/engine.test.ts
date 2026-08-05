import { afterEach, describe, it, expect, vi } from "vitest";
import { createGraphStore } from "./graph";
import {
  configureEngine,
  attachGlobalListeners,
  dedupe,
  startGarbageCollector,
} from "./engine";

afterEach(() => {
  vi.unstubAllGlobals();
  configureEngine({});
  vi.useRealTimers();
});

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

  it("does not dedupe equal keys across request-owned stores", async () => {
    const requestA = createGraphStore();
    const requestB = createGraphStore();
    let calls = 0;

    const [a, b] = await Promise.all([
      dedupe("Task:t1", async () => ++calls, requestA),
      dedupe("Task:t1", async () => ++calls, requestB),
    ]);

    expect([a, b]).toEqual([1, 2]);
    expect(calls).toBe(2);
  });

  it("garbage-collects the selected graph without touching sibling graphs", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2030-01-15T12:00:00.000Z"));
    configureEngine({ defaultGcTime: 100, gcInterval: 10 });

    const selected = createGraphStore();
    const sibling = createGraphStore();
    for (const store of [selected, sibling]) {
      store.getState().upsertEntity("Task", "task-gc", { id: "task-gc" });
      store.getState().setEntityFetched("Task", "task-gc");
    }

    vi.setSystemTime(new Date("2030-01-15T12:00:01.000Z"));
    vi.stubGlobal("window", {});
    const stop = startGarbageCollector(selected);

    vi.advanceTimersByTime(10);

    expect(selected.getState().entities.Task?.["task-gc"]).toBeUndefined();
    expect(sibling.getState().entities.Task?.["task-gc"]).toEqual({ id: "task-gc" });

    stop();
  });

  it("removes selected graph listeners and GC after the final owner releases them", () => {
    vi.useFakeTimers();
    configureEngine({ gcInterval: 10 });
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    vi.stubGlobal("window", { addEventListener, removeEventListener });
    vi.stubGlobal("document", { visibilityState: "visible" });
    const selected = createGraphStore();

    const releaseFirst = attachGlobalListeners(selected);
    const releaseSecond = attachGlobalListeners(selected);

    expect(addEventListener).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(1);

    releaseFirst();
    expect(removeEventListener).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(1);

    releaseSecond();
    expect(removeEventListener).toHaveBeenCalledTimes(3);
    expect(vi.getTimerCount()).toBe(0);

    releaseSecond();
    expect(removeEventListener).toHaveBeenCalledTimes(3);
  });
});
