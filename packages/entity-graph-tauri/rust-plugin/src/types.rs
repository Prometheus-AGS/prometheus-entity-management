//! types.rs
//!
//! Serde + specta::Type annotated payload and event shapes for the
//! entity-graph Tauri plugin.  Every public type here has a corresponding
//! counterpart in `../../src/generated-bindings.ts`; tauri-specta keeps them
//! in sync when `cargo build --features generate-bindings` is run.

use serde::{Deserialize, Serialize};
use specta::Type;
use std::collections::HashMap;

/// Opaque JSON value used for entity data fields.
pub type JsonObject = HashMap<String, serde_json::Value>;

// ── Command payloads ──────────────────────────────────────────────────────────

/// Payload for the `graph_upsert_entity` command.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct UpsertEntityPayload {
    pub entity_type: String,
    pub entity_id: String,
    pub data: JsonObject,
}

/// Payload for the `graph_remove_entity` command.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RemoveEntityPayload {
    pub entity_type: String,
    pub entity_id: String,
}

/// Payload for the `graph_patch_entity` command (UI-only overlay — not stored
/// in the canonical entity table, but tracked by the plugin for devtools).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PatchEntityPayload {
    pub entity_type: String,
    pub entity_id: String,
    pub patch: JsonObject,
}

/// Payload for the `graph_set_list` command.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SetListPayload {
    pub query_key: String,
    pub ids: Vec<String>,
    pub total: Option<i64>,
    pub next_cursor: Option<String>,
    pub has_next_page: bool,
}

/// Payload for `graph_persist_snapshot` — serialised graph state sent from TS.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct PersistSnapshotPayload {
    pub storage_key: Option<String>,
    /// JSON-serialised `GraphSnapshotPayload` produced by the TS layer.
    pub snapshot: String,
}

/// Payload for `graph_restore_snapshot` — requests Rust to return stored data.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RestoreSnapshotPayload {
    pub storage_key: Option<String>,
}

/// Returned by `graph_restore_snapshot` with the raw snapshot string.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct RestoreSnapshotResult {
    pub snapshot: Option<String>,
}

/// Returned by `graph_get_entity`.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GetEntityResult {
    pub data: Option<JsonObject>,
}

/// Returned by `graph_get_list`.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GetListResult {
    pub ids: Vec<String>,
    pub total: Option<i64>,
}

// ── Event payloads (Rust → TS) ────────────────────────────────────────────────

/// Emitted via `entity-graph://entity-changed` when an entity is mutated on
/// the Rust side (e.g. by an IPC command from another window, or a background
/// task).
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct EntityChangedEvent {
    pub entity_type: String,
    pub entity_id: String,
    pub operation: EntityOperation,
    pub data: Option<JsonObject>,
}

/// The three mutation kinds that can arrive over the event channel.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "lowercase")]
pub enum EntityOperation {
    Upsert,
    Remove,
    Patch,
}

/// Emitted after a successful `graph_persist_snapshot`.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SnapshotPersistedEvent {
    pub storage_key: String,
    /// ISO-8601 timestamp.
    pub persisted_at: String,
    pub byte_size: usize,
}

/// Emitted after a successful `graph_restore_snapshot`.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct SnapshotRestoredEvent {
    pub storage_key: String,
    /// ISO-8601 timestamp.
    pub restored_at: String,
}

/// Emitted on plugin-level errors.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct GraphPluginErrorEvent {
    pub code: String,
    pub message: String,
    pub context: Option<JsonObject>,
}
