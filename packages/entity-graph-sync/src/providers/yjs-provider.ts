/**
 * providers/yjs-provider.ts — Yjs CRDT sync provider.
 *
 * Maps each entity type to a Y.Map keyed by entity id. Each entity id maps
 * to another Y.Map of field key→value (two-level nesting: type → id → fields).
 *
 * Transport:
 *   - WebSocket: via `y-websocket` WebsocketProvider (default, server-required).
 *   - WebRTC: via `y-webrtc` WebrtcProvider (peer-to-peer, no server).
 *   Both are optional peer deps loaded lazily.
 *
 * Graph ↔ Yjs bridge:
 *   - Local writes: `pushLocalChange` sets fields on the Y.Map and the
 *     underlying y-websocket/y-webrtc provider propagates them to peers.
 *   - Remote writes: Y.Map `observe` fires when peers send updates;
 *     `onPeerChange` is called with the changed fields.
 *
 * One Y.Doc is created per entity-type partition.
 */

import type { EntityId, EntityType } from "@prometheus-ags/entity-graph-core";
import type { PeerChangeHandler, SyncProvider } from "../types";

// ---------------------------------------------------------------------------
// Minimal structural interfaces — avoid hard runtime imports
// ---------------------------------------------------------------------------

/** Subset of `Y.Map<unknown>` we use. */
interface YMapLike<V = unknown> {
  set(key: string, value: V): void;
  get(key: string): V | undefined;
  toJSON(): Record<string, V>;
  observe(f: (event: YMapEventLike) => void): void;
  unobserve(f: (event: YMapEventLike) => void): void;
}

interface YMapEventLike {
  keysChanged: Set<string>;
  transaction: { origin: unknown };
}

/** Subset of `Y.Doc` we use. */
interface YDocLike {
  getMap<V>(name: string): YMapLike<V>;
  destroy(): void;
}

/** Factory fn matching `new Y.Doc()`. */
interface YDocConstructor {
  new (): YDocLike;
}

/** Minimal WebsocketProvider constructor shape from y-websocket. */
interface WebsocketProviderLike {
  destroy(): void;
}
interface WebsocketProviderCtor {
  new (
    serverUrl: string,
    roomName: string,
    doc: YDocLike,
    opts?: { connect?: boolean },
  ): WebsocketProviderLike;
}

/** Minimal WebrtcProvider constructor shape from y-webrtc. */
interface WebrtcProviderLike {
  destroy(): void;
}
interface WebrtcProviderCtor {
  new (
    roomName: string,
    doc: YDocLike,
    opts?: Record<string, unknown>,
  ): WebrtcProviderLike;
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

/**
 * Transport mode for the Yjs provider.
 *
 * - `"websocket"` (default) — requires a y-websocket server (e.g. `npx y-websocket`).
 * - `"webrtc"` — peer-to-peer signalling via y-webrtc (no server; uses WebRTC data channels).
 * - `"both"` — use both transports simultaneously for maximum resilience.
 */
export type YjsTransport = "websocket" | "webrtc" | "both";

/** Options for `createYjsProvider`. */
export interface YjsProviderOptions {
  /**
   * Transport mode.
   * @default "websocket"
   */
  transport?: YjsTransport;

  /**
   * WebSocket server URL (required when transport includes `"websocket"`).
   * Example: `"ws://localhost:1234"`.
   */
  wsServerUrl?: string;

  /**
   * Room name prefix. The provider appends `/{entityType}` to scope each
   * entity-type doc to a distinct room.
   * @default "entity-graph"
   */
  roomPrefix?: string;

