/**
 * events.ts
 *
 * Typed wrappers around every Tauri event emitted by the Rust plugin.
 *
 * The Rust plugin uses tauri-specta v2 `EventCollection` to register events
 * so their names and payload shapes are type-safe on both sides. These TS
 * wrappers subscribe to those events and apply the appropriate graph store
 * mutations, keeping the TS store in sync with Rust-side state changes.
 *
 * Returned unsubscribe handles should be called on component/plugin teardown
 * to avoid memory leaks.
 */

import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import type {
  EntityChangedEvent,
  SnapshotPersistedEvent,
  SnapshotRestoredEvent,
  GraphPluginErrorEvent,
  TauriListenFn,
} from "./types";

// ── Event name constants (match Rust side exactly) ───────────────────────────

export const EVT_ENTITY_CHANGED = "entity-graph://entity-changed";
export const EVT_SNAPSHOT_PERSISTED = "entity-graph://snapshot-persisted";
export const EVT_SNAPSHOT_RESTORED = "entity-graph://snapshot-restored";
export const EVT_PLUGIN_ERROR = "entity-graph://error";

// ── Event subscriptions ──────────────────────────────────────────────────────

/**
 * Subscribe to `entity-changed` events from the Rust plugin.
 *
 * Automatically writes upsert/remove/patch operations into the TS graph store
 * so all reactive subscribers (hooks, stores) are notified immediately.
 *
 * @returns Promise resolving to an unsubscribe function.
 */
export async function listenEntityChanged(
  listen: TauriListenFn,
  onEvent?: (event: EntityChangedEvent) => void,
): Promise<() => void> {
  return listen<EntityChangedEvent>(EVT_ENTITY_CHANGED, ({ payload }) => {
    const store = useGraphStore.getState();

    switch (payload.operation) {
      case "upsert":
        if (payload.data) {
          store.upsertEntity(payload.entityType, payload.entityId, payload.data);
        }
        break;
      case "remove":
        store.removeEntity(payload.entityType, payload.entityId);
        break;
      case "patch":
        if (payload.data) {
          store.patchEntity(payload.entityType, payload.entityId, payload.data);
        }
        break;
    }

    onEvent?.(payload);
  });
}

/**
 * Subscribe to `snapshot-persisted` events.
 * Useful for surfacing save confirmations in UI or devtools.
 *
 * @returns Promise resolving to an unsubscribe function.
 */
export async function listenSnapshotPersisted(
  listen: TauriListenFn,
  onEvent: (event: SnapshotPersistedEvent) => void,
): Promise<() => void> {
  return listen<SnapshotPersistedEvent>(EVT_SNAPSHOT_PERSISTED, ({ payload }) => {
    onEvent(payload);
  });
}

/**
 * Subscribe to `snapshot-restored` events.
 *
 * @returns Promise resolving to an unsubscribe function.
 */
export async function listenSnapshotRestored(
  listen: TauriListenFn,
  onEvent: (event: SnapshotRestoredEvent) => void,
): Promise<() => void> {
  return listen<SnapshotRestoredEvent>(EVT_SNAPSHOT_RESTORED, ({ payload }) => {
    onEvent(payload);
  });
}

/**
 * Subscribe to plugin-level error events from the Rust side.
 *
 * @returns Promise resolving to an unsubscribe function.
 */
export async function listenPluginError(
  listen: TauriListenFn,
  onEvent: (event: GraphPluginErrorEvent) => void,
): Promise<() => void> {
  return listen<GraphPluginErrorEvent>(EVT_PLUGIN_ERROR, ({ payload }) => {
    onEvent(payload);
  });
}

// ── Composite helper ─────────────────────────────────────────────────────────

export interface AllEventListeners {
  onEntityChanged?: (event: EntityChangedEvent) => void;
  onSnapshotPersisted?: (event: SnapshotPersistedEvent) => void;
  onSnapshotRestored?: (event: SnapshotRestoredEvent) => void;
  onPluginError?: (event: GraphPluginErrorEvent) => void;
}

/**
 * Subscribe to all entity-graph plugin events at once.
 *
 * @returns Promise resolving to a single cleanup function that unsubscribes
 *   all event listeners.
 */
export async function listenAllEvents(
  listen: TauriListenFn,
  handlers: AllEventListeners = {},
): Promise<() => void> {
  const [
    unsubEntityChanged,
    unsubSnapshotPersisted,
    unsubSnapshotRestored,
    unsubPluginError,
  ] = await Promise.all([
    listenEntityChanged(listen, handlers.onEntityChanged),
    handlers.onSnapshotPersisted
      ? listenSnapshotPersisted(listen, handlers.onSnapshotPersisted)
      : Promise.resolve(() => undefined),
    handlers.onSnapshotRestored
      ? listenSnapshotRestored(listen, handlers.onSnapshotRestored)
      : Promise.resolve(() => undefined),
    handlers.onPluginError
      ? listenPluginError(listen, handlers.onPluginError)
      : Promise.resolve(() => undefined),
  ]);

  return () => {
    unsubEntityChanged();
    unsubSnapshotPersisted();
    unsubSnapshotRestored();
    unsubPluginError();
  };
}
