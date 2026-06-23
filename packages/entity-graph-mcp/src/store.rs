//! In-process entity store.
//!
//! Mirrors the shape of `@prometheus-ags/entity-graph-core`:
//!   `entities[type][id] = json_value`
//!
//! Replace the `DashMap` internals with real DB calls for production use.

use std::sync::Arc;

use dashmap::DashMap;
use serde_json::Value;
use thiserror::Error;

/// Errors returned by store operations.
#[derive(Debug, Error)]
#[allow(dead_code)]
pub enum StoreError {
    #[error("entity type '{0}' not found")]
    TypeNotFound(String),

    #[error("entity '{entity_type}/{id}' not found")]
    EntityNotFound { entity_type: String, id: String },

    #[error("invalid entity data: {0}")]
    InvalidData(String),
}

/// A single entity record (JSON object keyed by string fields).
pub type EntityData = serde_json::Map<String, Value>;

/// Shareable, thread-safe entity store.
///
/// Structure: `types → (id → data)`.
#[derive(Clone, Default)]
pub struct EntityStore {
    inner: Arc<DashMap<String, DashMap<String, EntityData>>>,
}

impl EntityStore {
    /// Create an empty store.
    pub fn new() -> Self {
        Self::default()
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    /// Return all known entity type names.
    pub fn list_types(&self) -> Vec<String> {
        self.inner.iter().map(|e| e.key().clone()).collect()
    }

    /// Return every entity of the given type as `(id, data)` pairs.
    pub fn list_entities(&self, entity_type: &str) -> Vec<(String, EntityData)> {
        match self.inner.get(entity_type) {
            None => vec![],
            Some(bucket) => bucket
                .iter()
                .map(|e| (e.key().clone(), e.value().clone()))
                .collect(),
        }
    }

    /// Read a single entity.
    pub fn get(&self, entity_type: &str, id: &str) -> Result<EntityData, StoreError> {
        let bucket = self
            .inner
            .get(entity_type)
            .ok_or_else(|| StoreError::TypeNotFound(entity_type.to_owned()))?;

        bucket
            .get(id)
            .map(|e| e.value().clone())
            .ok_or_else(|| StoreError::EntityNotFound {
                entity_type: entity_type.to_owned(),
                id: id.to_owned(),
            })
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /// Insert or merge-update an entity.
    ///
    /// If the entity already exists, the provided fields are merged (shallow
    /// merge, matching the behaviour of `upsertEntity` in the TypeScript core).
    pub fn upsert(&self, entity_type: &str, id: &str, data: EntityData) -> EntityData {
        let bucket = self.inner.entry(entity_type.to_owned()).or_default();

        let mut entry = bucket.entry(id.to_owned()).or_default();
        // Shallow merge: incoming fields overwrite existing ones.
        for (k, v) in data {
            entry.insert(k, v);
        }
        entry.clone()
    }

    /// Delete an entity. Returns the removed data if present.
    pub fn delete(&self, entity_type: &str, id: &str) -> Option<EntityData> {
        let bucket = self.inner.get(entity_type)?;
        bucket.remove(id).map(|(_, v)| v)
    }

    // ── Seeding ───────────────────────────────────────────────────────────────

    /// Bulk-load entities (useful for testing or seeding demo data).
    pub fn seed(&self, entity_type: &str, entities: Vec<(String, EntityData)>) {
        let bucket = self.inner.entry(entity_type.to_owned()).or_default();
        for (id, data) in entities {
            bucket.insert(id, data);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn map(v: Value) -> EntityData {
        match v {
            Value::Object(m) => m,
            _ => panic!("expected object"),
        }
    }

    #[test]
    fn upsert_creates_new_entity() {
        let store = EntityStore::new();
        let data = map(json!({"name": "Acme", "status": "active"}));
        store.upsert("Company", "co_1", data.clone());

        let got = store.get("Company", "co_1").unwrap();
        assert_eq!(got["name"], json!("Acme"));
    }

    #[test]
    fn upsert_merges_existing_entity() {
        let store = EntityStore::new();
        store.upsert("Company", "co_1", map(json!({"name": "Old"})));
        store.upsert(
            "Company",
            "co_1",
            map(json!({"name": "New", "city": "NYC"})),
        );

        let got = store.get("Company", "co_1").unwrap();
        assert_eq!(got["name"], json!("New"));
        assert_eq!(got["city"], json!("NYC"));
    }

    #[test]
    fn delete_removes_entity() {
        let store = EntityStore::new();
        store.upsert("Company", "co_1", map(json!({"name": "Acme"})));
        let removed = store.delete("Company", "co_1");
        assert!(removed.is_some());
        assert!(store.get("Company", "co_1").is_err());
    }

    #[test]
    fn list_types_returns_all_types() {
        let store = EntityStore::new();
        store.upsert("Company", "co_1", map(json!({"name": "A"})));
        store.upsert("User", "u_1", map(json!({"email": "a@b.com"})));

        let mut types = store.list_types();
        types.sort();
        assert_eq!(types, vec!["Company", "User"]);
    }

    #[test]
    fn get_unknown_type_returns_error() {
        let store = EntityStore::new();
        let err = store.get("Ghost", "x").unwrap_err();
        assert!(matches!(err, StoreError::TypeNotFound(_)));
    }
}
