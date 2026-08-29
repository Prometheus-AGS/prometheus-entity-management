import { describe, expect, it, afterEach, vi } from "vitest";
import { createGraphStore, graphStore } from "./graph";
import {
  prepareGraphStoreScope,
  setActiveGraphStore,
  runWithGraphStore,
  resolveActiveGraphStore,
  __resetActiveGraphStore,
} from "./active-store";

afterEach(() => __resetActiveGraphStore());

describe("active graph resolution", () => {
  it("falls back to the supplied singleton when nothing is active", () => {
    expect(resolveActiveGraphStore(graphStore)).toBe(graphStore);
  });

  it("prefers the module-level active store once set", () => {
    const scoped = createGraphStore();
    setActiveGraphStore(scoped);
    expect(resolveActiveGraphStore(graphStore)).toBe(scoped);
  });

  it("restores the previous store, so nested scopes do not strand state", () => {
    const outer = createGraphStore();
    const inner = createGraphStore();
    setActiveGraphStore(outer);
    const restoreInner = setActiveGraphStore(inner);
    expect(resolveActiveGraphStore(graphStore)).toBe(inner);
    restoreInner();
    expect(resolveActiveGraphStore(graphStore)).toBe(outer);
  });

  it("runWithGraphStore scopes resolution to the callback", () => {
    const scoped = createGraphStore();
    runWithGraphStore(scoped, () => {
      expect(resolveActiveGraphStore(graphStore)).toBe(scoped);
    });
    expect(resolveActiveGraphStore(graphStore)).toBe(graphStore);
  });

  it("a request scope outranks the module-level store", () => {
    // The server case: a module-level value must never leak into a request that
    // established its own graph.
    const moduleWide = createGraphStore();
    const request = createGraphStore();
    setActiveGraphStore(moduleWide);
    runWithGraphStore(request, () => {
      expect(resolveActiveGraphStore(graphStore)).toBe(request);
    });
    expect(resolveActiveGraphStore(graphStore)).toBe(moduleWide);
  });

  it("isolates CONCURRENT interleaved requests — the real SSR failure mode", async () => {
    const a = createGraphStore();
    const b = createGraphStore();
    await Promise.all([
      runWithGraphStore(a, async () => {
        resolveActiveGraphStore(graphStore)
          .getState()
          .upsertEntity("Acquisition", "1", { landManName: "A" });
        await new Promise((r) => setTimeout(r, 10)); // let B interleave
        expect(resolveActiveGraphStore(graphStore)).toBe(a);
      }),
      runWithGraphStore(b, async () => {
        resolveActiveGraphStore(graphStore)
          .getState()
          .upsertEntity("Acquisition", "1", { landManName: "B" });
        expect(resolveActiveGraphStore(graphStore)).toBe(b);
      }),
    ]);

    expect(a.getState().entities.Acquisition?.["1"]).toMatchObject({ landManName: "A" });
    expect(b.getState().entities.Acquisition?.["1"]).toMatchObject({ landManName: "B" });
    expect(graphStore.getState().entities.Acquisition?.["1"]).toBeUndefined();
  });

  it("prepareGraphStoreScope() enables request scoping on pure-ESM runtimes", async () => {
    // Under ESM there is no synchronous `require`, so the lazy loader cannot
    // reach node:async_hooks and runWithGraphStore would degrade to the
    // module-level store — which does NOT isolate concurrent requests.
    // Awaiting this once at startup is the documented remedy.
    expect(await prepareGraphStoreScope()).toBe(true);
    expect(await prepareGraphStoreScope()).toBe(true); // idempotent
  });

  it("does not warn about degraded scoping in a non-Node runtime", () => {
    // Falling back is correct in the browser, so the warning must stay quiet
    // there; it exists only to catch an ESM server that skipped startup init.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const original = (globalThis as { process?: unknown }).process;
    try {
      __resetActiveGraphStore();
      (globalThis as { process?: unknown }).process = undefined;
      runWithGraphStore(createGraphStore(), () => undefined);
      expect(warn).not.toHaveBeenCalled();
    } finally {
      (globalThis as { process?: unknown }).process = original;
      warn.mockRestore();
    }
  });
});
