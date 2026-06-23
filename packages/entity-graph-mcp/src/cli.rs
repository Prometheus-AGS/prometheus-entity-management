//! CLI argument parsing.
//!
//! ```text
//! entity-graph-mcp              # default: stdio
//! entity-graph-mcp stdio        # explicit stdio
//! entity-graph-mcp http         # HTTP on 0.0.0.0:8080
//! entity-graph-mcp http --port 9090 --host 127.0.0.1
//! ```

use std::net::SocketAddr;

use clap::{Parser, Subcommand};

/// entity-graph MCP server — serve the entity graph over MCP.
#[derive(Debug, Parser)]
#[command(
    name = "entity-graph-mcp",
    version,
    about = "Serve the Prometheus entity graph over the Model Context Protocol (MCP).",
    long_about = None,
)]
pub struct Cli {
    #[command(subcommand)]
    pub command: Option<Command>,
}

/// Available transport sub-commands.
#[derive(Debug, Subcommand)]
pub enum Command {
    /// Run on stdin/stdout (default for local MCP hosts like Claude Desktop).
    Stdio,

    /// Run a Streamable HTTP server.
    Http(HttpArgs),
}

/// Arguments for the `http` subcommand.
#[derive(Debug, clap::Args)]
pub struct HttpArgs {
    /// Host address to bind.
    #[arg(long, default_value = "0.0.0.0", env = "ENTITY_GRAPH_MCP_HOST")]
    pub host: String,

    /// TCP port to listen on.
    #[arg(long, default_value_t = 8080, env = "ENTITY_GRAPH_MCP_PORT")]
    pub port: u16,
}

impl HttpArgs {
    /// Parse host + port into a `SocketAddr`.
    pub fn socket_addr(&self) -> Result<SocketAddr, std::net::AddrParseError> {
        format!("{}:{}", self.host, self.port).parse()
    }
}
