//! `entity-graph-mcp` binary entry point.
//!
//! Runs the MCP server on the transport specified by the CLI subcommand
//! (stdio by default, or `http` for Streamable HTTP).

mod cli;
mod server;
mod store;
mod transport;

use anyhow::Result;
use clap::Parser;
use tokio_util::sync::CancellationToken;
use tracing_subscriber::{fmt, EnvFilter};

use cli::{Cli, Command};
use server::EntityGraphServer;
use store::EntityStore;

#[tokio::main]
async fn main() -> Result<()> {
    // Initialise structured logging.  Default level: INFO.
    // Override with RUST_LOG env var (e.g. `RUST_LOG=debug`).
    fmt()
        .with_env_filter(EnvFilter::from_default_env().add_directive(tracing::Level::INFO.into()))
        .with_target(false)
        .init();

    let cli = Cli::parse();

    let store = EntityStore::new();
    seed_demo_data(&store);

    let server = EntityGraphServer::new(store);

    match cli.command.unwrap_or(Command::Stdio) {
        Command::Stdio => transport::run_stdio(server).await?,
        Command::Http(args) => {
            let addr = args.socket_addr()?;
            let cancel = CancellationToken::new();

            // Register Ctrl-C handler.
            let cancel_clone = cancel.clone();
            tokio::spawn(async move {
                tokio::signal::ctrl_c()
                    .await
                    .expect("failed to install Ctrl-C handler");
                cancel_clone.cancel();
            });

            transport::run_http(server, addr, cancel).await?;
        }
    }

    Ok(())
}

/// Populate the store with a small set of demo entities so the server is
/// immediately explorable without external data.
fn seed_demo_data(store: &EntityStore) {
    use serde_json::json;

    let to_map = |v: serde_json::Value| v.as_object().cloned().unwrap_or_default();

    store.seed(
        "Company",
        vec![
            (
                "co_1".into(),
                to_map(json!({
                    "id": "co_1",
                    "name": "Prometheus AGS",
                    "industry": "AI/ML",
                    "status": "active"
                })),
            ),
            (
                "co_2".into(),
                to_map(json!({
                    "id": "co_2",
                    "name": "Acme Corp",
                    "industry": "Manufacturing",
                    "status": "active"
                })),
            ),
        ],
    );

    store.seed(
        "Invoice",
        vec![
            (
                "inv_1".into(),
                to_map(json!({
                    "id": "inv_1",
                    "company_id": "co_1",
                    "amount": 9500,
                    "currency": "USD",
                    "status": "paid"
                })),
            ),
            (
                "inv_2".into(),
                to_map(json!({
                    "id": "inv_2",
                    "company_id": "co_2",
                    "amount": 3200,
                    "currency": "USD",
                    "status": "draft"
                })),
            ),
        ],
    );
}
