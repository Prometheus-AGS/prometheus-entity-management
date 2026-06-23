/**
 * bridge.ts — Glue between the entity graph store and registered SyncProviders.
 *
 * Responsibilities:
 *  1. Subscribe to the graph store. When `entities[type][id]` changes and the
 *     type has a registered provider, call `provider.pushLocalChange`.
 *  2. Expose `applyPeerChange` so providers can push remote changes into the
 *     graph via `upsertEntity` (with `setEntitySyncMetadata` for provenance).
 *  3. Debounce outbound pushes to avoid flooding peers on rapid local writes.
 *
 * The bridge is transport-agnostic: it never imports yjs or loro-crdt.
 */

import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import type { EntityType, EntityId } from "@prometheus-ags/entity-graph-core";
import type { SyncProvider } from "./types";
import {
  getAllSyncProviders,
  getRegisteredSyncTypes,
  getSyncProvider,
} from "./registry";
import type { PeerEntityChange, SyncBridgeHandle, SyncBridgeOptions } from "./types";

// ---------------------------------------------------------------------------
// Peer-change ingestion (called by providers)
// ---------------------------------------------------------------------------

/**
 * Apply a batch of remote peer changes into the entity graph.
 *
 * This is the inbound path: providers receive CRDT updates from peers,
 * convert them to `PeerEntityChange` objects, and pass them here.
 * The bridge writes to the graph via `upsertEntity` and tags each entity
 * with `$origin: "server"` sync metadata so other observers know the
 * update came from a peer (not a local optimistic write).
 */
export function applyPeerChanges(changes: PeerEntityChange[]): void {
  const store = useGraphStore.getState();
  for (const change of changes) {
    store.upsertEntity(change.type, change.id, change.fields);
    store.setEntitySyncMetadata(change.type, change.id, {
      synced: true,
      origin: "server",
      updatedAt: change.updatedAt ?? Date.now(),
    });
  }
}

// ---------------------------------------------------------------------------
// Outbound push helpers
// ---------------------------------------------------------------------------

/** Pending outbound changes coalesced within one debounce window. */
interface PendingChange {
  type: EntityType;
  id: EntityId;
}

function makeBridge(opts: SyncBridgeOptions = {}): SyncBridgeHandle {
  const pushDebounceMs = opts.pushDebounceMs ?? 16;

  // Map of "type:id" → pending change for the current debounce window.
  const pending = new Map<string, PendingChange>();
  let flushTimer: ReturnType<typeof setTimeout> | null = null;

  function scheduleFlush(): void {
    if (flushTimer !== null) return;
    if (pushDebounceMs === 0) {
      flush();
      return;
    }
    flushTimer = setTimeout(() => {
      flushTimer = null;
      flush();
    }, pushDebounceMs);
  }

  function flush(): void {
    if (pending.size === 0) return;
    const snapshot = useGraphStore.getState();
    const batch = Array.from(pending.values());
    pending.clear();

    for (const { type, id } of batch) {
      const provider = getSyncProvider(type);
      if (!provider) continue;
      const fields = snapshot.entities[type]?.[id];
      if (!fields) continue;
      provider.pushLocalChange(type, id, fields);
    }
  }

  // Subscribe to the graph store. Zustand subscribeWithSelector lets us
  // compare only the `entities` slice to avoid rendering noise from list
  // metadata or patch changes.
  const unsubscribe = useGraphStore.subscribe(
    (state) => state.entities,
    (entities, prevEntities) => {
      const managedTypes = getRegisteredSyncTypes();
      for (const type of managedTypes) {
        const current = entities[type];
        const prev = prevEntities[type];
        if (current === prev) continue; // no change in this type partition

        // Diff at the id level to enqueue only changed entities.
        if (current) {
          for (const id of Object.keys(current)) {
            if (current[id] !== prev?.[id]) {
              pending.set(`${type}:${id}`, { type, id });
            }
          }
        }
      }
      scheduleFlush();
    },
  );

  return {
    stop() {
      if (flushTimer !== null) {
        clearTimeout(flushTimer);
        flushTimer = null;
      }
      pending.clear();
      unsubscribe();
      // Stop all registered providers.
      for (const provider of getAllSyncProviders()) {
        provider.stop();
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Start the sync bridge.
 *
 * The bridge:
 * - Subscribes to the entity graph and pushes local changes to providers.
 * - Starts every currently-registered provider.
 *
 * Returns a handle with `stop()` to tear down cleanly.
 *
 * @example
 * ```ts
 * registerSyncProvider({ entityTypes: ["Document"], provider: yjsProvider });
 * const bridge = await startSyncBridge();
 * // …later:
 * bridge.stop();
 * ```
 */
export async function startSyncBridge(opts: SyncBridgeOptions = {}): Promise<SyncBridgeHandle> {
  // Start all registered providers, grouping their entity types.
  const providerToTypes = new Map<SyncProvider["name"], { provider: SyncProvider; types: EntityType[] }>();
  for (const provider of getAllSyncProviders()) {
    if (!providerToTypes.has(provider.name)) {
      providerToTypes.set(provider.name, { provider, types: [] });
    }
  }
  // Build provider → types mapping via registry.
  const { getTypesForProvider } = await import("./registry");
  for (const entry of providerToTypes.values()) {
    entry.types = getTypesForProvider(entry.provider);
  }

  // Start each provider and pass the inbound change handler.
  await Promise.all(
    Array.from(providerToTypes.values()).map(({ provider, types }) =>
      provider.start(types, applyPeerChanges),
    ),
  );

  return makeBridge(opts);
}
