//! commands.rs
//!
//! Every `#[tauri::command]` exposed by the entity-graph plugin.
//!
//! Commands that do NOT take `AppHandle<R>` are annotated with
//! `#[specta::specta]` and registered in the tauri-specta collection so
//! TypeScript bindings can be auto-generated.
//!
//! Commands that DO take a generic `AppHandle<R>` parameter are registered
//! directly with the Tauri invoke handler (they still work as typed IPC) but
//! are excluded from the specta collection because specta's inner-function
//! expansion cannot capture outer generic parameters.  Their TS call
//! signatures are hand-authored in `generated-bindings.ts`.
//!
//! Naming convention: Tauri surfaces these as
//!   `plugin:entity_graph|<fn_name>`
//! matching the plugin name registered in `lib.rs`.

use tauri::{AppHandle, Emitter, Runtime, State};

use crate::state::GraphPluginState;
use crate::types::{
    GetEntityResult, GetListResult, PatchEntityPayload, PersistSnapshotPayload,
    RemoveEntityPayload, RestoreSnapshotPayload, RestoreSnapshotResult, SetListPayload,
    SnapshotPersistedEvent, SnapshotRestoredEvent, UpsertEntityPayload,
};

// ── Commands registered with specta (no generic AppHandle) ───────────────────

/// Upsert an entity into the plugin's in-memory mirror.
#[tauri::command]
#[specta::specta]
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
#[specta::specta]
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
#[specta::specta]
pub async fn graph_patch_entity(
    _state: State<'_, GraphPluginState>,
    _payload: PatchEntityPayload,
) -> Result<(), String> {
    Ok(())
}

/// Set the ordered ID array for a list query key.
#[tauri::command]
#[specta::specta]
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
#[specta::specta]
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
#[specta::specta]
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

/// Clear all entities and lists from the in-memory mirror.
#[tauri::command]
#[specta::specta]
pub async fn graph_clear(state: State<'_, GraphPluginState>) -> Result<(), String> {
    state.clear_entities().await;
    state.clear_lists().await;
    Ok(())
}

// ── Commands registered directly (generic AppHandle<R> — excluded from specta) ──

/// Persist a JSON-serialised graph snapshot to the in-memory store and emit
/// a `SnapshotPersistedEvent`.
///
/// NOTE: This command is NOT in the specta `collect_commands!` list because
/// the specta macro cannot capture the outer generic `R` parameter.  Its TS
/// signature is hand-authored in `generated-bindings.ts`.
#[tauri::command]
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
        "entity-graph://snapshot-persisted",
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
/// NOTE: excluded from specta `collect_commands!` for the same reason as
/// `graph_persist_snapshot`.
#[tauri::command]
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
            "entity-graph://snapshot-restored",
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
