//! `entity-graph-mcp` — MCP server for the Prometheus entity-graph ecosystem.
//!
//! Exposes entity data as MCP **resources** (`entity://{type}/{id}`) and
//! **tools** (`entity_query`, `entity_upsert`, `entity_delete`,
//! `entity_list_types`) via two transports:
//!
//! * **stdio** — for embedding inside Claude Desktop / local MCP hosts.
//! * **Streamable HTTP** — for remote or multi-tenant deployments (Axum +
//!   `rmcp::transport::StreamableHttpService`).
//!
//! The in-process entity store is a `DashMap`-backed graph that mirrors the
//! shape of `@prometheus-ags/entity-graph-core`. In production, wire the
//! `EntityStore` to your real persistence layer by replacing the `DashMap`
//! with database calls inside each method.

pub mod cli;
pub mod server;
pub mod store;
pub mod transport;

pub use server::EntityGraphServer;
pub use store::EntityStore;
