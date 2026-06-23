//! `entity-graph generate` — reads a schema JSON file (SDL IR) and emits
//! TypeScript entity type definitions + a transport-registration stub.

use std::path::PathBuf;

use anyhow::{Context, Result};
use convert_case::{Case, Casing};
use serde::Serialize;
use tera::{Context as TeraCtx, Tera};

use crate::{
    ir::{EntityGraphIR, IrEntity, RelationKind},
    sdl_parser,
    templates,
};

// ── CLI args ──────────────────────────────────────────────────────────────────

/// Code-generation targets.
#[derive(Debug, Clone, clap::ValueEnum)]
pub enum Target {
    /// Emit TypeScript types + a `registerEntityTransport` stub.
    React,
}

/// Arguments for the `generate` subcommand (parsed by `clap` in main).
#[derive(Debug, clap::Args)]
pub struct GenerateArgs {
    /// Code-generation target.
    #[arg(short, long, value_enum, default_value = "react")]
    pub target: Target,

    /// Path to the SDL JSON schema (produced by `init` or `parseSdlJson`).
    #[arg(short, long, default_value = "schema.json")]
    pub schema: PathBuf,

    /// Output directory for generated files.
    #[arg(short, long, default_value = "generated")]
    pub out: PathBuf,
}

// ── Template context types ─────────────────────────────────────────────────────

/// Per-field data passed into Tera templates.
#[derive(Debug, Serialize)]
struct FieldCtx {
    name: String,
    ts_type: String,
    optional: bool,
    primary: bool,
    auto: bool,
}

/// Per-relation data passed into Tera templates.
#[derive(Debug, Serialize)]
struct RelationCtx {
    name: String,
    kind: String,
    target_pascal: String,
    foreign_key: Option<String>,
}

/// Per-entity data passed into Tera templates.
#[derive(Debug, Serialize)]
struct EntityCtx {
    pascal_name: String,
    snake_name: String,
    table: String,
    primary_key: String,
    fields: Vec<FieldCtx>,
    relations: Vec<RelationCtx>,
    has_auto_fields: bool,
    /// Quoted comma-separated names of auto fields for Omit<>.
    auto_field_names: String,
}

// ── Helpers ───────────────────────────────────────────────────────────────────

fn build_entity_ctx(entity: &IrEntity) -> EntityCtx {
    let fields: Vec<FieldCtx> = entity
        .fields
        .iter()
        .map(|f| FieldCtx {
            name: f.name.clone(),
            ts_type: f.ts_type_string(),
            optional: f.is_optional(),
            primary: f.primary,
            auto: f.auto,
        })
        .collect();

    let auto_fields: Vec<&str> = entity
        .fields
        .iter()
        .filter(|f| f.auto)
        .map(|f| f.name.as_str())
        .collect();
    let has_auto_fields = !auto_fields.is_empty();
    let auto_field_names = auto_fields
        .iter()
        .map(|n| format!("'{}'", n))
        .collect::<Vec<_>>()
        .join(" | ");

    let relations: Vec<RelationCtx> = entity
        .relations
        .iter()
        .map(|r| RelationCtx {
            name: r.name.clone(),
            kind: match r.kind {
                RelationKind::BelongsTo => "belongsTo",
                RelationKind::HasMany => "hasMany",
                RelationKind::ManyToMany => "manyToMany",
            }
            .to_owned(),
            target_pascal: r.target.to_case(Case::Pascal),
            foreign_key: r.foreign_key.clone(),
        })
        .collect();

    EntityCtx {
        pascal_name: entity.name.to_case(Case::Pascal),
        snake_name: entity.name.to_case(Case::Snake),
        table: entity.table.clone(),
        primary_key: entity.primary_key.clone(),
        fields,
        relations,
        has_auto_fields,
        auto_field_names,
    }
}

