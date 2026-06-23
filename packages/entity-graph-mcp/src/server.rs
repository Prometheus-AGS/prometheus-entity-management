//! MCP server implementation.
//!
//! `EntityGraphServer` implements [`rmcp::ServerHandler`] and exposes:
//!
//! **Resources**
//! - Template: `entity://{entityType}/{entityId}` — read a single entity
//! - Template: `entity://{entityType}` — list all entities of a type
//!
//! **Tools** (registered via `#[tool_router]` + `#[tool_handler]`)
//! - `entity_list_types`  — list registered entity type names
//! - `entity_query`       — query entities by type with optional field filters
//! - `entity_upsert`      — insert or merge-update an entity
//! - `entity_delete`      — remove an entity from the graph

use rmcp::{
    handler::server::wrapper::Parameters,
    model::{
        Implementation, InitializeRequestParams, InitializeResult, ListResourceTemplatesResult,
        ListResourcesResult, PaginatedRequestParams, RawResource, RawResourceTemplate,
        ReadResourceRequestParams, ReadResourceResult, Resource, ResourceContents,
        ResourceTemplate, ServerCapabilities,
    },
    schemars,
    serde_json::{self, json, Value},
    service::RequestContext,
    tool, tool_handler, tool_router, ErrorData as McpError, RoleServer, ServerHandler,
};
use serde::Deserialize;

use crate::store::{EntityData, EntityStore};

// ── Tool parameter types ──────────────────────────────────────────────────────

/// Parameters for `entity_query`.
#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct EntityQueryParams {
    /// The entity type to query (e.g. `"Invoice"`, `"User"`).
    pub entity_type: String,

    /// Optional map of field → value for equality filtering.
    /// All provided fields must match (AND semantics).
    #[serde(default)]
    pub filter: Option<serde_json::Map<String, Value>>,

    /// Maximum number of results to return. Defaults to 100.
    #[serde(default = "default_limit")]
    pub limit: usize,
}

fn default_limit() -> usize {
    100
}

/// Parameters for `entity_upsert`.
#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct EntityUpsertParams {
    /// The entity type (e.g. `"Invoice"`).
    pub entity_type: String,

    /// The entity's unique identifier.
    pub id: String,

    /// JSON object of fields to insert or merge into the entity.
    pub data: serde_json::Map<String, Value>,
}

/// Parameters for `entity_delete`.
#[derive(Debug, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct EntityDeleteParams {
    /// The entity type.
    pub entity_type: String,

    /// The entity's unique identifier.
    pub id: String,
}

// ── Server struct + tools ─────────────────────────────────────────────────────

/// The entity-graph MCP server.
///
/// Mount this with `rmcp::serve_server` (stdio) or
/// `transport::run_http` (Streamable HTTP over Axum).
#[derive(Clone)]
pub struct EntityGraphServer {
    pub(crate) store: EntityStore,
}

/// Step 1: define tools; generates `EntityGraphServer::tool_router()`.
#[tool_router]
impl EntityGraphServer {
    /// Create a new server backed by the given entity store.
    pub fn new(store: EntityStore) -> Self {
        Self { store }
    }

    // ── Tools ─────────────────────────────────────────────────────────────────

    /// List all entity type names registered in the graph.
    #[tool(description = "List all entity type names registered in the entity graph.")]
    async fn entity_list_types(&self) -> String {
        let types = self.store.list_types();
        serde_json::to_string_pretty(&types).unwrap_or_else(|_| "[]".to_owned())
    }

    /// Query entities by type with optional field-equality filters.
    #[tool(description = "Query entities from the graph by type. \
                       Supports optional field equality filtering (AND semantics).")]
    async fn entity_query(&self, Parameters(params): Parameters<EntityQueryParams>) -> String {
        let entities = self.store.list_entities(&params.entity_type);

        let filtered: Vec<&EntityData> = entities
            .iter()
            .filter(|(_, data)| {
                params
                    .filter
                    .as_ref()
                    .is_none_or(|f| f.iter().all(|(k, v)| data.get(k) == Some(v)))
            })
            .take(params.limit)
            .map(|(_, data)| data)
            .collect();

        serde_json::to_string_pretty(&filtered).unwrap_or_else(|_| "[]".to_owned())
    }

    /// Insert or merge-update an entity in the graph.
    #[tool(
        description = "Insert or merge-update an entity in the graph (shallow merge). \
                       Returns the final merged entity."
    )]
    async fn entity_upsert(&self, Parameters(params): Parameters<EntityUpsertParams>) -> String {
        let merged = self
            .store
            .upsert(&params.entity_type, &params.id, params.data);
        serde_json::to_string_pretty(&merged).unwrap_or_else(|_| "{}".to_owned())
    }

    /// Delete an entity from the graph.
    #[tool(description = "Delete an entity from the graph by type and id. \
                       Returns the removed entity if it existed.")]
    async fn entity_delete(&self, Parameters(params): Parameters<EntityDeleteParams>) -> String {
        match self.store.delete(&params.entity_type, &params.id) {
            Some(data) => serde_json::to_string_pretty(&data).unwrap_or_else(|_| "{}".to_owned()),
            None => json!({
                "deleted": false,
                "entityType": params.entity_type,
                "id": params.id
            })
            .to_string(),
        }
    }
}

