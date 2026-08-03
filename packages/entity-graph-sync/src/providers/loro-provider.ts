/**
 * providers/loro-provider.ts — Loro CRDT sync provider.
 *
 * Reuses `createLoroMergeStrategy` from `@prometheus-ags/entity-graph-core`
 * for per-entity CRDT resolution. The provider layer adds:
 *
 *  1. A per-entity-type Loro document (one doc per type partition for
 *     efficient binary export).
 *  2. Export/import of Loro binary snapshots as the "transport payload"
 *     — callers supply a `channel` adapter (WebSocket, WebRTC data channel,
 *     Supabase Realtime, etc.) via the `LoroChannel` interface.
 *  3. Bridging from the Loro document's changes → `onPeerChange`.
 *
 * Document layout (one LoroDoc per entity type):
 *   doc.getMap("entities")   // root LoroMap
 *     .ensureMergeableMap(entityId)             // deterministic per-entity map
 *       .set(fieldName, value)                  // field → value
 *
 * Binary snapshots are exchanged via `doc.export({ mode: "snapshot" })` and
 * `doc.import(bytes)`. Any transport can carry these bytes.
 *
 * `loro-crdt` is a consumer-selectable peer dependency and a mandatory
 * release-test dependency — nothing loads until `start()`.
 */

import {
  createLoroMergeStrategy,
  registerMergeStrategy,
} from "@prometheus-ags/entity-graph-core";
import type { EntityId, EntityType } from "@prometheus-ags/entity-graph-core";
import type { PeerChangeHandler, SyncProvider } from "../types";

// ---------------------------------------------------------------------------
// Minimal Loro structural interfaces (no hard import at module level)
// ---------------------------------------------------------------------------

/** A LoroMap instance (nested container). */
interface LoroMapLike {
  set(key: string, value: unknown): void;
  get(key: string): unknown;
  ensureMergeableMap(key: string): LoroMapLike;
  toJSON(): Record<string, unknown>;
}

/** A LoroDoc instance. */
interface LoroDocLike {
  getMap(name: string): LoroMapLike;
  setPeerId(peerId: number | bigint | `${number}`): void;
  toJSON(): Record<string, unknown>;
  export(opts: { mode: "snapshot" | "update" }): Uint8Array;
  import(bytes: Uint8Array): void;
  subscribe(handler: (event: unknown) => void): () => void;
}

interface LoroDocConstructor {
  new (): LoroDocLike;
}

// ---------------------------------------------------------------------------
// Channel abstraction
// ---------------------------------------------------------------------------

/**
 * Minimal transport channel for exchanging Loro binary snapshots with peers.
 *
 * Consumers implement this once for their transport (WebSocket, Supabase
 * Realtime broadcast, etc.) and pass it to `createLoroProvider`.
 */
export interface LoroChannel {
  /**
   * Send a binary snapshot/update to all connected peers.
   * Called by the provider after every local entity write.
   */
  send(type: EntityType, bytes: Uint8Array): void;

  /**
   * Register a handler the channel calls whenever it receives bytes from a
   * remote peer. The provider uses these to import the update into the local
   * Loro doc and then call `onPeerChange`.
   *
   * Returns an unsubscribe function.
   */
  onReceive(handler: (type: EntityType, bytes: Uint8Array) => void): () => void;

  /** Optional lifecycle hook called when the provider starts. */
  connect?(): Promise<void>;

  /** Optional lifecycle hook called when the provider stops. */
  disconnect?(): void;

  /** Optional observable transport state for diagnostics and UI adapters. */
  getStatus?(): LoroChannelStatus;

  /** Optional subscription to transport-state changes. */
  onStatusChange?(handler: (status: LoroChannelStatus) => void): () => void;
}

export type LoroChannelStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "disconnected"
  | "error";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/** Options for `createLoroProvider`. */
