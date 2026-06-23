//! state.rs
//!
//! `GraphPluginState` — the Tauri-managed plugin state.
//!
//! Holds in-memory entity and list snapshots so the Rust side can serve
//! `graph_get_entity` / `graph_get_list` without a round-trip to SQLite.
//! The canonical source of truth is the TS graph store; this is a mirror
//! kept up-to-date by command handlers.

use std::collections::HashMap;
use tokio::sync::RwLock;

use crate::types::JsonObject;

/// Per-entity storage keyed by `(entity_type, entity_id)`.
pub type EntityMap = HashMap<(String, String), JsonObject>;

/// Per-list storage keyed by `query_key`.
#[derive(Debug, Default, Clone)]
pub struct ListEntry {
    pub ids: Vec<String>,
    pub total: Option<i64>,
}

pub type ListMap = HashMap<String, ListEntry>;

/// Per-snapshot storage keyed by `storage_key`.
pub type SnapshotMap = HashMap<String, String>;

/// Plugin-managed state, guarded by async `RwLock` for multi-window safety.
#[derive(Debug, Default)]
pub struct GraphPluginState {
    pub entities: RwLock<EntityMap>,
    pub lists: RwLock<ListMap>,
    pub snapshots: RwLock<SnapshotMap>,
}

impl GraphPluginState {
    pub fn new() -> Self {
        Self::default()
    }

    // ── Entity helpers ────────────────────────────────────────────────────────

    pub async fn upsert_entity(&self, entity_type: &str, entity_id: &str, data: JsonObject) {
        let mut guard = self.entities.write().await;
        let entry = guard
            .entry((entity_type.to_owned(), entity_id.to_owned()))
            .or_default();
        for (k, v) in data {
            entry.insert(k, v);
        }
    }

    pub async fn remove_entity(&self, entity_type: &str, entity_id: &str) {
        let mut guard = self.entities.write().await;
        guard.remove(&(entity_type.to_owned(), entity_id.to_owned()));
    }

    pub async fn get_entity(&self, entity_type: &str, entity_id: &str) -> Option<JsonObject> {
        let guard = self.entities.read().await;
        guard
            .get(&(entity_type.to_owned(), entity_id.to_owned()))
            .cloned()
    }

    pub async fn clear_entities(&self) {
        self.entities.write().await.clear();
    }

    // ── List helpers ──────────────────────────────────────────────────────────

    pub async fn set_list(&self, query_key: &str, ids: Vec<String>, total: Option<i64>) {
        let mut guard = self.lists.write().await;
        guard.insert(query_key.to_owned(), ListEntry { ids, total });
    }

    pub async fn get_list(&self, query_key: &str) -> Option<ListEntry> {
        let guard = self.lists.read().await;
        guard.get(query_key).cloned()
    }

    pub async fn clear_lists(&self) {
        self.lists.write().await.clear();
    }

    // ── Snapshot helpers ──────────────────────────────────────────────────────

    pub async fn set_snapshot(&self, key: &str, snapshot: String) {
        let mut guard = self.snapshots.write().await;
        guard.insert(key.to_owned(), snapshot);
    }

    pub async fn get_snapshot(&self, key: &str) -> Option<String> {
        let guard = self.snapshots.read().await;
        guard.get(key).cloned()
    }
}
