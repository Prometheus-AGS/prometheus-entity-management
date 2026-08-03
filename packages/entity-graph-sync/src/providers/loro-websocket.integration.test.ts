import { afterEach, describe, expect, it } from "vitest";
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import WebSocket, { WebSocketServer } from "ws";
import { startSyncBridge } from "../bridge";
import { createSyncProviderRegistry } from "../registry";
import { createLoroProvider } from "./loro-provider";
import { createWebSocketLoroChannel } from "./loro-websocket-channel";

interface RunningClient {
  store: ReturnType<typeof createGraphStore>;
  channel: ReturnType<typeof createWebSocketLoroChannel>;
  stop: () => void;
}

const cleanup: Array<() => void | Promise<void>> = [];

afterEach(async () => {
  while (cleanup.length > 0) await cleanup.pop()?.();
});

async function waitFor(
  predicate: () => boolean,
  description: string,
  timeoutMs = 5_000,
): Promise<void> {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for ${description}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

async function createClient(
  url: string,
  peerId: number,
  errors: Error[],
): Promise<RunningClient> {
  const store = createGraphStore();
  const registry = createSyncProviderRegistry();
  const channel = createWebSocketLoroChannel(url, {
    webSocketConstructor: WebSocket as unknown as typeof globalThis.WebSocket,
    reconnect: { initialDelayMs: 20, maxDelayMs: 50, maxAttempts: 10 },
    onError: (error) => errors.push(error),
  });
  const provider = createLoroProvider({
    channel,
    peerId,
    registerMergeStrategies: false,
    onError: (error) => errors.push(error),
  });
  registry.register({ entityTypes: ["Task"], provider });
  const bridge = await startSyncBridge({ store, registry, pushDebounceMs: 0 });
  return { store, channel, stop: () => bridge.stop() };
}

describe("real WebSocket relay reconnect integration", () => {
  it("converges two graph clients after termination, offline writes, and resynchronization", async () => {
    const server = new WebSocketServer({ port: 0 });
    await new Promise<void>((resolve) => server.once("listening", resolve));
    cleanup.push(
      () =>
        new Promise<void>((resolve) => {
          for (const client of server.clients) client.terminate();
          server.close(() => resolve());
        }),
    );

    const address = server.address();
    if (!address || typeof address === "string") throw new Error("relay has no TCP address");
    const url = `ws://127.0.0.1:${address.port}`;
    const serverConnections: WebSocket[] = [];
    let connectionCount = 0;

    server.on("connection", (socket) => {
      connectionCount += 1;
      serverConnections.push(socket);
      socket.on("message", (data, isBinary) => {
        for (const peer of server.clients) {
          if (peer !== socket && peer.readyState === WebSocket.OPEN) {
            peer.send(data, { binary: isBinary });
          }
        }
      });
    });

    const errors: Error[] = [];
    const a = await createClient(url, 1, errors);
    cleanup.push(() => a.stop());
    const b = await createClient(url, 2, errors);
    cleanup.push(() => b.stop());

    a.store.getState().upsertEntity("Task", "task-1", {
      id: "task-1",
      title: "Relay task",
      status: "todo",
      priority: "medium",
    });
    await waitFor(
      () => b.store.getState().entities.Task?.["task-1"]?.status === "todo",
      "the initial snapshot on client B",
    );

    // The first accepted socket belongs to client A because its bridge was
    // awaited before client B was created.
    serverConnections[0].terminate();
    await waitFor(
      () => a.channel.getStatus?.() === "reconnecting",
      "client A to enter reconnecting state",
    );

    a.store.getState().upsertEntity("Task", "task-1", { status: "doing" });
    b.store.getState().upsertEntity("Task", "task-1", { priority: "high" });

    await waitFor(
      () => connectionCount >= 3 && a.channel.getStatus?.() === "connected",
      "client A to reconnect through a new real socket",
    );
    await waitFor(() => {
      const taskA = a.store.getState().entities.Task?.["task-1"];
      const taskB = b.store.getState().entities.Task?.["task-1"];
      return (
        taskA?.status === "doing" &&
        taskA?.priority === "high" &&
        taskB?.status === "doing" &&
        taskB?.priority === "high"
      );
    }, "both canonical graph stores to converge");

    expect(a.store.getState().readEntity("Task", "task-1")).toEqual(
      b.store.getState().readEntity("Task", "task-1"),
    );
    expect(connectionCount).toBeGreaterThanOrEqual(3);
    expect(errors).toEqual([]);
  });
});
