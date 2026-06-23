/**
 * types.ts — SyncProvider interface and supporting types for entity-graph-sync.
 *
 * Design goals:
 * - The SyncProvider is a thin adapter contract. Providers never touch the
 *   graph directly; they receive a write callback and call it when remote
 *   peers produce updates.
 * - "Entity-type scoping": each registered provider is responsible for one
 *   or more entity types. The registry maps type → provider.
 * - Transport is a provider concern — Yjs uses WebSocket / WebRTC;
 *   Loro exports binary snapshots over any channel. The interface is
 *   deliberately transport-agnostic.
 */

import type { EntityId, EntityType } from "@prometheus-ags/entity-graph-core";

// ---------------------------------------------------------------------------
// Core change shape that flows between providers and the graph bridge
// ---------------------------------------------------------------------------

/** Atomic field-level change originated by a remote peer. */
export interface PeerEntityChange {
  /** Entity kind (e.g. `"Document"`, `"Task"`). */
  type: EntityType;
  /** Entity id within the type partition. */
  id: EntityId;
  /**
   * Partial or full field snapshot. Providers MUST include at minimum the
   * fields they know changed; the graph bridge applies them via `upsertEntity`.
   */
  fields: Record<string, unknown>;
  /**
   * Wall-clock ms when the change was produced on the remote peer.
   * Optional — providers emit it when the underlying CRDT carries it.
   */
  updatedAt?: number;
}

/** Called by a provider when peers produce changes the local graph should apply. */
export type PeerChangeHandler = (changes: PeerEntityChange[]) => void;

// ---------------------------------------------------------------------------
// Provider interface
// ---------------------------------------------------------------------------

/**
 * Every sync provider MUST implement this interface.
 *
 * Lifecycle:
 *   1. `start(entityTypes, onPeerChange)` — connect and begin syncing the
 *      given entity types. Subscribe to remote changes and call
 *      `onPeerChange` whenever peers update entities.
 *   2. `pushLocalChange(type, id, fields)` — called by the graph bridge
 *      whenever the local graph upserts an entity that belongs to this
 *      provider. Providers push the delta to connected peers.
 *   3. `stop()` — disconnect and clean up all resources.
 *
 * Optional extras:
 *   - `getDoc(type, id)` — providers that expose raw CRDT documents (e.g.
 *     Yjs) may implement this for advanced consumers.
 */
export interface SyncProvider {
  /** Human-readable name used in devtools and error messages. */
  readonly name: string;

  /**
   * Connect to the sync fabric and start receiving peer changes for the
   * listed entity types.
   *
   * @param entityTypes - The set of entity type strings this provider is
   *   responsible for (as registered with `registerSyncProvider`).
   * @param onPeerChange - Callback the provider MUST invoke when peers
   *   send updates. May be batched; the bridge handles debouncing.
   */
  start(entityTypes: ReadonlyArray<EntityType>, onPeerChange: PeerChangeHandler): Promise<void>;

  /**
   * Push a local graph write to connected peers. Called by the bridge after
   * `upsertEntity` / `replaceEntity` fires for a managed entity type.
   *
   * Providers MUST be idempotent: they receive the same entity data they
   * already wrote to the CRDT (the bridge does not diff), so a set() call
   * on an already-set key is safe.
   *
   * @param type - Entity type.
   * @param id - Entity id.
   * @param fields - Current canonical fields from the graph (full snapshot
   *   or partial — see provider docs).
   */
  pushLocalChange(type: EntityType, id: EntityId, fields: Record<string, unknown>): void;

  /**
   * Tear down all network connections, subscriptions, and internal state.
   * After `stop()` the provider MUST NOT call `onPeerChange` again.
   */
  stop(): void;

  /**
   * Optional: expose the raw CRDT document for a specific entity.
   * Yjs provider returns the `Y.Doc`; Loro returns the `LoroDoc`.
   * Return type is `unknown` to avoid forcing consumers to import the CRDT lib.
   */
  getDoc?: (type: EntityType, id: EntityId) => unknown | undefined;
}

// ---------------------------------------------------------------------------
// Registry shape — one provider per entity type
// ---------------------------------------------------------------------------

/** Options accepted by `registerSyncProvider`. */
export interface RegisterSyncProviderOptions {
  /**
   * Entity types this provider manages. At least one type required.
   * Registering a type that already has a provider replaces the prior
   * registration (useful in tests; a footgun in production).
   */
  entityTypes: ReadonlyArray<EntityType>;
  /** The provider instance. */
  provider: SyncProvider;
}

// ---------------------------------------------------------------------------
// Bridge options
// ---------------------------------------------------------------------------

/** Options passed to `startSyncBridge`. */
export interface SyncBridgeOptions {
  /**
   * Debounce window in ms for coalescing rapid local changes before pushing
   * to providers. `0` disables debouncing (synchronous push).
   * Default: 16 (one animation frame).
   */
  pushDebounceMs?: number;
}

/** Handle returned by `startSyncBridge`. */
export interface SyncBridgeHandle {
  /** Stop all registered providers and unsubscribe from the graph. */
  stop: () => void;
}
