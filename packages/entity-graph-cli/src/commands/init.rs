//! `entity-graph init` — writes a starter `schema.json` into the current directory
//! (or a path supplied via `--out`).

use std::path::PathBuf;

use anyhow::{bail, Context, Result};
use serde_json::json;

/// Arguments for the `init` subcommand (parsed by `clap` in main).
#[derive(Debug, clap::Args)]
pub struct InitArgs {
    /// Directory to write `schema.json` into (defaults to `.`).
    #[arg(short, long, default_value = ".")]
    pub out: PathBuf,

    /// Overwrite an existing `schema.json` without prompting.
    #[arg(long, default_value_t = false)]
    pub force: bool,
}

/// Execute the `init` subcommand.
pub fn run(args: &InitArgs) -> Result<()> {
    let dir = &args.out;
    if !dir.exists() {
        std::fs::create_dir_all(dir)
            .with_context(|| format!("cannot create directory {}", dir.display()))?;
    }

    let dest = dir.join("schema.json");
    if dest.exists() && !args.force {
        bail!(
            "{} already exists — pass --force to overwrite",
            dest.display()
        );
    }

    let schema = starter_schema();
    let json = serde_json::to_string_pretty(&schema)
        .context("failed to serialise starter schema")?;

    std::fs::write(&dest, json)
        .with_context(|| format!("cannot write {}", dest.display()))?;

    println!("Created {}", dest.display());
    println!();
    println!("Next steps:");
    println!("  1. Edit schema.json to define your entities.");
    println!("  2. Run `entity-graph generate --target react --schema schema.json --out src/db`");

    Ok(())
}

/// The content of the starter schema written by `init`.
fn starter_schema() -> serde_json::Value {
    json!({
        "version": "1.0",
        "entities": {
            "user": {
                "fields": {
                    "id": { "type": "uuid", "primary": true, "required": true },
                    "email": { "type": "string", "required": true, "unique": true },
                    "name": { "type": "string", "required": true },
                    "role": {
                        "type": "enum",
                        "required": false,
                        "values": ["admin", "member", "viewer"],
                        "default": "member"
                    },
                    "createdAt": { "type": "datetime", "required": false, "auto": true }
                },
                "relations": {
                    "posts": { "type": "hasMany", "target": "post", "foreignKey": "userId" }
                }
            },
            "post": {
                "fields": {
                    "id": { "type": "uuid", "primary": true, "required": true },
                    "title": { "type": "string", "required": true },
                    "body": { "type": "string", "required": false },
                    "published": { "type": "boolean", "required": false, "default": false },
                    "userId": { "type": "uuid", "required": true },
                    "createdAt": { "type": "datetime", "required": false, "auto": true }
                },
                "relations": {
                    "author": { "type": "belongsTo", "target": "user", "foreignKey": "userId" }
                }
            }
        },
        "config": {
            "localFirst": { "engine": "pglite", "sync": "electric" },
            "ai": { "mcp": true, "a2a": false }
        }
    })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn creates_schema_json_in_temp_dir() {
        let tmp = tempdir().unwrap();
        let args = InitArgs { out: tmp.path().to_path_buf(), force: false };
        run(&args).unwrap();

        let dest = tmp.path().join("schema.json");
        assert!(dest.exists(), "schema.json should have been created");

        let content = std::fs::read_to_string(&dest).unwrap();
        let parsed: serde_json::Value = serde_json::from_str(&content).unwrap();
        assert_eq!(parsed["version"], "1.0");
        assert!(parsed["entities"]["user"].is_object());
        assert!(parsed["entities"]["post"].is_object());
    }

    #[test]
    fn refuses_to_overwrite_without_force() {
        let tmp = tempdir().unwrap();
        let args = InitArgs { out: tmp.path().to_path_buf(), force: false };
        run(&args).unwrap();

        // Second call without --force should fail.
        let result = run(&args);
        assert!(result.is_err(), "should have refused to overwrite");
        let msg = result.unwrap_err().to_string();
        assert!(msg.contains("already exists"), "error should mention already-exists: {msg}");
    }

    #[test]
    fn force_flag_allows_overwrite() {
        let tmp = tempdir().unwrap();
        let first = InitArgs { out: tmp.path().to_path_buf(), force: false };
        run(&first).unwrap();

        let second = InitArgs { out: tmp.path().to_path_buf(), force: true };
        run(&second).unwrap(); // should succeed
    }

    #[test]
    fn creates_output_dir_if_absent() {
        let tmp = tempdir().unwrap();
        let nested = tmp.path().join("a/b/c");
        let args = InitArgs { out: nested.clone(), force: false };
        run(&args).unwrap();
        assert!(nested.join("schema.json").exists());
    }

    #[test]
    fn starter_schema_is_valid_json() {
        let v = starter_schema();
        // Round-trip through string serialisation.
        let s = serde_json::to_string(&v).unwrap();
        let _back: serde_json::Value = serde_json::from_str(&s).unwrap();
    }
}
