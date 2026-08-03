/**
 * Compatibility constants retained for consumers of the alpha package.
 *
 * Command functions and payload types are generated from Rust in
 * `generated-bindings.ts`; only these aggregate name maps remain hand-authored.
 */
export const GENERATED_COMMANDS = {
  graphUpsertEntity: "plugin:entity-graph-tauri|graph_upsert_entity",
  graphRemoveEntity: "plugin:entity-graph-tauri|graph_remove_entity",
  graphPatchEntity: "plugin:entity-graph-tauri|graph_patch_entity",
  graphSetList: "plugin:entity-graph-tauri|graph_set_list",
  graphGetEntity: "plugin:entity-graph-tauri|graph_get_entity",
  graphGetList: "plugin:entity-graph-tauri|graph_get_list",
  graphPlatformPing: "plugin:entity-graph-tauri|graph_platform_ping",
  graphPersistSnapshot: "plugin:entity-graph-tauri|graph_persist_snapshot",
  graphRestoreSnapshot: "plugin:entity-graph-tauri|graph_restore_snapshot",
  graphClear: "plugin:entity-graph-tauri|graph_clear",
} as const;

export const GENERATED_EVENTS = {
  entityChanged: "plugin:entity-graph-tauri:entity-changed",
  snapshotPersisted: "plugin:entity-graph-tauri:snapshot-persisted",
  snapshotRestored: "plugin:entity-graph-tauri:snapshot-restored",
  pluginError: "plugin:entity-graph-tauri:error",
} as const;
