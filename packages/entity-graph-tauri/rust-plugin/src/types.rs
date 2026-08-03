//! types.rs
//!
//! Serde + specta::Type annotated payload and event shapes for the
//! entity-graph Tauri plugin. Tauri Specta generates the TypeScript command
//! surface from these types via the package's `build:bindings` script.

use serde::{Deserialize, Serialize};
#[cfg(feature = "generate-bindings")]
use specta::Type;
#[cfg(feature = "generate-bindings")]
use specta_typescript::Unknown;
use std::collections::HashMap;

/// Opaque JSON value used for entity data fields.
pub type JsonObject = HashMap<String, serde_json::Value>;

/// Returned by the native desktop/Android/iOS smoke command.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct PlatformPing {
    pub plugin: String,
    pub platform: String,
}

// ── Command payloads ──────────────────────────────────────────────────────────

/// Payload for the `graph_upsert_entity` command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct UpsertEntityPayload {
    pub entity_type: String,
    pub entity_id: String,
    #[cfg_attr(feature = "generate-bindings", specta(type = HashMap<String, Unknown>))]
    pub data: JsonObject,
}

/// Payload for the `graph_remove_entity` command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct RemoveEntityPayload {
    pub entity_type: String,
    pub entity_id: String,
}

/// Payload for the `graph_patch_entity` command (UI-only overlay — not stored
/// in the canonical entity table, but tracked by the plugin for devtools).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct PatchEntityPayload {
    pub entity_type: String,
    pub entity_id: String,
    #[cfg_attr(feature = "generate-bindings", specta(type = HashMap<String, Unknown>))]
    pub patch: JsonObject,
}

/// Payload for the `graph_set_list` command.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct SetListPayload {
    pub query_key: String,
    pub ids: Vec<String>,
    pub total: Option<i64>,
    pub next_cursor: Option<String>,
    pub has_next_page: bool,
}

/// Payload for `graph_persist_snapshot` — serialised graph state sent from TS.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct PersistSnapshotPayload {
    pub storage_key: Option<String>,
    /// JSON-serialised `GraphSnapshotPayload` produced by the TS layer.
    pub snapshot: String,
}

/// Payload for `graph_restore_snapshot` — requests Rust to return stored data.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct RestoreSnapshotPayload {
    pub storage_key: Option<String>,
}

/// Returned by `graph_restore_snapshot` with the raw snapshot string.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct RestoreSnapshotResult {
    pub snapshot: Option<String>,
}

/// Returned by `graph_get_entity`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct GetEntityResult {
    #[cfg_attr(
        feature = "generate-bindings",
        specta(type = Option<HashMap<String, Unknown>>)
    )]
    pub data: Option<JsonObject>,
}

/// Returned by `graph_get_list`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "camelCase")]
pub struct GetListResult {
    pub ids: Vec<String>,
    pub total: Option<i64>,
}

// ── Event payloads (Rust → TS) ────────────────────────────────────────────────

/// Emitted when an entity is mutated on
/// the Rust side (e.g. by an IPC command from another window, or a background
/// task).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type, tauri_specta::Event))]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "generate-bindings",
    tauri_specta(event_name = "entity-changed")
)]
pub struct EntityChangedEvent {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: EntityOperation,
    #[cfg_attr(
        feature = "generate-bindings",
        specta(type = Option<HashMap<String, Unknown>>)
    )]
    pub data: Option<JsonObject>,
}

/// The three mutation kinds that can arrive over the event channel.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type))]
#[serde(rename_all = "lowercase")]
pub enum EntityOperation {
    Upsert,
    Remove,
    Patch,
}

/// Emitted after a successful `graph_persist_snapshot`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type, tauri_specta::Event))]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "generate-bindings",
    tauri_specta(event_name = "snapshot-persisted")
)]
pub struct SnapshotPersistedEvent {
    pub storage_key: String,
    /// ISO-8601 timestamp.
    pub persisted_at: String,
    pub byte_size: usize,
}

/// Emitted after a successful `graph_restore_snapshot`.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type, tauri_specta::Event))]
#[serde(rename_all = "camelCase")]
#[cfg_attr(
    feature = "generate-bindings",
    tauri_specta(event_name = "snapshot-restored")
)]
pub struct SnapshotRestoredEvent {
    pub storage_key: String,
    /// ISO-8601 timestamp.
    pub restored_at: String,
}

/// Emitted on plugin-level errors.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[cfg_attr(feature = "generate-bindings", derive(Type, tauri_specta::Event))]
#[serde(rename_all = "camelCase")]
#[cfg_attr(feature = "generate-bindings", tauri_specta(event_name = "error"))]
pub struct GraphPluginErrorEvent {
    pub code: String,
    pub message: String,
    #[cfg_attr(
        feature = "generate-bindings",
        specta(type = Option<HashMap<String, Unknown>>)
    )]
    pub context: Option<JsonObject>,
}
