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
 *     .getOrCreateContainer(entityId, LoroMap)  // per-entity LoroMap
 *       .set(fieldName, value)                  // field → value
 *
 * Binary snapshots are exchanged via `doc.export({ mode: "snapshot" })` and
 * `doc.import(bytes)`. Any transport can carry these bytes.
 *
 * `loro-crdt` is an optional peer dependency — nothing loads until `start()`.
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
  getOrCreateContainer(key: string, container: LoroMapLike): LoroMapLike;
  toJSON(): Record<string, unknown>;
}

/** A LoroDoc instance. */
interface LoroDocLike {
  getMap(name: string): LoroMapLike;
  toJSON(): Record<string, unknown>;
  export(opts: { mode: "snapshot" | "update" }): Uint8Array;
  import(bytes: Uint8Array): void;
  subscribe(handler: (event: unknown) => void): () => void;
}

interface LoroDocConstructor {
  new (): LoroDocLike;
}

interface LoroMapConstructor {
  new (): LoroMapLike;
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
}

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
   * Whether to automatically register `createLoroMergeStrategy` for each
   * entity type this provider manages. This replaces the graph's default
   * LWW strategy with CRDT-based resolution for those types.
   * @default true
   */
  registerMergeStrategies?: boolean;
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
  let LoroMapCtor: LoroMapConstructor | null = null;

  // ---------------------------------------------------------------------------
  // Lazy module loading
  // ---------------------------------------------------------------------------

  async function loadLoro(): Promise<void> {
    try {
      // @ts-ignore optional peer dependency
      const mod = await import(/* @vite-ignore */ "loro-crdt");
      LoroCtor = mod.LoroDoc as unknown as LoroDocConstructor;
      LoroMapCtor = mod.LoroMap as unknown as LoroMapConstructor;
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
      docs.set(type, doc);
      seenIds.set(type, new Set<EntityId>());
    }
    return doc;
  }

  /**
   * Get or create the per-entity LoroMap for `id` within the type's doc.
   * Uses `getOrCreateContainer` so repeated calls return the same map.
   */
  function getEntityMap(doc: LoroDocLike, id: EntityId): LoroMapLike {
    if (!LoroMapCtor) throw new Error("[entity-graph-sync/loro] Loro not loaded.");
    const root = doc.getMap("entities");
    return root.getOrCreateContainer(id, new LoroMapCtor());
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
    } catch {
      // Malformed or already-applied snapshot — skip silently.
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
      started = true;
      currentOnPeerChange = onPeerChange;

      await loadLoro();

      if (shouldRegisterStrategies) {
        const strategy = await createLoroMergeStrategy();
        for (const type of entityTypes) {
          registerMergeStrategy(type, strategy);
        }
      }

      for (const type of entityTypes) {
        getOrCreateDoc(type);
      }

      unsubscribeChannel = channel.onReceive(handleIncomingBytes);
      if (channel.connect) await channel.connect();
    },

    pushLocalChange(type, id, fields) {
      const doc = docs.get(type);
      if (!doc) return;

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
      } catch {
        // Export failed — non-fatal; peer will reconcile on next write.
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

// ---------------------------------------------------------------------------
// Built-in channel factory: WebSocket
// ---------------------------------------------------------------------------

/**
 * Create a `LoroChannel` that exchanges binary snapshots over a WebSocket.
 *
 * The server is expected to relay received messages to all other clients
 * subscribed to the same entity type (room-based relay model).
 *
 * Message framing:
 *   `[1 byte: type-name length N][N bytes: UTF-8 type name][M bytes: loro snapshot]`
 *
 * @example
 * ```ts
 * const channel = createWebSocketLoroChannel("ws://localhost:8080");
 * const provider = createLoroProvider({ channel });
 * ```
 */
export function createWebSocketLoroChannel(url: string): LoroChannel {
  let ws: WebSocket | null = null;
  const listeners: Array<(type: EntityType, bytes: Uint8Array) => void> = [];

  function encodeMessage(type: EntityType, bytes: Uint8Array): ArrayBuffer {
    const typeBytes = new TextEncoder().encode(type);
    const out = new Uint8Array(1 + typeBytes.length + bytes.length);
    out[0] = typeBytes.length;
    out.set(typeBytes, 1);
    out.set(bytes, 1 + typeBytes.length);
    return out.buffer as ArrayBuffer;
  }

  function decodeMessage(raw: Uint8Array): { type: EntityType; bytes: Uint8Array } | null {
    if (raw.length < 2) return null;
    const typeLen = raw[0];
    if (raw.length < 1 + typeLen) return null;
    const type = new TextDecoder().decode(raw.slice(1, 1 + typeLen));
    const bytes = raw.slice(1 + typeLen);
    return { type, bytes };
  }

  return {
    async connect() {
      await new Promise<void>((resolve, reject) => {
        ws = new WebSocket(url);
        ws.binaryType = "arraybuffer";
        ws.addEventListener("open", () => resolve());
        ws.addEventListener("error", (ev) =>
          reject(
            new Error(
              `[entity-graph-sync/loro] WebSocket connection failed: ${String(ev)}`,
            ),
          ),
        );
        ws.addEventListener("message", (ev: MessageEvent<ArrayBuffer>) => {
          const raw = new Uint8Array(ev.data);
          const decoded = decodeMessage(raw);
          if (decoded) {
            for (const listener of listeners) listener(decoded.type, decoded.bytes);
          }
        });
      });
    },

    send(type, bytes) {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      ws.send(encodeMessage(type, bytes));
    },

    onReceive(handler) {
      listeners.push(handler);
      return () => {
        const idx = listeners.indexOf(handler);
        if (idx >= 0) listeners.splice(idx, 1);
      };
    },

    disconnect() {
      ws?.close();
      ws = null;
      listeners.length = 0;
    },
  };
}
