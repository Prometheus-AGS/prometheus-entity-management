import { describe, it, expect, vi } from "vitest";
import {
  createFlintAdapter,
  publishFlintMutation,
  type FlintClientLike,
  type FlintEntityEvent,
  type FlintEntityQuery,
  type FlintCheckpointStore,
} from "./flint";
import type { ChangeSet } from "./types";

function makeEvent(over: Partial<FlintEntityEvent> = {}): FlintEntityEvent {
  return {
    entityType: "Order",
    entityId: "o1",
    tenantId: "t1",
    channelId: "c1",
    data: { id: "o1", status: "open" },
    offset: 1n,
    ...over,
  };
}

function makeClient(events: FlintEntityEvent[]): { client: FlintClientLike; lastQuery?: FlintEntityQuery; mutate: ReturnType<typeof vi.fn> } {
  const holder: { lastQuery?: FlintEntityQuery } = {};
  const mutate = vi.fn(async () => {});
  const client: FlintClientLike = {
    async *watchEntities(query) {
      holder.lastQuery = query;
      for (const e of events) yield e;
    },
    mutateEntity: mutate,
  };
  return { client, get lastQuery() { return holder.lastQuery; }, mutate };
}

describe("createFlintAdapter", () => {
  it("exposes a RealtimeAdapter with a derived name", () => {
    const { client } = makeClient([]);
    const adapter = createFlintAdapter({ client, channelId: "c1", consumerId: "web-1" });
    expect(adapter.name).toBe("flint:c1");
    expect(typeof adapter.subscribe).toBe("function");
  });

  it("converts Flint events into ChangeSets delivered to the handler", async () => {
    const { client } = makeClient([makeEvent(), makeEvent({ entityId: "o2", offset: 2n })]);
    const adapter = createFlintAdapter({ client, channelId: "c1", consumerId: "web-1" });
    const received: ChangeSet[] = [];
    adapter.subscribe({}, (cs) => received.push(cs));
    await vi.waitFor(() => expect(received.length).toBe(2));
    expect(received[0]!.changes[0]).toMatchObject({ op: "upsert", type: "Order", id: "o1" });
    expect(received[1]!.changes[0]!.id).toBe("o2");
  });

  it("persists the last offset to the checkpoint store", async () => {
    const store = new Map<string, bigint>();
    const checkpoints: FlintCheckpointStore = {
      get: (k) => store.get(k),
      set: (k, v) => { store.set(k, v); },
    };
    const { client } = makeClient([makeEvent({ offset: 5n }), makeEvent({ entityId: "o2", offset: 7n })]);
    const adapter = createFlintAdapter({ client, channelId: "c1", consumerId: "web-1", checkpoints });
    adapter.subscribe({}, () => {});
    await vi.waitFor(() => expect(store.get("flint:c1:web-1")).toBe(7n));
  });

  it("resumes fromOffset = lastSeen + 1 when a checkpoint exists", async () => {
    const checkpoints: FlintCheckpointStore = { get: () => 10n, set: () => {} };
    const c = makeClient([]);
    const adapter = createFlintAdapter({ client: c.client, channelId: "c1", consumerId: "web-1", checkpoints });
    adapter.subscribe({}, () => {});
    await vi.waitFor(() => expect(c.lastQuery?.fromOffset).toBe(11n));
  });

  it("filters by entityType when specified", async () => {
    const { client } = makeClient([makeEvent({ entityType: "Order" }), makeEvent({ entityType: "Client", entityId: "x" })]);
    const adapter = createFlintAdapter({ client, channelId: "c1", consumerId: "web-1", entityType: "Order" });
    const received: ChangeSet[] = [];
    adapter.subscribe({}, (cs) => received.push(cs));
    await vi.waitFor(() => expect(received.length).toBe(1));
    expect(received[0]!.changes[0]!.type).toBe("Order");
  });

  it("emits status transitions", async () => {
    const { client } = makeClient([makeEvent()]);
    const adapter = createFlintAdapter({ client, channelId: "c1", consumerId: "web-1" });
    const statuses: string[] = [];
    adapter.onStatusChange?.((s) => statuses.push(s));
    adapter.subscribe({}, () => {});
    await vi.waitFor(() => expect(statuses).toContain("disconnected"));
    expect(statuses[0]).toBe("connecting");
    expect(statuses).toContain("connected");
  });

  it("publishFlintMutation forwards to the client", async () => {
    const { client, mutate } = makeClient([]);
    await publishFlintMutation(client, { entityType: "Order", entityId: "o1", tenantId: "t1", channelId: "c1", data: { status: "x" } });
    expect(mutate).toHaveBeenCalledOnce();
  });
});
