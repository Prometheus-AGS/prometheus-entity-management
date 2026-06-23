//! Transport helpers.
//!
//! * [`run_stdio`]   — attach to stdin/stdout for local MCP hosts.
//! * [`run_http`]    — bind an Axum HTTP server with `StreamableHttpService`.

use std::{net::SocketAddr, sync::Arc};

use anyhow::Result;
use axum::{extract::State, routing::get, Router};
use rmcp::{
    serve_server,
    transport::{
        streamable_http_server::session::local::LocalSessionManager, StreamableHttpServerConfig,
        StreamableHttpService,
    },
};
use tokio::net::TcpListener;
use tokio_util::sync::CancellationToken;
use tower_http::{cors::CorsLayer, trace::TraceLayer};
use tracing::info;

use crate::server::EntityGraphServer;

// ── stdio transport ───────────────────────────────────────────────────────────

/// Run the MCP server on stdin / stdout.
///
/// Blocks until the client disconnects (EOF on stdin).
pub async fn run_stdio(server: EntityGraphServer) -> Result<()> {
    info!("entity-graph-mcp: starting stdio transport");

    let (stdin, stdout) = rmcp::transport::stdio();
    let service = serve_server(server, (stdin, stdout)).await?;
    service.waiting().await?;

    Ok(())
}

// ── HTTP transport ────────────────────────────────────────────────────────────

/// Shared state available to HTTP health/info routes.
#[derive(Clone)]
struct AppState {
    server_name: String,
    server_version: String,
}

/// Run the MCP server over Streamable HTTP using Axum.
///
/// The MCP endpoint is mounted at `/mcp` (POST + GET, as required by the
/// Streamable HTTP spec). A lightweight `/health` route is also provided.
///
/// # Arguments
///
/// * `server` — the `EntityGraphServer` instance (will be cloned per session).
/// * `addr`   — the socket address to bind (e.g. `"0.0.0.0:8080".parse()?`).
/// * `cancel` — cancellation token; call `.cancel()` to initiate shutdown.
pub async fn run_http(
    server: EntityGraphServer,
    addr: SocketAddr,
    cancel: CancellationToken,
) -> Result<()> {
    info!("entity-graph-mcp: starting Streamable HTTP transport on {addr}");

    let session_manager = Arc::new(LocalSessionManager::default());

    // `StreamableHttpServerConfig` is `#[non_exhaustive]`; use its builder
    // methods instead of struct literal syntax.
    let config = StreamableHttpServerConfig::default()
        .with_stateful_mode(true)
        .with_cancellation_token(cancel.clone())
        .with_allowed_hosts(["localhost", "127.0.0.1", "0.0.0.0"]);

    // Clone the server for each new MCP session.
    let server_factory = {
        let server = server.clone();
        move || Ok(server.clone())
    };

    let mcp_service = StreamableHttpService::new(server_factory, session_manager, config);

    let state = AppState {
        server_name: env!("CARGO_PKG_NAME").to_owned(),
        server_version: env!("CARGO_PKG_VERSION").to_owned(),
    };

    let app = Router::new()
        .route("/health", get(health_handler))
        .route("/mcp", axum::routing::any_service(mcp_service))
        .with_state(state)
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive());

    let listener = TcpListener::bind(addr).await?;
    info!("entity-graph-mcp: HTTP server listening on {addr}");

    axum::serve(listener, app)
        .with_graceful_shutdown(async move {
            cancel.cancelled().await;
            info!("entity-graph-mcp: HTTP server shutting down");
        })
        .await?;

    Ok(())
}

/// `GET /health` — liveness probe.
async fn health_handler(State(state): State<AppState>) -> axum::Json<serde_json::Value> {
    axum::Json(serde_json::json!({
        "status": "ok",
        "server": state.server_name,
        "version": state.server_version,
    }))
}
