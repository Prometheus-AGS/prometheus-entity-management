/**
 * flint-live.test.ts — Flint wire-contract round-trip, portable by default.
 *
 * Default lane (always runs): drives the checked fixture
 * (`flint-live.fixture.ts`), which mirrors the real
 * `@prometheusags/frf-entity-management` `RealtimeAdapter` encode/decode
 * semantics over a loopback spine, then feeds its `watchEntities()` stream
 * into OUR `createFlintAdapter` and asserts the event lands in the graph.
 *
 * Live lane (explicit opt-in): set `FLINT_EM_MODULE` and `FLINT_SDK_MODULE`
 * to the sibling SDK build outputs (e.g.
 * `<flint-realtime-fabric>/sdks/entity-management/dist/index.js` and
 * `<flint-realtime-fabric>/sdks/ts/dist/index.js`) and the SAME round-trip
 * runs against the real SDK. Opt-in is fail-closed: when the env vars are
 * set and the modules cannot be resolved, this suite FAILS instead of
 * skipping, so an enabled live lane can never report a silent pass.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { createFlintAdapter, type FlintClientLike } from "./flint";
import { useGraphStore } from "../graph";
import { resetRealtimeManager } from "./realtime-manager";
import {
  FixtureRealtimeAdapter,
  createLoopbackSpine,
  FIXTURE_EVENT_KIND_ENTITY_CHANGE,
  type FixtureSpineClient,
} from "./flint-live.fixture";

const EM_MODULE = process.env.FLINT_EM_MODULE;
const SDK_MODULE = process.env.FLINT_SDK_MODULE;
const LIVE_OPT_IN = Boolean(EM_MODULE || SDK_MODULE);

let RealtimeAdapter: (new (client: FixtureSpineClient) => FlintClientLike) | null = null;
let ENTITY_CHANGE: number | null = null;
let lane: "fixture" | "live" = "fixture";

beforeAll(async () => {
  if (!LIVE_OPT_IN) {
    RealtimeAdapter = FixtureRealtimeAdapter as unknown as typeof RealtimeAdapter;
    ENTITY_CHANGE = FIXTURE_EVENT_KIND_ENTITY_CHANGE;
    return;
  }
  if (!EM_MODULE || !SDK_MODULE) {
    throw new Error(
      "[flint-live] live lane opted in but incomplete: set BOTH FLINT_EM_MODULE and FLINT_SDK_MODULE",
    );
  }
  // Fail closed: an opted-in live lane that cannot resolve the SDK is a failure.
  const em = (await import(/* @vite-ignore */ EM_MODULE)) as Record<string, unknown>;
  const sdk = (await import(/* @vite-ignore */ SDK_MODULE)) as Record<string, unknown>;
  if (typeof em.RealtimeAdapter !== "function") {
    throw new Error(`[flint-live] FLINT_EM_MODULE ${EM_MODULE} exports no RealtimeAdapter`);
  }
  RealtimeAdapter = em.RealtimeAdapter as typeof RealtimeAdapter;
  ENTITY_CHANGE =
    (sdk.EventKind as Record<string, number> | undefined)?.ENTITY_CHANGE ?? 1;
  lane = "live";
});

describe("Flint watch/mutate contract round-trip into the graph", () => {
  it("publishes via the client adapter and the event lands in the graph through createFlintAdapter", async () => {
    expect(RealtimeAdapter).not.toBeNull();
    expect(ENTITY_CHANGE).not.toBeNull();

    resetRealtimeManager();
    const s = useGraphStore.getState();
    for (const id of Object.keys(s.entities.Order ?? {})) s.removeEntity("Order", id);

    const spine = createLoopbackSpine();
    // The lane's adapter (fixture by default, real SDK when opted in), wired
    // to our loopback spine.
    const flint = new RealtimeAdapter!(spine) as unknown as FlintClientLike;

    // OUR adapter consuming the lane adapter's watchEntities() stream.
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

    // Publish an entity mutation through the lane adapter's mutateEntity().
    await (flint as unknown as { mutateEntity: (r: unknown) => Promise<void> }).mutateEntity({
      entityType: "Order",
      entityId: "o1",
      tenantId: "tenant-1",
      channelId: "tenant-1",
      data: { id: "o1", status: "open" },
    });

    await waitFor(() => received.length > 0);

    const row = useGraphStore.getState().readEntity<Record<string, unknown>>("Order", "o1");
    expect(row).toMatchObject({ id: "o1", status: "open" });

    unsub();
    // Terminate the loopback generator so no async loop leaks across files.
    spine.close();
    resetRealtimeManager();
  });

  it("reports which lane produced this evidence", () => {
    // Receipt label: coverage and verification artifacts MUST cite the lane
    // so fixture evidence is never reported as live Flint interop.
    expect(["fixture", "live"]).toContain(lane);
    if (lane === "fixture") {
      // eslint-disable-next-line no-console
      console.log(
        "[flint-live] fixture lane — set FLINT_EM_MODULE/FLINT_SDK_MODULE for live SDK interop",
      );
    }
  });
});

/** Minimal poll helper (avoids importing vi just for waitFor in this file). */
async function waitFor(pred: () => boolean, timeoutMs = 1000): Promise<void> {
  const start = Date.now();
  while (!pred()) {
    if (Date.now() - start > timeoutMs) throw new Error("waitFor timeout");
    await new Promise((r) => setTimeout(r, 5));
  }
}
