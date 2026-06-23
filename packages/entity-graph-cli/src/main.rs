//! `entity-graph` — CLI for the Prometheus entity-graph ecosystem.
//!
//! Subcommands:
//!   `init`     – writes a starter `schema.json` in SDL source format
//!   `generate` – reads an SDL JSON schema (source or IR format) and emits
//!                TypeScript entity types + a transport-registration stub

mod commands;
mod ir;
mod sdl_parser;
mod templates;

use anyhow::Result;
use clap::{Parser, Subcommand};

/// entity-graph CLI — scaffold schemas and generate TypeScript bindings.
#[derive(Debug, Parser)]
#[command(
    name = "entity-graph",
    version,
    about = "Scaffold entity schemas and generate TypeScript bindings for @prometheus-ags/entity-graph-core.",
    long_about = None,
)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Debug, Subcommand)]
enum Commands {
    /// Write a starter `schema.json` into the target directory.
    Init(commands::init::InitArgs),

    /// Read a schema JSON and generate TypeScript entity types + transport stubs.
    Generate(commands::generate::GenerateArgs),
}

fn main() -> Result<()> {
    let cli = Cli::parse();

    match &cli.command {
        Commands::Init(args) => commands::init::run(args),
        Commands::Generate(args) => commands::generate::run(args),
    }
}
