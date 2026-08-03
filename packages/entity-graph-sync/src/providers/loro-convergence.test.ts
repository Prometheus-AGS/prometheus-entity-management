import { afterEach, describe, expect, it } from "vitest";
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import { startSyncBridge } from "../bridge";
import { createSyncProviderRegistry } from "../registry";
import { createLoroLoopbackNetwork } from "./loro-loopback";
import { createLoroProvider, type LoroChannel } from "./loro-provider";

interface Client {
  store: ReturnType<typeof createGraphStore>;
  channel: LoroChannel;
  stop: () => void;
}

const stops: Array<() => void> = [];

afterEach(() => {
  while (stops.length > 0) stops.pop()?.();
});

async function createClient(
  network: ReturnType<typeof createLoroLoopbackNetwork>,
  name: string,
  peerId: number,
): Promise<Client> {
  const store = createGraphStore();
  const registry = createSyncProviderRegistry();
  const channel = network.createChannel(name);
  const provider = createLoroProvider({
    channel,
    peerId,
    registerMergeStrategies: false,
    onError(error) {
      throw error;
    },
  });
  registry.register({ entityTypes: ["Task"], provider });
  const bridge = await startSyncBridge({ store, registry, pushDebounceMs: 0 });
  stops.push(() => bridge.stop());
  return { store, channel, stop: () => bridge.stop() };
}

async function disconnectedPair() {
  const network = createLoroLoopbackNetwork({ autoFlush: false });
  const a = await createClient(network, "client-a", 1);
  const b = await createClient(network, "client-b", 2);

  a.store.getState().upsertEntity("Task", "task-1", {
    id: "task-1",
    title: "Baseline",
    status: "todo",
    priority: "medium",
  });
  expect(network.flush()).toBe(1);
  expect(network.getPendingCount()).toBe(0);
  a.channel.disconnect?.();
  b.channel.disconnect?.();
  return { network, a, b };
}

describe("mandatory Loro two-client convergence", () => {
  it.each(["fifo", "reverse"] as const)(
    "preserves different-field offline writes with %s delivery",
    async (order) => {
      const { network, a, b } = await disconnectedPair();

      a.store.getState().upsertEntity("Task", "task-1", { status: "doing" });
      b.store.getState().upsertEntity("Task", "task-1", { priority: "high" });

      await a.channel.connect?.();
      await b.channel.connect?.();
      expect(network.getPendingCount()).toBe(2);
      network.flush(order);

      const expected = {
        id: "task-1",
        title: "Baseline",
        status: "doing",
        priority: "high",
      };
      expect(a.store.getState().readEntity("Task", "task-1")).toEqual(expected);
      expect(b.store.getState().readEntity("Task", "task-1")).toEqual(expected);
      // An inbound graph projection must not be republished as a new local
      // snapshot; otherwise this queue would refill and peers could ping-pong.
      expect(network.getPendingCount()).toBe(0);
    },
  );

  it.each(["fifo", "reverse"] as const)(
    "resolves same-field conflicts by deterministic peer identity with %s delivery",
    async (order) => {
      const { network, a, b } = await disconnectedPair();

      a.store.getState().upsertEntity("Task", "task-1", { status: "blocked" });
      b.store.getState().upsertEntity("Task", "task-1", { status: "done" });

      await a.channel.connect?.();
      await b.channel.connect?.();
      network.flush(order);

      // Both edits have the same logical counter; Loro's LWW map selects the
      // higher deterministic peer ID (client B = 2).
      expect(a.store.getState().readEntity<{ status: string }>("Task", "task-1")?.status).toBe(
        "done",
      );
      expect(b.store.getState().readEntity<{ status: string }>("Task", "task-1")?.status).toBe(
        "done",
      );
    },
  );
});
