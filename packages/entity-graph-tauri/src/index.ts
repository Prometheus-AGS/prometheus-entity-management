/**
 * @prometheus-ags/entity-graph-tauri
 *
 * Tauri v2 plugin: Rust crate exposing entity-graph commands and events with
 * tauri-specta v2 generating TypeScript bindings; extends the core
 * tauri-sql-persistence adapter for SQLite-backed snapshot persistence.
 *
 * ## Quick start
 *
 * ```ts
 * import { invoke } from "@tauri-apps/api/core";
 * import { listen } from "@tauri-apps/api/event";
 * import { createTauriGraphPlugin } from "@prometheus-ags/entity-graph-tauri";
 *
 * // Call once at app startup (e.g. in main.ts / App.svelte onMount)
 * const plugin = await createTauriGraphPlugin({
 *   invoke,
 *   listen,
 *   options: { storageKey: "my-app:graph", autoRestore: true },
 * });
 *
 * // Fire a command
 * await plugin.commands.upsertEntity({
 *   entityType: "User",
 *   entityId: "u-1",
 *   data: { name: "Alice", email: "alice@example.com" },
 * });
 *
 * // Cleanup on unload
 * window.addEventListener("beforeunload", () => plugin.dispose());
 * ```
 *
 * ## Rust side
 *
 * Register the plugin in your Tauri app's `lib.rs`:
 *
 * ```rust
 * use entity_graph_tauri::EntityGraphPlugin;
 *
 * tauri::Builder::default()
 *     .plugin(EntityGraphPlugin::new())
 *     .run(tauri::generate_context!())
 *     .expect("error running tauri app");
 * ```
 */

// ── Plugin (high-level entry point) ───────────────────────────────────────────
export { TauriGraphPlugin, createTauriGraphPlugin } from "./plugin";
export type { GraphCommands, TauriGraphPluginInit } from "./plugin";

// ── Commands (typed IPC wrappers) ─────────────────────────────────────────────
export {
  upsertEntity,
  removeEntity,
  patchEntity,
  setList,
  getEntity,
  getList,
  platformPing,
  persistSnapshot,
  restoreSnapshot,
  clearGraph,
} from "./commands";

// ── Events (typed event listeners) ────────────────────────────────────────────
export {
  listenEntityChanged,
  listenSnapshotPersisted,
  listenSnapshotRestored,
  listenPluginError,
  listenAllEvents,
  EVT_ENTITY_CHANGED,
  EVT_SNAPSHOT_PERSISTED,
  EVT_SNAPSHOT_RESTORED,
  EVT_PLUGIN_ERROR,
} from "./events";
export type { AllEventListeners } from "./events";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  UpsertEntityPayload,
  RemoveEntityPayload,
  PatchEntityPayload,
  SetListPayload,
  PersistSnapshotPayload,
  RestoreSnapshotPayload,
  EntityChangedEvent,
  SnapshotPersistedEvent,
  SnapshotRestoredEvent,
  GraphPluginErrorEvent,
  TauriInvokeFn,
  TauriListenFn,
  TauriGraphPluginOptions,
  PlatformPing,
} from "./types";

// ── Generated bindings (tauri-specta output) ─────────────────────────────────
export {
  generatedCommands,
  generatedEvents,
  PLUGIN_NAME,
} from "./generated-public";
export type {
  EntityChangedEvent as RustEntityChangedEvent,
  SnapshotPersistedEvent as RustSnapshotPersistedEvent,
  SnapshotRestoredEvent as RustSnapshotRestoredEvent,
  GraphPluginErrorEvent as RustGraphPluginErrorEvent,
  GetEntityResult,
  GetListResult,
  PlatformPing as RustPlatformPing,
  RestoreSnapshotResult,
  UpsertEntityPayload as RustUpsertEntityPayload,
  RemoveEntityPayload as RustRemoveEntityPayload,
  PatchEntityPayload as RustPatchEntityPayload,
  SetListPayload as RustSetListPayload,
  PersistSnapshotPayload as RustPersistSnapshotPayload,
  RestoreSnapshotPayload as RustRestoreSnapshotPayload,
} from "./generated-bindings";

// ── Alpha compatibility maps ─────────────────────────────────────────────────
export {
  GENERATED_COMMANDS,
  GENERATED_EVENTS,
} from "./generated-compat";
