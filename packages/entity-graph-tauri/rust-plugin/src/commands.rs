//! commands.rs
//!
//! Every `#[tauri::command]` exposed by the entity-graph plugin.
//!
//! Every command is annotated with `#[specta::specta]` and registered in the
//! tauri-specta collection so TypeScript bindings are generated from Rust.
//!
//! Naming convention: Tauri surfaces these as
//!   `plugin:entity-graph-tauri|<fn_name>`
//! matching the plugin name registered in `lib.rs`.

use tauri::{AppHandle, Emitter, Runtime, State};

use crate::state::GraphPluginState;
use crate::types::{
    GetEntityResult, GetListResult, PatchEntityPayload, PersistSnapshotPayload, PlatformPing,
    RemoveEntityPayload, RestoreSnapshotPayload, RestoreSnapshotResult, SetListPayload,
    SnapshotPersistedEvent, SnapshotRestoredEvent, UpsertEntityPayload,
};
use crate::EntityGraphExt;

// ── Commands registered with specta (no generic AppHandle) ───────────────────

/// Upsert an entity into the plugin's in-memory mirror.
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_upsert_entity(
    state: State<'_, GraphPluginState>,
    payload: UpsertEntityPayload,
) -> Result<(), String> {
    state
        .upsert_entity(&payload.entity_type, &payload.entity_id, payload.data)
        .await;
    Ok(())
}

/// Remove an entity from the plugin's in-memory mirror.
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_remove_entity(
    state: State<'_, GraphPluginState>,
    payload: RemoveEntityPayload,
) -> Result<(), String> {
    state
        .remove_entity(&payload.entity_type, &payload.entity_id)
        .await;
    Ok(())
}

/// Record a UI-only patch overlay (acknowledged but not mirrored on Rust side).
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_patch_entity(
    _state: State<'_, GraphPluginState>,
    _payload: PatchEntityPayload,
) -> Result<(), String> {
    Ok(())
}

/// Set the ordered ID array for a list query key.
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_set_list(
    state: State<'_, GraphPluginState>,
    payload: SetListPayload,
) -> Result<(), String> {
    state
        .set_list(&payload.query_key, payload.ids, payload.total)
        .await;
    Ok(())
}

/// Read a single entity from the in-memory mirror.
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_get_entity(
    state: State<'_, GraphPluginState>,
    entity_type: String,
    entity_id: String,
) -> Result<GetEntityResult, String> {
    let data = state.get_entity(&entity_type, &entity_id).await;
    Ok(GetEntityResult { data })
}

/// Read a list from the in-memory mirror.
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_get_list(
    state: State<'_, GraphPluginState>,
    query_key: String,
) -> Result<GetListResult, String> {
    match state.get_list(&query_key).await {
        Some(entry) => Ok(GetListResult {
            ids: entry.ids,
            total: entry.total,
        }),
        None => Ok(GetListResult {
            ids: vec![],
            total: None,
        }),
    }
}

/// Invoke the registered desktop, Android, or iOS native bridge.
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub fn graph_platform_ping<R: Runtime>(app: AppHandle<R>) -> Result<PlatformPing, String> {
    app.entity_graph().ping().map_err(|error| error.to_string())
}

/// Clear all entities and lists from the in-memory mirror.
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_clear(state: State<'_, GraphPluginState>) -> Result<(), String> {
    state.clear_entities().await;
    state.clear_lists().await;
    Ok(())
}

// ── Snapshot commands (generic over the host runtime) ────────────────────────

/// Persist a JSON-serialised graph snapshot to the in-memory store and emit
/// a `SnapshotPersistedEvent`.
///
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_persist_snapshot<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, GraphPluginState>,
    payload: PersistSnapshotPayload,
) -> Result<(), String> {
    let key = payload
        .storage_key
        .unwrap_or_else(|| "entity-graph:snapshot".to_owned());

    let byte_size = payload.snapshot.len();
    state.set_snapshot(&key, payload.snapshot).await;

    let now = monotonic_ts();
    let _ = app.emit(
        "plugin:entity-graph-tauri:snapshot-persisted",
        SnapshotPersistedEvent {
            storage_key: key,
            persisted_at: now,
            byte_size,
        },
    );

    Ok(())
}

/// Return a previously persisted snapshot string and emit a
/// `SnapshotRestoredEvent`.
///
#[tauri::command]
#[cfg_attr(feature = "generate-bindings", specta::specta)]
pub async fn graph_restore_snapshot<R: Runtime>(
    app: AppHandle<R>,
    state: State<'_, GraphPluginState>,
    payload: RestoreSnapshotPayload,
) -> Result<RestoreSnapshotResult, String> {
    let key = payload
        .storage_key
        .unwrap_or_else(|| "entity-graph:snapshot".to_owned());

    let snapshot = state.get_snapshot(&key).await;

    if snapshot.is_some() {
        let now = monotonic_ts();
        let _ = app.emit(
            "plugin:entity-graph-tauri:snapshot-restored",
            SnapshotRestoredEvent {
                storage_key: key,
                restored_at: now,
            },
        );
    }

    Ok(RestoreSnapshotResult { snapshot })
}

// ── Utility ───────────────────────────────────────────────────────────────────

fn monotonic_ts() -> String {
    use std::time::{SystemTime, UNIX_EPOCH};
    let ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis();
    format!("{ms}")
}
