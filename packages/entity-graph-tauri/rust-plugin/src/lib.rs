//! lib.rs
//!
//! `EntityGraphPlugin` — the Tauri v2 plugin entry point.
//!
//! Register in your app's `lib.rs`:
//!
//! ```rust,no_run,ignore
//! use entity_graph_tauri::EntityGraphPlugin;
//!
//! tauri::Builder::default()
//!     .plugin(EntityGraphPlugin::new())
//!     .run(tauri::generate_context!())
//!     .expect("error while running tauri application");
//! ```
//!
//! ## tauri-specta binding generation
//!
//! Run `cargo build --features generate-bindings` to regenerate
//! `../src/generated-bindings.ts`.

pub mod commands;
pub mod state;
pub mod types;

use tauri::{
    generate_handler,
    plugin::{Builder as PluginBuilder, TauriPlugin},
    Manager, Runtime,
};

use commands::{
    graph_clear, graph_get_entity, graph_get_list, graph_patch_entity, graph_persist_snapshot,
    graph_remove_entity, graph_restore_snapshot, graph_set_list, graph_upsert_entity,
};
use state::GraphPluginState;

/// The plugin name used for IPC routing.
const PLUGIN_NAME: &str = "entity_graph";

/// Tauri v2 plugin exposing the entity-graph command + event surface.
pub struct EntityGraphPlugin;

impl EntityGraphPlugin {
    /// Create and return the plugin, ready to be passed to `tauri::Builder::plugin()`.
    pub fn new<R: Runtime>() -> TauriPlugin<R> {
        // Binding generation uses tauri::Wry as the concrete runtime type —
        // this is the standard pattern for tauri-specta in library crates.
        #[cfg(feature = "generate-bindings")]
        {
            use specta_typescript::{BigIntExportBehavior, Typescript};
            let specta_builder = tauri_specta::Builder::<tauri::Wry>::new()
                .commands(tauri_specta::collect_commands![
                    graph_upsert_entity,
                    graph_remove_entity,
                    graph_patch_entity,
                    graph_set_list,
                    graph_get_entity,
                    graph_get_list,
                    graph_clear,
                    graph_persist_snapshot::<tauri::Wry>,
                    graph_restore_snapshot::<tauri::Wry>,
                ]);

            let out_path = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("../src/generated-bindings.ts");
            specta_builder
                .export(
                    Typescript::default()
                        .bigint(BigIntExportBehavior::Number)
                        .header("// @generated — do not edit manually"),
                    &out_path,
                )
                .expect("failed to export tauri-specta TypeScript bindings");
        }

        // The actual runtime handler uses `generate_handler!` which works
        // with any `R: Runtime` and doesn't require specta annotations.
        PluginBuilder::new(PLUGIN_NAME)
            .setup(|app, _api| {
                app.manage(GraphPluginState::new());
                Ok(())
            })
            .invoke_handler(generate_handler![
                graph_upsert_entity,
                graph_remove_entity,
                graph_patch_entity,
                graph_set_list,
                graph_get_entity,
                graph_get_list,
                graph_persist_snapshot,
                graph_restore_snapshot,
                graph_clear,
            ])
            .build()
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use crate::state::GraphPluginState;

    #[tokio::test]
    async fn upsert_and_get_entity_roundtrip() {
        let state = GraphPluginState::new();
        let mut data = std::collections::HashMap::new();
        data.insert("name".to_owned(), serde_json::json!("Alice"));

        state.upsert_entity("User", "u-1", data).await;

        let retrieved = state.get_entity("User", "u-1").await;
        assert!(retrieved.is_some());
        assert_eq!(retrieved.unwrap()["name"], serde_json::json!("Alice"));
    }

    #[tokio::test]
    async fn remove_entity_clears_entry() {
        let state = GraphPluginState::new();
        let mut data = std::collections::HashMap::new();
        data.insert("title".to_owned(), serde_json::json!("Hello"));

        state.upsert_entity("Post", "p-1", data).await;
        state.remove_entity("Post", "p-1").await;

        assert!(state.get_entity("Post", "p-1").await.is_none());
    }

    #[tokio::test]
    async fn set_and_get_list_roundtrip() {
        let state = GraphPluginState::new();
        state
            .set_list("posts:all", vec!["p-1".into(), "p-2".into()], Some(2))
            .await;

        let entry = state.get_list("posts:all").await.unwrap();
        assert_eq!(entry.ids, vec!["p-1", "p-2"]);
        assert_eq!(entry.total, Some(2));
    }

    #[tokio::test]
    async fn get_nonexistent_entity_returns_none() {
        let state = GraphPluginState::new();
        assert!(state.get_entity("Ghost", "g-1").await.is_none());
    }

    #[tokio::test]
    async fn snapshot_roundtrip() {
        let state = GraphPluginState::new();
        let snap = r#"{"entities":{},"patches":{}}"#.to_owned();
        state.set_snapshot("test:key", snap.clone()).await;

        let retrieved = state.get_snapshot("test:key").await.unwrap();
        assert_eq!(retrieved, snap);
    }

    #[tokio::test]
    async fn clear_entities_empties_map() {
        let state = GraphPluginState::new();
        let mut data = std::collections::HashMap::new();
        data.insert("x".to_owned(), serde_json::json!(1));
        state.upsert_entity("T", "1", data).await;
        state.clear_entities().await;
        assert!(state.get_entity("T", "1").await.is_none());
    }
}
