/**
 * bridge.test.ts — Unit tests for applyPeerChanges + bridge integration.
 *
 * We test the inbound path (applyPeerChanges) directly against the real
 * graph store, and test the bridge's graph-subscription dispatch using
 * mock providers.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import { applyPeerChanges } from "./bridge";
import { registerSyncProvider, __resetSyncRegistry } from "./registry";
import type { SyncProvider } from "./types";

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

describe("applyPeerChanges", () => {
  beforeEach(() => {
    resetGraph();
    __resetSyncRegistry();
  });

  it("writes peer changes into the entity graph", () => {
    applyPeerChanges([
      { type: "Document", id: "doc-1", fields: { title: "Hello", body: "World" } },
    ]);

    const state = useGraphStore.getState();
    const doc = state.entities["Document"]?.["doc-1"];
    expect(doc).toBeDefined();
    expect(doc?.["title"]).toBe("Hello");
    expect(doc?.["body"]).toBe("World");
  });

  it("sets sync metadata with origin=server", () => {
    const now = Date.now();
    applyPeerChanges([
      { type: "Task", id: "t-1", fields: { status: "done" }, updatedAt: now },
    ]);

    const state = useGraphStore.getState();
    const meta = state.syncMetadata["Task:t-1"];
    expect(meta?.origin).toBe("server");
    expect(meta?.synced).toBe(true);
    expect(meta?.updatedAt).toBe(now);
  });

  it("handles multiple changes in a single batch", () => {
    applyPeerChanges([
      { type: "Document", id: "d-1", fields: { title: "Alpha" } },
      { type: "Document", id: "d-2", fields: { title: "Beta" } },
      { type: "Task", id: "t-1", fields: { done: true } },
    ]);

    const state = useGraphStore.getState();
    expect(state.entities["Document"]?.["d-1"]?.["title"]).toBe("Alpha");
    expect(state.entities["Document"]?.["d-2"]?.["title"]).toBe("Beta");
    expect(state.entities["Task"]?.["t-1"]?.["done"]).toBe(true);
  });

  it("upserts (merges) fields when entity already exists", () => {
    // Pre-populate the graph with an existing entity.
    useGraphStore.getState().upsertEntity("Document", "d-1", { title: "Old", version: 1 });

    // Peer sends a partial update.
    applyPeerChanges([{ type: "Document", id: "d-1", fields: { title: "New" } }]);

    const state = useGraphStore.getState();
    const doc = state.entities["Document"]?.["d-1"];
    expect(doc?.["title"]).toBe("New");
    // Previously existing field is preserved.
    expect(doc?.["version"]).toBe(1);
  });
});

describe("SyncProvider pushLocalChange dispatch", () => {
  beforeEach(() => {
    resetGraph();
    __resetSyncRegistry();
  });

  it("provider.pushLocalChange is called when a managed entity is upserted", async () => {
    const pushed: Array<{ type: string; id: string; fields: Record<string, unknown> }> = [];

    const mockProvider: SyncProvider = {
      name: "mock",
      async start(_types, _onPeerChange) {},
      pushLocalChange(type, id, fields) {
        pushed.push({ type, id, fields });
      },
      stop() {},
    };

    registerSyncProvider({ entityTypes: ["Document"], provider: mockProvider });

    // Import startSyncBridge lazily to avoid circular dep issues in test setup.
    const { startSyncBridge } = await import("./bridge");
    const bridge = await startSyncBridge({ pushDebounceMs: 0 });

    // Upsert an entity — the bridge should detect the change and call pushLocalChange.
    useGraphStore.getState().upsertEntity("Document", "doc-42", { title: "Sync me" });

    // Allow microtasks to flush (synchronous debounce).
    await Promise.resolve();

    bridge.stop();

    expect(pushed.length).toBeGreaterThanOrEqual(1);
    const first = pushed[0];
    expect(first.type).toBe("Document");
    expect(first.id).toBe("doc-42");
    expect(first.fields["title"]).toBe("Sync me");
  });

  it("provider.pushLocalChange is NOT called for unmanaged entity types", async () => {
    const pushed: string[] = [];

    const mockProvider: SyncProvider = {
      name: "mock-unmanaged",
      async start() {},
      pushLocalChange(type) {
        pushed.push(type);
      },
      stop() {},
    };

    registerSyncProvider({ entityTypes: ["Document"], provider: mockProvider });

    const { startSyncBridge } = await import("./bridge");
    const bridge = await startSyncBridge({ pushDebounceMs: 0 });

    // Upsert an entity of an UNMANAGED type.
    useGraphStore.getState().upsertEntity("Task", "task-1", { done: false });

    await Promise.resolve();

    bridge.stop();

    // "Task" is not managed — pushLocalChange must not be called for it.
    expect(pushed).not.toContain("Task");
  });
});
