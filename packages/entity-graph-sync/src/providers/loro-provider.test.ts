/**
 * loro-provider.test.ts — Unit tests for the Loro sync provider.
 *
 * Tests the channel + provider integration using a mock channel that captures
 * sent bytes and lets us inject fake "received" bytes.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import { __resetSyncRegistry } from "../registry";
import type { LoroChannel } from "./loro-provider";

// Reset graph store between tests.
function resetGraph(): void {
  useGraphStore.setState({
    entities: {},
    patches: {},
    entityStates: {},
    syncMetadata: {},
    lists: {},
  } as Parameters<typeof useGraphStore.setState>[0]);
}

/** Build a mock LoroChannel that lets tests inspect sent data. */
function makeMockChannel(): LoroChannel & {
  sentMessages: Array<{ type: string; bytes: Uint8Array }>;
  triggerReceive: (type: string, bytes: Uint8Array) => void;
} {
  const sentMessages: Array<{ type: string; bytes: Uint8Array }> = [];
  const receiveListeners: Array<(type: string, bytes: Uint8Array) => void> = [];

  return {
    sentMessages,
    triggerReceive(type: string, bytes: Uint8Array) {
      for (const listener of receiveListeners) listener(type, bytes);
    },
    async connect() {},
    disconnect() {},
    send(type, bytes) {
      sentMessages.push({ type, bytes: new Uint8Array(bytes) });
    },
    onReceive(handler) {
      receiveListeners.push(handler);
      return () => {
        const idx = receiveListeners.indexOf(handler);
        if (idx >= 0) receiveListeners.splice(idx, 1);
      };
    },
  };
}

describe("LoroProvider", () => {
  beforeEach(() => {
    resetGraph();
    __resetSyncRegistry();
  });

  it("sends binary bytes via channel when pushLocalChange is called (loro-crdt installed)", async () => {
    const { createLoroProvider } = await import("./loro-provider");
    const channel = makeMockChannel();
    const provider = createLoroProvider({ channel, registerMergeStrategies: false });

    await provider.start(["Document"], vi.fn());

    provider.pushLocalChange("Document", "doc-1", { title: "Hello", status: "draft" });

    // Should have sent at least one binary message.
    expect(channel.sentMessages.length).toBeGreaterThanOrEqual(1);
    expect(channel.sentMessages[0].type).toBe("Document");
    expect(channel.sentMessages[0].bytes).toBeInstanceOf(Uint8Array);
    expect(channel.sentMessages[0].bytes.length).toBeGreaterThan(0);

    provider.stop();
  });

  it("calls onPeerChange when channel receives bytes from peer (loro-crdt installed)", async () => {
    const { createLoroProvider } = await import("./loro-provider");
    const channelA = makeMockChannel();
    const channelB = makeMockChannel();

    const providerA = createLoroProvider({ channel: channelA, registerMergeStrategies: false });
    const providerB = createLoroProvider({ channel: channelB, registerMergeStrategies: false });

    const receivedByB: Array<unknown> = [];
    await providerA.start(["Document"], vi.fn());
    await providerB.start(["Document"], (changes) => receivedByB.push(...changes));

    // Provider A writes an entity and captures the exported bytes.
    providerA.pushLocalChange("Document", "d-1", { title: "Cross-peer" });

    expect(channelA.sentMessages.length).toBeGreaterThanOrEqual(1);
    const { type, bytes } = channelA.sentMessages[0];

    // Simulate provider B receiving those bytes from the network.
    channelB.triggerReceive(type, bytes);

    // B's onPeerChange should have been called.
    expect(receivedByB.length).toBeGreaterThanOrEqual(1);

    providerA.stop();
    providerB.stop();
  });

  it("exposes provider identity before the mandatory test dependency loads lazily", async () => {
    const { createLoroProvider } = await import("./loro-provider");
    const channel = makeMockChannel();
    const provider = createLoroProvider({ channel });
    expect(provider.name).toBe("loro");
  });

  it("uses an explicit module loader for bundler-visible browser integration", async () => {
    const { createLoroProvider } = await import("./loro-provider");
    const channel = makeMockChannel();
    const loadLoro = vi.fn(() => import("loro-crdt"));
    const provider = createLoroProvider({
      channel,
      registerMergeStrategies: false,
      loadLoro,
    });

    await provider.start(["Document"], vi.fn());

    expect(loadLoro).toHaveBeenCalledOnce();
    provider.stop();
  });

  it("stop() cleans up without errors even before start()", async () => {
    const { createLoroProvider } = await import("./loro-provider");
    const channel = makeMockChannel();
    const provider = createLoroProvider({ channel });
    // Should not throw.
    expect(() => provider.stop()).not.toThrow();
  });
});

describe("createWebSocketLoroChannel message encoding", () => {
  it("round-trips type + bytes through encode/decode", async () => {
    // Test the encoding logic without a real WebSocket.
    // We decode manually using the same framing: [1 byte typeLen][typeBytes][payload].
    const typeName = "Document";
    const payload = new Uint8Array([10, 20, 30, 40]);
    const typeBytes = new TextEncoder().encode(typeName);
    const encoded = new Uint8Array(1 + typeBytes.length + payload.length);
    encoded[0] = typeBytes.length;
    encoded.set(typeBytes, 1);
    encoded.set(payload, 1 + typeBytes.length);

    const decodedTypeLen = encoded[0];
    const decodedType = new TextDecoder().decode(encoded.slice(1, 1 + decodedTypeLen));
    const decodedPayload = encoded.slice(1 + decodedTypeLen);

    expect(decodedType).toBe(typeName);
    expect(Array.from(decodedPayload)).toEqual(Array.from(payload));
  });
});
