/**
 * flint-live.test.ts — G1 parity proof: real Flint SDK round-trip.
 *
 * The original flint.test.ts used a hand-written fake of the Flint adapter. This
 * drives the REAL `@prometheusags/frf-entity-management` `RealtimeAdapter` over a
 * loopback `SpineClient` (no network), then feeds its `watchEntities()` stream
 * into OUR `createFlintAdapter`, and asserts a published entity event lands in
 * the graph. This proves interop with the actual Flint wire contract
 * (EventKind.ENTITY_CHANGE, JSON payload, channel/offset envelope shape).
 *
 * The Flint SDK lives in a sibling repo and is NOT a dependency of this package,
 * so the suite resolves it dynamically and SKIPS with a loud log if unavailable
 * (keeps standalone CI green); it RUNS wherever the sibling build is present.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createFlintAdapter, type FlintClientLike } from "./flint";
import { useGraphStore } from "../graph";
import { getRealtimeManager, resetRealtimeManager } from "./realtime-manager";

const EM_PATH =
  "/Users/gqadonis/Projects/prometheus/flint-realtime-fabric/sdks/entity-management/dist/index.js";
const SDK_PATH =
  "/Users/gqadonis/Projects/prometheus/flint-realtime-fabric/sdks/ts/dist/index.js";

// Loaded in beforeAll; tests gate on availability.
let RealtimeAdapter: (new (client: unknown) => FlintClientLike) | null = null;
let ENTITY_CHANGE: number | null = null;

beforeAll(async () => {
  try {
    const em = await import(/* @vite-ignore */ EM_PATH);
    const sdk = await import(/* @vite-ignore */ SDK_PATH);
    RealtimeAdapter = em.RealtimeAdapter;
    ENTITY_CHANGE = sdk.EventKind?.ENTITY_CHANGE ?? 1;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[G1] Flint SDK not resolvable — skipping live integration test:", (e as Error).message);
  }
});

/**
 * Loopback SpineClient: publish() pushes onto a queue; subscribe() yields it.
 * Matches the EventEnvelope shape the real adapter decodes
 * (kind, payload bytes, channel{id,tenantId}, offset{value}).
 */
function makeLoopbackSpine(entityChangeKind: number) {
  const queue: unknown[] = [];
  let resolveNext: (() => void) | null = null;
  let closed = false;
  return {
    async publish(envelope: { envelope: Record<string, unknown> }) {
      queue.push(envelope.envelope);
      resolveNext?.();
      resolveNext = null;
      return {};
    },
    /** Close the stream so the consumer's `for await` loop terminates cleanly
     *  (prevents a forever-parked async generator leaking across test files). */
    close() {
      closed = true;
      resolveNext?.();
      resolveNext = null;
    },
    async *subscribe(_req: unknown) {
      let offset = 0n;
      while (!closed) {
        if (queue.length === 0) {
          await new Promise<void>((r) => (resolveNext = r));
          if (closed) return;
        }
        const env = queue.shift() as Record<string, unknown> | undefined;
        if (!env) continue;
        // Stamp an offset like the real spine does.
        yield { ...env, offset: { value: ++offset } };
      }
    },
    _kind: entityChangeKind,
  };
}

describe("G1: real Flint RealtimeAdapter round-trip into the graph", () => {
  it("publishes via the real adapter and the event lands in the graph through createFlintAdapter", async () => {
    if (!RealtimeAdapter || ENTITY_CHANGE == null) {
      // Loud skip — recorded, not silent.
      expect(RealtimeAdapter, "Flint SDK unavailable; integration not proven in this environment").toBeTypeOf("function");
      return;
    }

    resetRealtimeManager();
    const s = useGraphStore.getState();
    for (const id of Object.keys(s.entities.Order ?? {})) s.removeEntity("Order", id);

    const spine = makeLoopbackSpine(ENTITY_CHANGE);
    // The REAL Flint entity adapter, wired to our loopback spine.
    const flint = new RealtimeAdapter(spine) as unknown as FlintClientLike;

    // OUR adapter consuming the REAL adapter's watchEntities() stream.
    const adapter = createFlintAdapter({
      client: flint,
      channelId: "tenant-1",
      consumerId: "web-1",
    });

    const received: unknown[] = [];
    const unsub = adapter.subscribe({}, (cs) => {
      received.push(cs);
      for (const ch of cs.changes) {
        useGraphStore.getState().upsertEntity(ch.type, ch.id, ch.data ?? {});
      }
    });

    // Publish an entity mutation through the REAL adapter's mutateEntity().
    await (flint as unknown as { mutateEntity: (r: unknown) => Promise<void> }).mutateEntity({
      entityType: "Order",
      entityId: "o1",
      tenantId: "tenant-1",
      channelId: "tenant-1",
      data: { id: "o1", status: "open" },
    });

    await vi_waitFor(() => received.length > 0);

    const row = useGraphStore.getState().readEntity<Record<string, unknown>>("Order", "o1");
    expect(row).toMatchObject({ id: "o1", status: "open" });

    unsub();
    // Terminate the loopback generator so no async loop leaks across files.
    (spine as unknown as { close: () => void }).close();
    resetRealtimeManager();
  });
});

/** Minimal poll helper (avoids importing vi just for waitFor in this file). */
async function vi_waitFor(pred: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error("vi_waitFor timeout");
    await new Promise((r) => setTimeout(r, 5));
  }
}
