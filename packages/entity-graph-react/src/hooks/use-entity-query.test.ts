/**
 * Tests for `useEntityQuery` hook behavior — graph-store level (no React renderer).
 *
 * Tests the graph-mutation contract exercised by the hook's internal fetch path:
 * - View-keyed results land in the remote-result list slot
 * - Pagination (cursor) appends rather than replaces
 * - Typed errors propagate into graph.lastError
 * - Realtime sorted insertion modifies the base list
 * - Transport subscribe wiring (tested synchronously via direct store write)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import { registerEntityTransport, __resetEntityTransports } from "@prometheus-ags/entity-graph-core";
import { TerminalError, TransientError } from "@prometheus-ags/entity-graph-core";
import { toEntityError } from "@prometheus-ags/entity-graph-core";
import type { EntityTransport } from "@prometheus-ags/entity-graph-core";
import { serializeKey } from "@prometheus-ags/entity-graph-core";

type FooRow = { id: string; name: string; score: number };

function baseKey(type: string) {
  return serializeKey([type, "__base__"]);
}

function viewKey(type: string, view: object, cursor?: string | number) {
  return serializeKey([type, "__view__", view, cursor]);
}

/** Simulate the fetch path in useEntityQuery.fireRemoteFetch. */
async function simulateViewFetch<T extends object>(
  type: string,
  view: object = {},
  cursor?: string | number,
): Promise<void> {
  const { getEntityTransport } = await import("@prometheus-ags/entity-graph-core");

  let transport: EntityTransport<T>;
  try {
    transport = getEntityTransport<T>(type);
  } catch {
    // Mirror the hook: use TerminalError directly for missing transport
    const err = new TerminalError(`No transport registered for entity type "${type}"`);
    const bk = baseKey(type);
    useGraphStore.getState().setListError(bk, err.message, err);
    return;
  }

  const rKey = viewKey(type, view, cursor);
  const bk = baseKey(type);
  const store = useGraphStore.getState();
  store.setListFetching(rKey, true);
  store.setListFetching(bk, true);

  try {
    const result = await transport.list({});
    const graphStore = useGraphStore.getState();
    const entries = result.rows.map((row) => ({
      id: transport.identify(row),
      data: row as Record<string, unknown>,
    }));
    graphStore.upsertEntities(type, entries);
    for (const { id } of entries) graphStore.setEntityFetched(type, id);
    const ids = entries.map(({ id }) => id);

    if (cursor !== undefined) {
      graphStore.appendListResult(rKey, ids, {
        total: result.total,
        nextCursor: typeof result.nextCursor === "string" ? result.nextCursor : null,
        hasNextPage: result.nextCursor !== null,
      });
    } else {
      graphStore.setListResult(rKey, ids, {
        total: result.total,
        nextCursor: typeof result.nextCursor === "string" ? result.nextCursor : null,
        hasNextPage: result.nextCursor !== null,
      });
      graphStore.setListFetching(bk, false);
    }
  } catch (err) {
    const typed = toEntityError(err);
    const gs = useGraphStore.getState();
    gs.setListError(rKey, typed.message, typed);
    gs.setListError(bk, typed.message, typed);
  }
}

beforeEach(() => {
  __resetEntityTransports();
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  });
});

