/**
 * plugin.ts
 *
 * `TauriGraphPlugin` — the high-level entry point that:
 *   1. Wires event listeners from the Rust plugin → TS graph store.
 *   2. Optionally auto-restores a persisted snapshot on startup.
 *   3. Provides a convenience `commands` facade over the typed IPC calls.
 *
 * Usage:
 * ```ts
 * import { invoke } from "@tauri-apps/api/core";
 * import { listen } from "@tauri-apps/api/event";
 * import { TauriGraphPlugin } from "@prometheus-ags/entity-graph-tauri";
 *
 * const plugin = new TauriGraphPlugin({ invoke, listen });
 * await plugin.init();
 *
 * // Later:
 * await plugin.commands.upsertEntity({ entityType: "User", entityId: "1", data: { name: "Alice" } });
 * await plugin.dispose();
 * ```
 */

import type { TauriInvokeFn, TauriListenFn, TauriGraphPluginOptions } from "./types";
import {
  upsertEntity,
  removeEntity,
  patchEntity,
  setList,
  getEntity,
  getList,
  persistSnapshot,
  restoreSnapshot,
  clearGraph,
} from "./commands";
import { listenAllEvents } from "./events";
import type { AllEventListeners } from "./events";
import type {
  UpsertEntityPayload,
  RemoveEntityPayload,
  PatchEntityPayload,
  SetListPayload,
  PersistSnapshotPayload,
  RestoreSnapshotPayload,
} from "./types";

const DEFAULT_STORAGE_KEY = "entity-graph:snapshot";

/** Typed command facade bound to a specific `invoke` function. */
export interface GraphCommands {
  upsertEntity(payload: UpsertEntityPayload): Promise<void>;
  removeEntity(payload: RemoveEntityPayload): Promise<void>;
  patchEntity(payload: PatchEntityPayload): Promise<void>;
  setList(payload: SetListPayload): Promise<void>;
  getEntity(entityType: string, entityId: string): Promise<Record<string, unknown> | null>;
  getList(queryKey: string): Promise<{ ids: string[]; total: number | null } | null>;
  persistSnapshot(payload?: PersistSnapshotPayload): Promise<void>;
  restoreSnapshot(payload?: RestoreSnapshotPayload): Promise<void>;
  clearGraph(): Promise<void>;
}

export interface TauriGraphPluginInit {
  invoke: TauriInvokeFn;
  listen: TauriListenFn;
  options?: TauriGraphPluginOptions;
  eventHandlers?: AllEventListeners;
}

/**
 * High-level Tauri graph plugin that manages lifecycle: init, event wiring,
 * snapshot restore, and graceful dispose.
 */
export class TauriGraphPlugin {
  readonly commands: GraphCommands;

  private readonly invoke: TauriInvokeFn;
  private readonly listen: TauriListenFn;
  private readonly storageKey: string;
  private readonly autoRestore: boolean;
  private readonly eventHandlers: AllEventListeners;
  private unsubscribeEvents: (() => void) | null = null;
  private initialized = false;

  constructor({ invoke, listen, options = {}, eventHandlers = {} }: TauriGraphPluginInit) {
    this.invoke = invoke;
    this.listen = listen;
    this.storageKey = options.storageKey ?? DEFAULT_STORAGE_KEY;
    this.autoRestore = options.autoRestore ?? true;
    this.eventHandlers = eventHandlers;

    // Bind commands facade once so callers don't need to pass invoke each time.
    this.commands = {
      upsertEntity: (p) => upsertEntity(invoke, p),
      removeEntity: (p) => removeEntity(invoke, p),
      patchEntity: (p) => patchEntity(invoke, p),
      setList: (p) => setList(invoke, p),
      getEntity: (t, id) => getEntity(invoke, t, id),
      getList: (k) => getList(invoke, k),
      persistSnapshot: (p) => persistSnapshot(invoke, { storageKey: this.storageKey, ...p }),
      restoreSnapshot: (p) => restoreSnapshot(invoke, { storageKey: this.storageKey, ...p }),
      clearGraph: () => clearGraph(invoke),
    };
  }

  /**
   * Initialise the plugin: subscribe to all events and optionally restore the
   * persisted snapshot. Must be awaited before calling commands.
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Wire event listeners → graph store mutations.
    this.unsubscribeEvents = await listenAllEvents(this.listen, this.eventHandlers);

    // Auto-restore persisted snapshot.
    if (this.autoRestore) {
      try {
        await restoreSnapshot(this.invoke, { storageKey: this.storageKey });
      } catch {
        // Snapshot may not exist yet on first run — that is expected.
      }
    }

    this.initialized = true;
  }

  /**
   * Persist the current graph snapshot then unsubscribe all event listeners.
   * Call during app shutdown / component unmount.
   */
  async dispose(): Promise<void> {
    if (!this.initialized) return;

    try {
      await persistSnapshot(this.invoke, { storageKey: this.storageKey });
    } catch {
      // Best-effort persistence; don't throw on teardown.
    }

    this.unsubscribeEvents?.();
    this.unsubscribeEvents = null;
    this.initialized = false;
  }
}

/**
 * Factory convenience — equivalent to `new TauriGraphPlugin(init).init()`.
 *
 * @example
 * ```ts
 * import { invoke } from "@tauri-apps/api/core";
 * import { listen } from "@tauri-apps/api/event";
 *
 * const plugin = await createTauriGraphPlugin({ invoke, listen });
 * ```
 */
export async function createTauriGraphPlugin(
  init: TauriGraphPluginInit,
): Promise<TauriGraphPlugin> {
  const plugin = new TauriGraphPlugin(init);
  await plugin.init();
  return plugin;
}