// ── Resource helpers (pure, no MCP context needed) ────────────────────────────

impl EntityGraphServer {
    /// Read a resource by URI — internal helper, testable without a live MCP
    /// `RequestContext`.
    pub(crate) fn read_resource_by_uri(&self, uri: &str) -> Result<ReadResourceResult, McpError> {
        // Strip the "entity://" scheme prefix.
        let path = uri.strip_prefix("entity://").ok_or_else(|| {
            McpError::invalid_params(format!("Unsupported resource URI scheme: {uri}"), None)
        })?;

        let parts: Vec<&str> = path.splitn(2, '/').collect();
        let entity_type = parts[0];

        let text = if parts.len() == 2 {
            // Single entity: entity://<type>/<id>
            let id = parts[1];
            let data = self
                .store
                .get(entity_type, id)
                .map_err(|e| McpError::resource_not_found(e.to_string(), None))?;
            serde_json::to_string_pretty(&data).unwrap_or_else(|_| "{}".to_owned())
        } else {
            // All entities of type: entity://<type>
            let entities: Vec<EntityData> = self
                .store
                .list_entities(entity_type)
                .into_iter()
                .map(|(_, data)| data)
                .collect();
            serde_json::to_string_pretty(&entities).unwrap_or_else(|_| "[]".to_owned())
        };

        Ok(ReadResourceResult::new(vec![
            ResourceContents::TextResourceContents {
                uri: uri.to_owned(),
                mime_type: Some("application/json".to_owned()),
                text,
                meta: None,
            },
        ]))
    }
}

// ── ServerHandler — Step 2: delegate tools + add resources ───────────────────