/// Build the shared Tera context for all templates.
fn build_tera_ctx(ir: &EntityGraphIR, schema_path: &str) -> TeraCtx {
    let entities: Vec<EntityCtx> = ir.entities.iter().map(build_entity_ctx).collect();
    let mut ctx = TeraCtx::new();
    ctx.insert("entities", &entities);
    ctx.insert("schema_path", schema_path);
    ctx.insert("cli_version", env!("CARGO_PKG_VERSION"));
    ctx
}

/// Render a Tera template string and return the output.
fn render(template_name: &str, template_src: &str, ctx: &TeraCtx) -> Result<String> {
    let mut tera = Tera::default();
    tera.add_raw_template(template_name, template_src)
        .with_context(|| format!("failed to parse template '{template_name}'"))?;
    tera.render(template_name, ctx)
        .with_context(|| format!("failed to render template '{template_name}'"))
}

// ── Entry point ───────────────────────────────────────────────────────────────

/// Execute the `generate` subcommand.
pub fn run(args: &GenerateArgs) -> Result<()> {
    // 1. Load + parse the schema.
    // Accept both the human-editable SDL source format (written by `init`) and
    // the EntityGraphIR array format produced by `parseSdlJson()` in the TS SDL
    // package. We try the IR format first; on failure fall back to SDL source.
    let schema_str = std::fs::read_to_string(&args.schema)
        .with_context(|| format!("cannot read schema from {}", args.schema.display()))?;

    let ir: EntityGraphIR = {
        // Attempt IR format first (entities is an array).
        let ir_attempt: Result<EntityGraphIR> = serde_json::from_str(&schema_str)
            .with_context(|| format!("IR parse attempt for {}", args.schema.display()));
        match ir_attempt {
            Ok(ir) if !ir.entities.is_empty() || ir.version == "1.0" => ir,
            _ => {
                // Fall back to SDL source format (entities is an object keyed by name).
                sdl_parser::parse_sdl_source(&schema_str)
                    .with_context(|| format!("invalid SDL JSON in {}", args.schema.display()))?
            }
        }
    };

    let schema_path = args.schema.to_string_lossy().into_owned();

    // 2. Prepare output directory.
    if !args.out.exists() {
        std::fs::create_dir_all(&args.out)
            .with_context(|| format!("cannot create output dir {}", args.out.display()))?;
    }

    let ctx = build_tera_ctx(&ir, &schema_path);

    match args.target {
        Target::React => generate_react(&args.out, &ctx)?,
    }

    Ok(())
}

