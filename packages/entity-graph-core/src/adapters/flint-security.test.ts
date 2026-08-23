/**
 * flint-security.test.ts — security-relevant data contract at the Flint seam.
 *
 * Pins what THIS repo owns at the adapter boundary (the identity plane —
 * issuer/kid/JWKS/role verification — belongs to flint-gate and is pinned by
 * the checked claims fixture in tests/fixtures/flint-auth/, not by code here):
 *
 *   - subscription identity: every watch query carries channelId + consumerId;
 *   - mutation identity: publishFlintMutation forwards tenantId + channelId
 *     unchanged;
 *   - key separation: checkpoint state is scoped per channel+consumer, so one
 *     tenant, channel, or consumer can never inherit another's resume offset;
 *   - fail-closed decode: malformed or wrong-kind envelopes never reach the
 *     graph (verified through the checked fixture's wire semantics);
 *   - scoping: entityType subscriptions never forward cross-type events;
 *   - correlation ids pass through for audit joins.
 */
import { describe, it, expect, vi } from "vitest";
import {
  createFlintAdapter,
  publishFlintMutation,
  type FlintCheckpointStore,
  type FlintClientLike,
  type FlintEntityEvent,
  type FlintEntityQuery,
} from "./flint";
import type { ChangeSet } from "./types";
import {
  FixtureRealtimeAdapter,
  createLoopbackSpine,
  FIXTURE_EVENT_KIND_ENTITY_CHANGE,
} from "./flint-live.fixture";

function makeEvent(over: Partial<FlintEntityEvent> = {}): FlintEntityEvent {
  return {
    entityType: "Order",
    entityId: "o1",
    tenantId: "tenant-1",
    channelId: "c1",
    data: { id: "o1" },
    offset: 1n,
    ...over,
  };
}

function spyingClient(events: FlintEntityEvent[]) {
  const holder: { lastQuery?: FlintEntityQuery } = {};
  const mutate = vi.fn(async () => {});
  const client: FlintClientLike = {
    async *watchEntities(query) {
      holder.lastQuery = query;
      for (const e of events) yield e;
    },
    mutateEntity: mutate,
  };
  return { client, holder, mutate };
}

async function waitFor(pred: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timeout");
    await new Promise((r) => setTimeout(r, 5));
  }
}