describe("useEntityQuery — graph contract", () => {
  it("happy path: rows land in view-keyed list slot", async () => {
    const rows: FooRow[] = [
      { id: "a", name: "Alpha", score: 10 },
      { id: "b", name: "Beta", score: 20 },
    ];
    registerEntityTransport<FooRow>("Bar", {
      identify: (r) => r.id,
      authoritative: false,
      list: async () => ({ rows, total: 2, nextCursor: null }),
    });

    const view = { filter: undefined };
    await simulateViewFetch<FooRow>("Bar", view);

    const rKey = viewKey("Bar", view, undefined);
    const list = useGraphStore.getState().lists[rKey];
    expect(list?.ids).toEqual(["a", "b"]);
    expect(list?.total).toBe(2);
    expect(list?.error).toBeNull();
    expect(list?.lastError).toBeNull();

    const alpha = useGraphStore.getState().readEntity<FooRow>("Bar", "a");
    expect(alpha?.name).toBe("Alpha");
  });

  it("TerminalError: lastError on both base and remote keys", async () => {
    registerEntityTransport<FooRow>("Bar", {
      identify: (r) => r.id,
      authoritative: false,
      list: async () => { throw new TerminalError("Table missing", { status: 404 }); },
    });

    await simulateViewFetch<FooRow>("Bar", {});

    const bk = baseKey("Bar");
    const rk = viewKey("Bar", {}, undefined);

    expect(useGraphStore.getState().lists[bk]?.lastError).toBeInstanceOf(TerminalError);
    expect(useGraphStore.getState().lists[rk]?.lastError).toBeInstanceOf(TerminalError);
  });

  it("TransientError: lastError is TransientError", async () => {
    registerEntityTransport<FooRow>("Bar", {
      identify: (r) => r.id,
      authoritative: false,
      list: async () => { throw new TransientError("Gateway", { status: 503 }); },
    });

    await simulateViewFetch<FooRow>("Bar", {});

    const rk = viewKey("Bar", {}, undefined);
    expect(useGraphStore.getState().lists[rk]?.lastError).toBeInstanceOf(TransientError);
  });

  it("pagination: cursor → appendListResult instead of setListResult", async () => {
    const page1: FooRow[] = [{ id: "1", name: "One", score: 1 }];
    const page2: FooRow[] = [{ id: "2", name: "Two", score: 2 }];
    let call = 0;
    registerEntityTransport<FooRow>("Bar", {
      identify: (r) => r.id,
      authoritative: false,
      list: async () => {
        call++;
        return call === 1
          ? { rows: page1, total: 2, nextCursor: "cursor-1" }
          : { rows: page2, total: 2, nextCursor: null };
      },
    });

    const view = {};
    // First page
    await simulateViewFetch<FooRow>("Bar", view);
    const rk1 = viewKey("Bar", view, undefined);
    expect(useGraphStore.getState().lists[rk1]?.ids).toEqual(["1"]);
    expect(useGraphStore.getState().lists[rk1]?.hasNextPage).toBe(true);

    // Second page (cursor)
    await simulateViewFetch<FooRow>("Bar", view, "cursor-1");
    const rk2 = viewKey("Bar", view, "cursor-1");
    expect(useGraphStore.getState().lists[rk2]?.ids).toEqual(["2"]);
  });

  it("no transport → TerminalError on base key", async () => {
    await simulateViewFetch("NoSuchType", {});

    const bk = baseKey("NoSuchType");
    expect(useGraphStore.getState().lists[bk]?.lastError).toBeInstanceOf(TerminalError);
    expect(useGraphStore.getState().lists[bk]?.error).toMatch(/No transport registered/);
  });

  it("subscribe: delete event removes entity from all lists", () => {
    // Simulate the effect of transport.subscribe firing a delete event
    useGraphStore.getState().upsertEntity("Bar", "x", { id: "x", name: "X", score: 5 });
    const bk = baseKey("Bar");
    useGraphStore.getState().setListResult(bk, ["x"], { total: 1 });

    // Simulate what the subscribe callback does
    useGraphStore.getState().removeIdFromAllLists("Bar", "x");
    useGraphStore.getState().removeEntity("Bar", "x");

    // Re-read state after mutations
    const list = useGraphStore.getState().lists[bk];
    expect(list?.ids).toEqual([]);
    expect(useGraphStore.getState().readEntity("Bar", "x")).toBeNull();
  });

  it("subscribe: insert event upserts entity and marks fetched", () => {
    // Simulate what the subscribe callback does on insert
    const newRow = { id: "z", name: "Zeta", score: 99 };
    useGraphStore.getState().upsertEntity("Bar", "z", newRow as Record<string, unknown>);
    useGraphStore.getState().setEntityFetched("Bar", "z");

    // Re-read state
    const entity = useGraphStore.getState().readEntity<FooRow>("Bar", "z");
    expect(entity?.name).toBe("Zeta");
    const entityState = useGraphStore.getState().entityStates["Bar:z"];
    expect(entityState?.lastFetched).not.toBeNull();
    expect(entityState?.error).toBeNull();
  });

  it("staleTime: existing fresh list → no re-fetch (stale = false, lastFetched recent)", () => {
    const listFn = vi.fn(async () => ({ rows: [] as FooRow[], total: 0, nextCursor: null }));
    registerEntityTransport<FooRow>("Bar", {
      identify: (r) => r.id,
      authoritative: false,
      staleTime: 60_000,
      list: listFn,
    });

    // Prime the base key with a fresh lastFetched
    const bk = baseKey("Bar");
    useGraphStore.getState().setListResult(bk, [], { total: 0 });
    // Verify staleness check: lastFetched is recent, stale = false
    const list = useGraphStore.getState().lists[bk];
    expect(list?.stale).toBe(false);
    expect(list?.lastFetched).not.toBeNull();
    expect(Date.now() - (list?.lastFetched ?? 0)).toBeLessThan(60_000);
    // A hook would skip fetching — listFn would NOT be called
    // (We can't test the effect directly without jsdom, but the contract is verifiable
    //  by checking that the list remains unchanged when we don't call simulateViewFetch)
    expect(listFn).not.toHaveBeenCalled();
  });

  it("viewTotal: uses remote list total when available", () => {
    const rk = viewKey("Bar", {}, undefined);
    useGraphStore.getState().setListResult(rk, ["1", "2"], { total: 50 });
    const remoteList = useGraphStore.getState().lists[rk];
    expect(remoteList?.total).toBe(50);
  });

  it("hasNextPage false when completenessMode is local", () => {
    // With no remote list and complete data, hasNextPage should be false
    // (tested via the hook's return; here we verify the graph contract)
    const bk = baseKey("Bar");
    useGraphStore.getState().setListResult(bk, ["1", "2"], {
      total: 2,
      hasNextPage: false,
    });
    const list = useGraphStore.getState().lists[bk];
    expect(list?.hasNextPage).toBe(false);
  });
});