  /**
   * Extra options passed verbatim to the WebrtcProvider constructor.
   * Use to configure signalling servers or encryption.
   */
  webrtcOpts?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const LOCAL_ORIGIN = Symbol("entity-graph-sync:local");

function entityRoomName(prefix: string, type: EntityType): string {
  return `${prefix}/${type}`;
}

// ---------------------------------------------------------------------------
// Provider implementation
// ---------------------------------------------------------------------------

/**
 * Create a Yjs-backed SyncProvider.
 *
 * Entity data is stored in a two-level Y.Map structure:
 *   doc.getMap("entities") → Y.Map<Y.Map<unknown>>
 *                             ↑ keyed by entity id → keyed by field name
 *
 * @example
 * ```ts
 * const provider = createYjsProvider({
 *   transport: "websocket",
 *   wsServerUrl: "ws://localhost:1234",
 * });
 * registerSyncProvider({ entityTypes: ["Document", "Comment"], provider });
 * ```
 */
export function createYjsProvider(opts: YjsProviderOptions = {}): SyncProvider {
  const transport = opts.transport ?? "websocket";
  const roomPrefix = opts.roomPrefix ?? "entity-graph";

  // Per-type state.
  const docs = new Map<EntityType, YDocLike>();
  const wsProviders = new Map<EntityType, WebsocketProviderLike>();
  const rtcProviders = new Map<EntityType, WebrtcProviderLike>();

  // Loaded lazily so the bundle stays lean when yjs is not installed.
  let YDocCtor: YDocConstructor | null = null;
  let WsProviderCtor: WebsocketProviderCtor | null = null;
  let RtcProviderCtor: WebrtcProviderCtor | null = null;

  let started = false;
  let currentOnPeerChange: PeerChangeHandler | null = null;

  // Observer callbacks keyed by "type:id" so we can unobserve cleanly.
  const observers = new Map<string, (event: YMapEventLike) => void>();

  // ---------------------------------------------------------------------------
  // Lazy module loading
  // ---------------------------------------------------------------------------

  async function loadModules(): Promise<void> {
    try {
      // @ts-ignore optional peer
      const yjs = await import(/* @vite-ignore */ "yjs");
      YDocCtor = yjs.Doc as unknown as YDocConstructor;
    } catch (cause) {
      throw new Error(
        "[entity-graph-sync/yjs] createYjsProvider requires the optional peer dependency 'yjs'. " +
          "Install it with `pnpm add yjs`.",
        { cause },
      );
    }

    if (transport === "websocket" || transport === "both") {
      if (!opts.wsServerUrl) {
        throw new Error(
          "[entity-graph-sync/yjs] wsServerUrl is required when transport includes 'websocket'.",
        );
      }
      try {
        // @ts-ignore optional peer
        const yw = await import(/* @vite-ignore */ "y-websocket");
        WsProviderCtor = yw.WebsocketProvider as unknown as WebsocketProviderCtor;
      } catch (cause) {
        throw new Error(
          "[entity-graph-sync/yjs] WebSocket transport requires the optional peer dependency 'y-websocket'. " +
            "Install it with `pnpm add y-websocket`.",
          { cause },
        );
      }
    }

    if (transport === "webrtc" || transport === "both") {
      try {
        // @ts-ignore optional peer
        const yr = await import(/* @vite-ignore */ "y-webrtc");
        RtcProviderCtor = yr.WebrtcProvider as unknown as WebrtcProviderCtor;
      } catch (cause) {
        throw new Error(
          "[entity-graph-sync/yjs] WebRTC transport requires the optional peer dependency 'y-webrtc'. " +
            "Install it with `pnpm add y-webrtc`.",
          { cause },
        );
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Per-type doc setup
  // ---------------------------------------------------------------------------

  function getEntityMap(doc: YDocLike, id: EntityId): YMapLike<unknown> {
    // Two-level: root map → entity-id map
    const root = doc.getMap<YMapLike<unknown>>("entities");
    let entityMap = root.get(id);
    if (!entityMap) {
      // Yjs auto-creates nested maps; use a fresh Y.Map stored under the id.
      // We lazily access via the root map — if not present, the first set()
      // call on `root` with a sub-map value initialises it.
      // Because we can't create YMapLike directly here without Y.Doc, we
      // delegate: callers should set() directly on a sub-map returned by
      // doc.getMap(`entities/${id}`).
      return doc.getMap<unknown>(`entities/${id}`) as unknown as YMapLike<unknown>;
    }
    return entityMap;
  }

  function setupTypeDoc(type: EntityType, onPeerChange: PeerChangeHandler): void {
    if (!YDocCtor) throw new Error("[entity-graph-sync/yjs] Modules not loaded.");

    const doc = new YDocCtor();
    docs.set(type, doc);

    // Attach transport providers.
    if ((transport === "websocket" || transport === "both") && WsProviderCtor && opts.wsServerUrl) {
      const ws = new WsProviderCtor(opts.wsServerUrl, entityRoomName(roomPrefix, type), doc);
      wsProviders.set(type, ws);
    }
    if ((transport === "webrtc" || transport === "both") && RtcProviderCtor) {
      const rtc = new RtcProviderCtor(
        entityRoomName(roomPrefix, type),
        doc,
        opts.webrtcOpts,
      );
      rtcProviders.set(type, rtc);
    }

    // Observe the root "entities" map for new or updated entity entries.
    // When a remote peer writes to doc.getMap("entities"), this fires.
    const rootMap = doc.getMap<YMapLike<unknown>>("entities");
    const rootObserver = (event: YMapEventLike): void => {
      // Skip changes that originated locally (we already have them in the graph).
      if (event.transaction.origin === LOCAL_ORIGIN) return;

      const changes: Array<{ id: EntityId; fields: Record<string, unknown> }> = [];
      for (const id of event.keysChanged) {
        const entityMap = rootMap.get(id);
        if (entityMap && typeof entityMap.toJSON === "function") {
          changes.push({ id, fields: entityMap.toJSON() as Record<string, unknown> });
        }
      }
      if (changes.length > 0) {
        onPeerChange(
          changes.map(({ id, fields }) => ({ type, id, fields, updatedAt: Date.now() })),
        );
      }
    };
    rootMap.observe(rootObserver);
    observers.set(type, rootObserver);
  }

  // ---------------------------------------------------------------------------
  // SyncProvider implementation
  // ---------------------------------------------------------------------------

  return {
    name: `yjs(${transport})`,

    async start(entityTypes, onPeerChange) {
      if (started) return;
      started = true;
      currentOnPeerChange = onPeerChange;

      await loadModules();

      for (const type of entityTypes) {
        setupTypeDoc(type, onPeerChange);
      }
    },

    pushLocalChange(type, id, fields) {
      const doc = docs.get(type);
      if (!doc) return;

      // Write using LOCAL_ORIGIN so the observer knows to skip the echo.
      // Yjs transactions let us tag the origin.
      const entityMap = doc.getMap<unknown>(`entities/${id}`);
      for (const [key, value] of Object.entries(fields)) {
        entityMap.set(key, value);
      }
    },

    stop() {
      started = false;
      currentOnPeerChange = null;
      for (const [type, doc] of docs) {
        const rootMap = doc.getMap<YMapLike<unknown>>("entities");
        const obs = observers.get(type);
        if (obs) rootMap.unobserve(obs);
        wsProviders.get(type)?.destroy();
        rtcProviders.get(type)?.destroy();
        doc.destroy();
      }
      docs.clear();
      wsProviders.clear();
      rtcProviders.clear();
      observers.clear();
    },

    getDoc(type) {
      return docs.get(type);
    },
  };
}
