import type { EntityType } from "@prometheus-ags/entity-graph-core";
import type { LoroChannel } from "./loro-provider";

export type LoroLoopbackDeliveryOrder = "fifo" | "reverse";

export interface LoroLoopbackNetworkOptions {
  /** Deliver messages immediately. Set false to control ordering with `flush`. */
  autoFlush?: boolean;
}

export interface LoroLoopbackNetwork {
  /** Create one uniquely named peer channel. */
  createChannel(peerId: string): LoroChannel;
  /** Deliver all currently queued messages in a deterministic order. */
  flush(order?: LoroLoopbackDeliveryOrder): number;
  /** Number of point-to-point deliveries waiting in the network. */
  getPendingCount(): number;
}

interface PeerState {
  connected: boolean;
  latestByType: Map<EntityType, Uint8Array>;
  listeners: Set<(type: EntityType, bytes: Uint8Array) => void>;
}

interface Delivery {
  from: string;
  to: string;
  type: EntityType;
  bytes: Uint8Array;
}

function cloneBytes(bytes: Uint8Array): Uint8Array {
  return new Uint8Array(bytes);
}

/**
 * Create an in-process Loro fabric with explicit disconnect/reconnect and
 * delivery-order control.
 *
 * Every peer retains its latest full snapshot per entity type. Reconnecting a
 * peer queues a bidirectional snapshot exchange with every connected peer,
 * which models the resynchronization contract required of real transports.
 * This is the deterministic default test/reference path; it is not a claim
 * that WebSocket reconnect has passed.
 */
export function createLoroLoopbackNetwork(
  options: LoroLoopbackNetworkOptions = {},
): LoroLoopbackNetwork {
  const autoFlush = options.autoFlush ?? true;
  const peers = new Map<string, PeerState>();
  const queue: Delivery[] = [];

  function enqueue(
    from: string,
    to: string,
    type: EntityType,
    bytes: Uint8Array,
  ): void {
    queue.push({ from, to, type, bytes: cloneBytes(bytes) });
  }

  function exchangeLatest(peerId: string): void {
    const peer = peers.get(peerId);
    if (!peer?.connected) return;

    for (const [otherId, other] of peers) {
      if (otherId === peerId || !other.connected) continue;
      for (const [type, bytes] of other.latestByType) {
        enqueue(otherId, peerId, type, bytes);
      }
      for (const [type, bytes] of peer.latestByType) {
        enqueue(peerId, otherId, type, bytes);
      }
    }
  }

  const network: LoroLoopbackNetwork = {
    createChannel(peerId) {
      if (!peerId) throw new Error("[entity-graph-sync/loro] loopback peerId is required.");
      if (peers.has(peerId)) {
        throw new Error(
          `[entity-graph-sync/loro] loopback peerId "${peerId}" is already registered.`,
        );
      }

      const state: PeerState = {
        connected: false,
        latestByType: new Map(),
        listeners: new Set(),
      };
      peers.set(peerId, state);

      return {
        async connect() {
          state.connected = true;
          exchangeLatest(peerId);
          if (autoFlush) network.flush();
        },
        disconnect() {
          state.connected = false;
        },
        send(type, bytes) {
          const snapshot = cloneBytes(bytes);
          state.latestByType.set(type, snapshot);
          if (!state.connected) return;

          for (const [otherId, other] of peers) {
            if (otherId !== peerId && other.connected) {
              enqueue(peerId, otherId, type, snapshot);
            }
          }
          if (autoFlush) network.flush();
        },
        onReceive(handler) {
          state.listeners.add(handler);
          return () => state.listeners.delete(handler);
        },
      };
    },
    flush(order = "fifo") {
      const deliveries = queue.splice(0);
      if (order === "reverse") deliveries.reverse();
      let delivered = 0;
      for (const delivery of deliveries) {
        const target = peers.get(delivery.to);
        if (!target?.connected) continue;
        for (const listener of target.listeners) {
          listener(delivery.type, cloneBytes(delivery.bytes));
        }
        delivered += 1;
      }
      return delivered;
    },
    getPendingCount() {
      return queue.length;
    },
  };

  return network;
}