/// `#[tool_handler]` injects `call_tool` and `list_tools` from the generated
/// `tool_router()`.  We override the remaining `ServerHandler` methods
/// (`initialize`, `list_resources`, `list_resource_templates`, `read_resource`)
/// as plain `async fn` per clippy's `manual_async_fn` lint.
#[tool_handler]
impl ServerHandler for EntityGraphServer {
    async fn initialize(
        &self,
        _request: InitializeRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<InitializeResult, McpError> {
        Ok(InitializeResult::new(
            ServerCapabilities::builder()
                .enable_tools()
                .enable_resources()
                .build(),
        )
        .with_server_info(Implementation::new(
            env!("CARGO_PKG_NAME"),
            env!("CARGO_PKG_VERSION"),
        ))
        .with_instructions(
            "Entity-graph MCP server. \
             Resources: entity://{entityType}/{entityId} (single entity) \
             and entity://{entityType} (all entities of a type). \
             Tools: entity_list_types, entity_query, entity_upsert, entity_delete.",
        ))
    }

    async fn list_resource_templates(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListResourceTemplatesResult, McpError> {
        Ok(ListResourceTemplatesResult {
            meta: None,
            resource_templates: vec![
                ResourceTemplate {
                    raw: RawResourceTemplate {
                        uri_template: "entity://{entityType}/{entityId}".to_owned(),
                        name: "Entity by type and id".to_owned(),
                        title: Some("Single entity".to_owned()),
                        description: Some(
                            "Read a single entity. URI: entity://<type>/<id>".to_owned(),
                        ),
                        mime_type: Some("application/json".to_owned()),
                        icons: None,
                    },
                    annotations: None,
                },
                ResourceTemplate {
                    raw: RawResourceTemplate {
                        uri_template: "entity://{entityType}".to_owned(),
                        name: "Entities by type".to_owned(),
                        title: Some("All entities of a type".to_owned()),
                        description: Some(
                            "List all entities of a type. URI: entity://<type>".to_owned(),
                        ),
                        mime_type: Some("application/json".to_owned()),
                        icons: None,
                    },
                    annotations: None,
                },
            ],
            next_cursor: None,
        })
    }

    async fn list_resources(
        &self,
        _request: Option<PaginatedRequestParams>,
        _context: RequestContext<RoleServer>,
    ) -> Result<ListResourcesResult, McpError> {
        let resources: Vec<Resource> = self
            .store
            .list_types()
            .into_iter()
            .map(|entity_type| Resource {
                raw: RawResource {
                    uri: format!("entity://{entity_type}"),
                    name: entity_type.clone(),
                    title: Some(format!("{entity_type} entities")),
                    description: Some(format!("All entities of type {entity_type} in the graph.")),
                    mime_type: Some("application/json".to_owned()),
                    size: None,
                    icons: None,
                    meta: None,
                },
                annotations: None,
            })
            .collect();

        Ok(ListResourcesResult {
            meta: None,
            resources,
            next_cursor: None,
        })
    }

    async fn read_resource(
        &self,
        request: ReadResourceRequestParams,
        _context: RequestContext<RoleServer>,
    ) -> Result<ReadResourceResult, McpError> {
        self.read_resource_by_uri(&request.uri)
    }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn make_server() -> EntityGraphServer {
        let store = EntityStore::new();
        store.seed(
            "Invoice",
            vec![
                (
                    "inv_1".into(),
                    json!({"id": "inv_1", "amount": 100, "status": "draft"})
                        .as_object()
                        .cloned()
                        .unwrap(),
                ),
                (
                    "inv_2".into(),
                    json!({"id": "inv_2", "amount": 200, "status": "paid"})
                        .as_object()
                        .cloned()
                        .unwrap(),
                ),
            ],
        );
        EntityGraphServer::new(store)
    }

    #[tokio::test]
    async fn entity_list_types_returns_types() {
        let server = make_server();
        let result = server.entity_list_types().await;
        assert!(result.contains("Invoice"), "expected 'Invoice' in {result}");
    }

    #[tokio::test]
    async fn entity_query_no_filter_returns_all() {
        let server = make_server();
        let params = EntityQueryParams {
            entity_type: "Invoice".into(),
            filter: None,
            limit: 100,
        };
        let result = server.entity_query(Parameters(params)).await;
        let parsed: Vec<Value> = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.len(), 2);
    }

    #[tokio::test]
    async fn entity_query_with_filter_returns_subset() {
        let server = make_server();
        let mut filter = serde_json::Map::new();
        filter.insert("status".into(), json!("paid"));
        let params = EntityQueryParams {
            entity_type: "Invoice".into(),
            filter: Some(filter),
            limit: 100,
        };
        let result = server.entity_query(Parameters(params)).await;
        let parsed: Vec<Value> = serde_json::from_str(&result).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0]["status"], json!("paid"));
    }

    #[tokio::test]
    async fn entity_upsert_and_delete_roundtrip() {
        let store = EntityStore::new();
        let server = EntityGraphServer::new(store);

        let upsert_result = server
            .entity_upsert(Parameters(EntityUpsertParams {
                entity_type: "Company".into(),
                id: "co_1".into(),
                data: json!({"name": "Acme"}).as_object().cloned().unwrap(),
            }))
            .await;
        let obj: Value = serde_json::from_str(&upsert_result).unwrap();
        assert_eq!(obj["name"], json!("Acme"));

        let del_result = server
            .entity_delete(Parameters(EntityDeleteParams {
                entity_type: "Company".into(),
                id: "co_1".into(),
            }))
            .await;
        let del_obj: Value = serde_json::from_str(&del_result).unwrap();
        assert_eq!(del_obj["name"], json!("Acme"));
    }

    #[test]
    fn read_resource_by_uri_single_entity() {
        let store = EntityStore::new();
        store.seed(
            "Company",
            vec![(
                "co_1".into(),
                json!({"name": "Acme"}).as_object().cloned().unwrap(),
            )],
        );
        let server = EntityGraphServer::new(store);

        let result = server
            .read_resource_by_uri("entity://Company/co_1")
            .unwrap();
        let text = match &result.contents[0] {
            ResourceContents::TextResourceContents { text, .. } => text.clone(),
            _ => panic!("expected text"),
        };
        let obj: Value = serde_json::from_str(&text).unwrap();
        assert_eq!(obj["name"], json!("Acme"));
    }

    #[test]
    fn read_resource_by_uri_type_list() {
        let store = EntityStore::new();
        store.seed(
            "Company",
            vec![
                (
                    "co_1".into(),
                    json!({"name": "A"}).as_object().cloned().unwrap(),
                ),
                (
                    "co_2".into(),
                    json!({"name": "B"}).as_object().cloned().unwrap(),
                ),
            ],
        );
        let server = EntityGraphServer::new(store);

        let result = server.read_resource_by_uri("entity://Company").unwrap();
        let text = match &result.contents[0] {
            ResourceContents::TextResourceContents { text, .. } => text.clone(),
            _ => panic!("expected text"),
        };
        let arr: Vec<Value> = serde_json::from_str(&text).unwrap();
        assert_eq!(arr.len(), 2);
    }

    #[test]
    fn read_resource_by_uri_unknown_scheme_returns_error() {
        let server = EntityGraphServer::new(EntityStore::new());
        let err = server
            .read_resource_by_uri("file:///etc/passwd")
            .unwrap_err();
        assert!(err.message.contains("Unsupported resource URI scheme"));
    }

    #[test]
    fn read_resource_by_uri_missing_entity_returns_not_found() {
        let server = EntityGraphServer::new(EntityStore::new());
        let err = server
            .read_resource_by_uri("entity://Company/nonexistent")
            .unwrap_err();
        assert_eq!(err.code, rmcp::model::ErrorCode::RESOURCE_NOT_FOUND);
    }
}
