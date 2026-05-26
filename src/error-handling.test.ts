import { describe, it, expect, beforeEach } from "vitest";
import { useGraphStore } from "./graph";
import { fetchList, configureEngine, getEngineOptions } from "./engine";

/**
 * Terminal-error handling for list fetches.
 *
 * The fix shape (May 2026):
 *   - `setListError(key, msg)` now stamps `lastFetched: Date.now()`
 *     and clears `stale: false`. Without this, the SWR staleness
 *     check in `useEntityList` / `useEntityView` mount effects would
 *     return true on the very next render and refire the fetcher —
 *     a 404 on a missing table becomes an infinite retry loop.
 *   - With `lastFetched` stamped, a terminal failure is treated as a
 *     completed attempt; consumers see a stable `error` + `isFetching:
 *     false` and can manually `refetch()` if they want to retry.
 *
 * Reference: TanStack Query author's recommendation that 4xx are
 * NOT retried by default and that consumers read `error` from the
 * hook return rather than receiving callback notifications.
 * https://tkdodo.eu/blog/react-query-error-handling
 */

function resetGraphStore(): void {
  useGraphStore.setState({ entities: {}, patches: {}, lists: {}, entityStates: {} });
}

beforeEach(() => {
  resetGraphStore();
  // Disable retries so we observe the terminal-error behaviour in a
  // single attempt, not after `maxRetries` rounds.
  configureEngine({ maxRetries: 0 });
});

describe("setListError stamps lastFetched", () => {
  it("clears isFetching and sets lastFetched to a recent timestamp", () => {
    const before = Date.now();
    useGraphStore.getState().setListError("test-key", "boom");
    const after = Date.now();
    const list = useGraphStore.getState().lists["test-key"];
    expect(list).toBeDefined();
    expect(list.error).toBe("boom");
    expect(list.isFetching).toBe(false);
    expect(list.isFetchingMore).toBe(false);
    expect(list.lastFetched).toBeGreaterThanOrEqual(before);
    expect(list.lastFetched).toBeLessThanOrEqual(after);
    expect(list.stale).toBe(false);
  });

  it("clearing the error (setListError(key, null)) keeps lastFetched stamped", () => {
    useGraphStore.getState().setListError("test-key", "boom");
    const stamp = useGraphStore.getState().lists["test-key"].lastFetched;
    useGraphStore.getState().setListError("test-key", null);
    const list = useGraphStore.getState().lists["test-key"];
    expect(list.error).toBe(null);
    expect(list.lastFetched).toBeGreaterThanOrEqual(stamp ?? 0);
  });
});

describe("fetchList terminal-error behaviour", () => {
  it("a thrown fetcher results in error set + isFetching false + lastFetched stamped", async () => {
    let calls = 0;
    await fetchList(
      {
        type: "Invoice",
        queryKey: ["Invoice", "outstanding", "company-uuid"],
        fetch: async () => {
          calls += 1;
          throw new Error("relation 'public.invoice' does not exist");
        },
        normalize: (raw) => ({ id: String((raw as { id: string }).id), data: raw }),
      },
      {},
      getEngineOptions(),
    );
    const key = JSON.stringify(["Invoice", "outstanding", "company-uuid"]);
    const list = useGraphStore.getState().lists[key];
    expect(calls).toBe(1); // maxRetries=0 in beforeEach
    expect(list.error).toBe("relation 'public.invoice' does not exist");
    expect(list.isFetching).toBe(false);
    expect(list.lastFetched).not.toBe(null);
    expect(list.stale).toBe(false);
  });

  it("a subsequent fetchList for the same key WITHIN staleTime does NOT auto-retry (no consumer refetch)", async () => {
    let calls = 0;
    const opts = {
      type: "Invoice",
      queryKey: ["Invoice", "k2"],
      fetch: async () => {
        calls += 1;
        throw new Error("404");
      },
      normalize: (raw: unknown) => ({ id: String((raw as { id: string }).id), data: raw as object }),
    } as const;
    await fetchList(opts, {}, getEngineOptions());
    expect(calls).toBe(1);
    // The fix means: any consumer hook reading `lastFetched` will see
    // it stamped and the SWR mount-effect staleness check will return
    // false. A second explicit fetchList call still runs (it's
    // imperative), but the auto-retry via useEffect will not.
    // Here we just assert no implicit retry was scheduled — the only
    // call count comes from the explicit fetchList above.
    await new Promise((r) => setTimeout(r, 20));
    expect(calls).toBe(1);
  });
});