export interface LoroProviderOptions {
  /**
   * The binary transport channel for exchanging Loro snapshots with peers.
   */
  channel: LoroChannel;

  /**
   * Optional bundler-visible loader for browser applications. Supply
   * `() => import("loro-crdt")` when the bundler cannot resolve the provider's
   * runtime-only peer import. Node consumers can omit this.
   */
  loadLoro?: () => Promise<{ LoroDoc: unknown }>;

  /**
   * Whether to automatically register `createLoroMergeStrategy` for each
   * entity type this provider manages. This replaces the graph's default
   * LWW strategy with CRDT-based resolution for those types.
   * @default true
   */
  registerMergeStrategies?: boolean;

  /**
   * Stable Loro peer identity. Supplying distinct numeric IDs makes concurrent
   * same-field resolution reproducible: Loro's LWW map tie-break chooses the
   * higher peer ID when logical counters are equal.
   */
  peerId?: number | bigint | `${number}`;

  /** Receives import, export, and lifecycle failures instead of hiding them. */
  onError?: (error: Error, operation: "start" | "import" | "export") => void;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * Create a Loro-backed SyncProvider.
 *
 * Each entity type gets one Loro document. Entity fields are stored in a
 * two-level LoroMap:
 *   doc.getMap("entities") → getOrCreateContainer(id, LoroMap) → set(field, value)
 *
 * Binary snapshots are exchanged over the supplied `LoroChannel`.
 *
 * @example
 * ```ts
 * const channel = createWebSocketLoroChannel("ws://localhost:8080");
 * const provider = createLoroProvider({ channel });
 * registerSyncProvider({ entityTypes: ["Task"], provider });
 * ```
 */
export function createLoroProvider(opts: LoroProviderOptions): SyncProvider {
  const { channel } = opts;
  const shouldRegisterStrategies = opts.registerMergeStrategies ?? true;

  const docs = new Map<EntityType, LoroDocLike>();
  // Track known entity ids per type so we can extract all entities on import.
  const seenIds = new Map<EntityType, Set<EntityId>>();

  let unsubscribeChannel: (() => void) | null = null;
  let currentOnPeerChange: PeerChangeHandler | null = null;
  let started = false;

  let LoroCtor: LoroDocConstructor | null = null;

  function reportError(
    cause: unknown,
    operation: "start" | "import" | "export",
  ): Error {
    const error =
      cause instanceof Error
        ? cause
        : new Error(`[entity-graph-sync/loro] ${operation} failed: ${String(cause)}`);
    if (opts.onError) opts.onError(error, operation);
    else console.error(error);
    return error;
  }

  // ---------------------------------------------------------------------------
  // Lazy module loading
  // ---------------------------------------------------------------------------

  async function loadLoro(): Promise<void> {
    try {
      const mod = opts.loadLoro
        ? await opts.loadLoro()
        : await import(/* @vite-ignore */ "loro-crdt");
      if (typeof mod.LoroDoc !== "function") {
        throw new TypeError("loro-crdt did not export a LoroDoc constructor");
      }
      LoroCtor = mod.LoroDoc as unknown as LoroDocConstructor;
    } catch (cause) {
      throw new Error(
        "[entity-graph-sync/loro] createLoroProvider requires the optional peer dependency 'loro-crdt'. " +
          "Install it with `pnpm add loro-crdt`.",
        { cause },
      );
    }
  }

  // ---------------------------------------------------------------------------
  // Document helpers
  // ---------------------------------------------------------------------------

  function getOrCreateDoc(type: EntityType): LoroDocLike {
    let doc = docs.get(type);
    if (!doc) {
      if (!LoroCtor) throw new Error("[entity-graph-sync/loro] Loro not loaded.");
      doc = new LoroCtor();
      if (opts.peerId !== undefined) doc.setPeerId(opts.peerId);
      docs.set(type, doc);
      seenIds.set(type, new Set<EntityId>());
    }
    return doc;
  }

  /**
   * Get or create the per-entity LoroMap for `id` within the type's doc.
   * Uses Loro's deterministic child-container identity so two peers that
   * create the same entity while offline merge the same map after reconnect.
   */
  function getEntityMap(doc: LoroDocLike, id: EntityId): LoroMapLike {
    const root = doc.getMap("entities");
    return root.ensureMergeableMap(id);
  }

  /** Read all entities from a doc given the set of known ids. */
  function extractEntities(
    type: EntityType,
    doc: LoroDocLike,
    ids: Set<EntityId>,
  ): Array<{ id: EntityId; fields: Record<string, unknown> }> {
    const results: Array<{ id: EntityId; fields: Record<string, unknown> }> = [];
    const root = doc.getMap("entities");
    const rootJson = root.toJSON() as Record<string, Record<string, unknown>>;

    // Collect from both known ids and any newly seen in the root JSON.
    const allIds = new Set<string>([...ids, ...Object.keys(rootJson)]);
    for (const id of allIds) {
      const fields = rootJson[id];
      if (fields && typeof fields === "object" && Object.keys(fields).length > 0) {
        ids.add(id); // register newly seen ids
        results.push({ id, fields });
      }
    }
    return results;
  }

  // ---------------------------------------------------------------------------
  // Inbound handler
  // ---------------------------------------------------------------------------

  function handleIncomingBytes(type: EntityType, bytes: Uint8Array): void {
    const doc = getOrCreateDoc(type);
    try {
      doc.import(bytes);
    } catch (cause) {
      reportError(cause, "import");
      return;
    }
    if (!currentOnPeerChange) return;

    const ids = seenIds.get(type) ?? new Set<EntityId>();
    const changes = extractEntities(type, doc, ids);
    if (changes.length > 0) {
      currentOnPeerChange(
        changes.map(({ id, fields }) => ({ type, id, fields, updatedAt: Date.now() })),
      );
    }
  }

  // ---------------------------------------------------------------------------
  // SyncProvider
  // ---------------------------------------------------------------------------

  return {
    name: "loro",

    async start(entityTypes, onPeerChange) {
      if (started) return;
      try {
        await loadLoro();

        if (shouldRegisterStrategies) {
          const strategy = await createLoroMergeStrategy(opts.loadLoro);
          for (const type of entityTypes) {
            registerMergeStrategy(type, strategy);
          }
        }

        for (const type of entityTypes) getOrCreateDoc(type);

        currentOnPeerChange = onPeerChange;
        unsubscribeChannel = channel.onReceive(handleIncomingBytes);
        if (channel.connect) await channel.connect();
        started = true;
      } catch (cause) {
        unsubscribeChannel?.();
        unsubscribeChannel = null;
        currentOnPeerChange = null;
        docs.clear();
        seenIds.clear();
        channel.disconnect?.();
        throw reportError(cause, "start");
      }
    },

    pushLocalChange(type, id, fields) {
      const doc = docs.get(type);
      if (!started || !doc) {
        throw new Error(
          `[entity-graph-sync/loro] cannot push ${type}:${id} before the provider manages that type.`,
        );
      }

      const ids = seenIds.get(type);
      if (ids) ids.add(id);

      // Write all fields into the entity's nested LoroMap.
      const entityMap = getEntityMap(doc, id);
      for (const [key, value] of Object.entries(fields)) {
        entityMap.set(key, value);
      }

      // Export and broadcast to peers.
      try {
        const bytes = doc.export({ mode: "snapshot" });
        channel.send(type, bytes);
      } catch (cause) {
        throw reportError(cause, "export");
      }
    },

    stop() {
      started = false;
      currentOnPeerChange = null;

      unsubscribeChannel?.();
      unsubscribeChannel = null;

      channel.disconnect?.();
      docs.clear();
      seenIds.clear();
    },

    getDoc(type) {
      return docs.get(type);
    },
  };
}