describe("Flint seam security contract", () => {
  it("sends channelId + consumerId on every watch query (subscription identity)", async () => {
    const { client, holder } = spyingClient([]);
    const adapter = createFlintAdapter({ client, channelId: "tenant-9", consumerId: "ops-1" });
    const unsub = adapter.subscribe({}, () => {});
    await waitFor(() => holder.lastQuery !== undefined);
    expect(holder.lastQuery).toMatchObject({ channelId: "tenant-9", consumerId: "ops-1" });
    unsub();
  });

  it("forwards tenantId + channelId on mutations unchanged (no tenant rewrite)", async () => {
    const { client, mutate } = spyingClient([]);
    await publishFlintMutation(client, {
      entityType: "Order",
      entityId: "o7",
      tenantId: "tenant-9",
      channelId: "tenant-9",
      data: { id: "o7" },
      correlationId: "corr-1",
    });
    expect(mutate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-9",
        channelId: "tenant-9",
        correlationId: "corr-1",
      }),
    );
  });

  it("scopes checkpoint keys per channel+consumer: no cross-tenant or cross-consumer resume", async () => {
    const store = new Map<string, bigint>();
    const checkpoints: FlintCheckpointStore = {
      get: (k) => store.get(k),
      set: (k, v) => void store.set(k, v),
    };

    // Subscription A writes a checkpoint for (c1, web-1).
    const a = spyingClient([makeEvent({ offset: 41n })]);
    createFlintAdapter({
      client: a.client,
      channelId: "c1",
      consumerId: "web-1",
      checkpoints,
    }).subscribe({}, () => {});
    await waitFor(() => store.get("flint:c1:web-1") === 41n);

    // A different channel must NOT resume from A's offset.
    const b = spyingClient([]);
    const unsubB = createFlintAdapter({
      client: b.client,
      channelId: "c2",
      consumerId: "web-1",
      checkpoints,
    }).subscribe({}, () => {});
    await waitFor(() => b.holder.lastQuery !== undefined);
    expect(b.holder.lastQuery?.fromOffset).toBeUndefined();
    unsubB();

    // A different consumer on the SAME channel must NOT resume either.
    const c = spyingClient([]);
    const unsubC = createFlintAdapter({
      client: c.client,
      channelId: "c1",
      consumerId: "web-2",
      checkpoints,
    }).subscribe({}, () => {});
    await waitFor(() => c.holder.lastQuery !== undefined);
    expect(c.holder.lastQuery?.fromOffset).toBeUndefined();
    unsubC();

    // The SAME channel+consumer resumes at lastSeen + 1.
    const d = spyingClient([]);
    const unsubD = createFlintAdapter({
      client: d.client,
      channelId: "c1",
      consumerId: "web-1",
      checkpoints,
    }).subscribe({}, () => {});
    await waitFor(() => d.holder.lastQuery !== undefined);
    expect(d.holder.lastQuery?.fromOffset).toBe(42n);
    unsubD();
  });

  it("fails closed on malformed and wrong-kind envelopes (fixture wire semantics)", async () => {
    const spine = createLoopbackSpine();
    const flint = new FixtureRealtimeAdapter(spine) as unknown as FlintClientLike;
    const adapter = createFlintAdapter({ client: flint, channelId: "c1", consumerId: "web-1" });
    const received: ChangeSet[] = [];
    const unsub = adapter.subscribe({}, (cs) => received.push(cs));

    // 1. wrong kind — must be skipped by the wire decode.
    await spine.publish({
      envelope: {
        channel: { id: "c1", tenantId: "tenant-1" },
        kind: 999,
        payload: new TextEncoder().encode(JSON.stringify({ entityType: "Order", entityId: "bad1", data: {} })),
      },
    });
    // 2. malformed JSON payload — must be skipped, never forwarded.
    await spine.publish({
      envelope: {
        channel: { id: "c1", tenantId: "tenant-1" },
        kind: FIXTURE_EVENT_KIND_ENTITY_CHANGE,
        payload: new TextEncoder().encode("{not json"),
      },
    });
    // 3. well-formed control event — proves the stream itself was live.
    await flint.mutateEntity({
      entityType: "Order",
      entityId: "good1",
      tenantId: "tenant-1",
      channelId: "c1",
      data: { id: "good1" },
    });

    await waitFor(() => received.length === 1);
    expect(received[0]!.changes[0]).toMatchObject({ type: "Order", id: "good1" });
    unsub();
    spine.close();
  });

  it("scopes entityType subscriptions: cross-type events never reach the handler", async () => {
    const spine = createLoopbackSpine();
    const flint = new FixtureRealtimeAdapter(spine) as unknown as FlintClientLike;
    const adapter = createFlintAdapter({
      client: flint,
      channelId: "c1",
      consumerId: "web-1",
      entityType: "Order",
    });
    const received: ChangeSet[] = [];
    const unsub = adapter.subscribe({}, (cs) => received.push(cs));

    await flint.mutateEntity({
      entityType: "Client",
      entityId: "x1",
      tenantId: "tenant-1",
      channelId: "c1",
      data: { id: "x1" },
    });
    await flint.mutateEntity({
      entityType: "Order",
      entityId: "o1",
      tenantId: "tenant-1",
      channelId: "c1",
      data: { id: "o1" },
    });

    await waitFor(() => received.length === 1);
    expect(received[0]!.changes[0]).toMatchObject({ type: "Order", id: "o1" });
    unsub();
    spine.close();
  });
});