fn generate_react(out: &std::path::Path, ctx: &TeraCtx) -> Result<()> {
    // entity-types.ts
    let types_src = render("entity-types.ts.tera", templates::ENTITY_TYPES_TS, ctx)?;
    let types_path = out.join("entity-types.ts");
    std::fs::write(&types_path, &types_src)
        .with_context(|| format!("cannot write {}", types_path.display()))?;
    println!("Wrote {}", types_path.display());

    // register-transports.ts
    let reg_src = render(
        "register-transports.ts.tera",
        templates::REGISTER_TRANSPORTS_TS,
        ctx,
    )?;
    let reg_path = out.join("register-transports.ts");
    std::fs::write(&reg_path, &reg_src)
        .with_context(|| format!("cannot write {}", reg_path.display()))?;
    println!("Wrote {}", reg_path.display());

    // index.ts
    let index_src = render("index.ts.tera", templates::INDEX_TS, ctx)?;
    let index_path = out.join("index.ts");
    std::fs::write(&index_path, &index_src)
        .with_context(|| format!("cannot write {}", index_path.display()))?;
    println!("Wrote {}", index_path.display());

    println!();
    println!("Done. {} entity/entities generated.", {
        // entity count from context — re-parse to avoid extra dep
        let dummy: serde_json::Value =
            serde_json::to_value(ctx.get("entities").unwrap_or(&tera::Value::Null))
                .unwrap_or_default();
        dummy.as_array().map(|a| a.len()).unwrap_or(0)
    });

    Ok(())
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ir::{IrField, IrRelation, ScalarType};
    use tempfile::tempdir;

    fn sample_ir() -> EntityGraphIR {
        EntityGraphIR {
            version: "1.0".into(),
            entities: vec![
                crate::ir::IrEntity {
                    name: "user".into(),
                    table: "user".into(),
                    primary_key: "id".into(),
                    fields: vec![
                        IrField {
                            name: "id".into(),
                            field_type: ScalarType::Uuid,
                            primary: true,
                            required: true,
                            unique: true,
                            default: None,
                            values: None,
                            auto: false,
                        },
                        IrField {
                            name: "email".into(),
                            field_type: ScalarType::String,
                            primary: false,
                            required: true,
                            unique: true,
                            default: None,
                            values: None,
                            auto: false,
                        },
                        IrField {
                            name: "createdAt".into(),
                            field_type: ScalarType::Datetime,
                            primary: false,
                            required: false,
                            unique: false,
                            default: None,
                            values: None,
                            auto: true,
                        },
                    ],
                    relations: vec![IrRelation {
                        name: "posts".into(),
                        kind: RelationKind::HasMany,
                        target: "post".into(),
                        foreign_key: Some("userId".into()),
                        through: None,
                    }],
                },
            ],
            config: Default::default(),
        }
    }

    #[test]
    fn build_entity_ctx_pascal_name() {
        let ir = sample_ir();
        let ctx = build_entity_ctx(&ir.entities[0]);
        assert_eq!(ctx.pascal_name, "User");
    }

    #[test]
    fn build_entity_ctx_auto_fields() {
        let ir = sample_ir();
        let ctx = build_entity_ctx(&ir.entities[0]);
        assert!(ctx.has_auto_fields);
        assert_eq!(ctx.auto_field_names, "'createdAt'");
    }

    #[test]
    fn render_entity_types_contains_interface() {
        let ir = sample_ir();
        let ctx = build_tera_ctx(&ir, "schema.json");
        let out = render("t.tera", templates::ENTITY_TYPES_TS, &ctx).unwrap();
        assert!(out.contains("export interface User"), "expected interface: {out}");
        assert!(out.contains("id: string"), "expected id field: {out}");
        assert!(out.contains("email: string"), "expected email field: {out}");
        // createdAt is optional (auto), and creates Omit
        assert!(out.contains("CreateUserInput"), "expected CreateUserInput: {out}");
    }

    #[test]
    fn render_register_transports_contains_register_call() {
        let ir = sample_ir();
        let ctx = build_tera_ctx(&ir, "schema.json");
        let out = render("t.tera", templates::REGISTER_TRANSPORTS_TS, &ctx).unwrap();
        assert!(
            out.contains("registerEntityTransport"),
            "expected register call: {out}"
        );
        assert!(out.contains("User"), "expected User type: {out}");
    }

    #[test]
    fn generate_writes_files_to_outdir() {
        let tmp = tempdir().unwrap();
        let schema_path = tmp.path().join("schema.json");

        // Write the sample IR as a JSON file.
        let ir = sample_ir();
        std::fs::write(&schema_path, serde_json::to_string(&ir).unwrap()).unwrap();

        let out_dir = tmp.path().join("generated");
        let args = GenerateArgs {
            target: Target::React,
            schema: schema_path.clone(),
            out: out_dir.clone(),
        };
        run(&args).unwrap();

        assert!(out_dir.join("entity-types.ts").exists(), "entity-types.ts");
        assert!(
            out_dir.join("register-transports.ts").exists(),
            "register-transports.ts"
        );
        assert!(out_dir.join("index.ts").exists(), "index.ts");

        let types = std::fs::read_to_string(out_dir.join("entity-types.ts")).unwrap();
        assert!(types.contains("export interface User"));
    }

    #[test]
    fn generate_errors_on_missing_schema() {
        let tmp = tempdir().unwrap();
        let args = GenerateArgs {
            target: Target::React,
            schema: tmp.path().join("missing.json"),
            out: tmp.path().join("out"),
        };
        assert!(run(&args).is_err());
    }
}
