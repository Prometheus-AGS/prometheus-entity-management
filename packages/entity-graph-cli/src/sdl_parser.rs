//! Parse the human-editable SDL source format (written by `init`) into an
//! [`EntityGraphIR`]. This mirrors the behaviour of `parseSdl()` in
//! `@prometheus-ags/entity-graph-sdl`.
//!
//! The source format has entities as a JSON object (keyed by name), whereas the
//! IR uses a flat array. The parser also validates field types, enum values, and
//! relation cross-references, matching the TypeScript reference implementation.

use std::collections::{HashMap, HashSet};

use anyhow::{anyhow, bail, Context, Result};
use serde::Deserialize;
use serde_json::Value;

use crate::ir::{
    AiConfig, EntityGraphIR, IrEntity, IrField, IrRelation, LocalFirstConfig, RelationKind,
    ScalarType, SdlConfig,
};

// ── Source-format deserialization types ───────────────────────────────────────

#[derive(Debug, Deserialize)]
struct SdlDocument {
    version: Option<String>,
    entities: HashMap<String, SdlEntityDef>,
    config: Option<SdlConfigRaw>,
}

#[derive(Debug, Deserialize)]
struct SdlEntityDef {
    fields: HashMap<String, SdlFieldDef>,
    relations: Option<HashMap<String, SdlRelationDef>>,
    table: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SdlFieldDef {
    #[serde(rename = "type")]
    field_type: String,
    primary: Option<bool>,
    required: Option<bool>,
    unique: Option<bool>,
    default: Option<Value>,
    values: Option<Vec<String>>,
    auto: Option<bool>,
}

#[derive(Debug, Deserialize)]
struct SdlRelationDef {
    #[serde(rename = "type")]
    kind: String,
    target: String,
    #[serde(rename = "foreignKey")]
    foreign_key: Option<String>,
    through: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SdlConfigRaw {
    #[serde(rename = "localFirst")]
    local_first: Option<LocalFirstRaw>,
    ai: Option<AiRaw>,
}

#[derive(Debug, Deserialize)]
struct LocalFirstRaw {
    engine: Option<String>,
    sync: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AiRaw {
    #[serde(default)]
    mcp: bool,
    #[serde(default)]
    a2a: bool,
}

// ── Scalar / relation type parsing ────────────────────────────────────────────

fn parse_scalar(s: &str, path: &str) -> Result<ScalarType> {
    match s {
        "string" => Ok(ScalarType::String),
        "number" => Ok(ScalarType::Number),
        "integer" => Ok(ScalarType::Integer),
        "decimal" => Ok(ScalarType::Decimal),
        "boolean" => Ok(ScalarType::Boolean),
        "datetime" => Ok(ScalarType::Datetime),
        "date" => Ok(ScalarType::Date),
        "json" => Ok(ScalarType::Json),
        "enum" => Ok(ScalarType::Enum),
        "uuid" => Ok(ScalarType::Uuid),
        other => bail!("unknown field type \"{}\" at {}", other, path),
    }
}

fn parse_relation_kind(s: &str, path: &str) -> Result<RelationKind> {
    match s {
        "belongsTo" => Ok(RelationKind::BelongsTo),
        "hasMany" => Ok(RelationKind::HasMany),
        "manyToMany" => Ok(RelationKind::ManyToMany),
        other => bail!("unknown relation type \"{}\" at {}", other, path),
    }
}

// ── Public entry point ────────────────────────────────────────────────────────

/// Parse the human-editable SDL source JSON into an [`EntityGraphIR`].
pub fn parse_sdl_source(json: &str) -> Result<EntityGraphIR> {
    let doc: SdlDocument =
        serde_json::from_str(json).context("invalid SDL JSON (source format)")?;
    let version = doc.version.unwrap_or_else(|| "1.0".into());

    let mut entities: Vec<IrEntity> = Vec::with_capacity(doc.entities.len());

    for (entity_name, entity_def) in &doc.entities {
        let entity_path = format!("$.entities.{}", entity_name);

        // ── Fields ────────────────────────────────────────────────────────────
        let mut fields: Vec<IrField> = Vec::with_capacity(entity_def.fields.len());
        let mut primary_key: Option<String> = None;

        for (field_name, field_def) in &entity_def.fields {
            let field_path = format!("{}.fields.{}", entity_path, field_name);
            let scalar = parse_scalar(&field_def.field_type, &field_path)?;

            if matches!(scalar, ScalarType::Enum) {
                match &field_def.values {
                    None => bail!("enum field requires non-empty `values` at {}", field_path),
                    Some(v) if v.is_empty() => {
                        bail!("enum field requires non-empty `values` at {}", field_path)
                    }
                    _ => {}
                }
            }

            let is_primary = field_def.primary.unwrap_or(false);
            if is_primary {
                if primary_key.is_some() {
                    bail!("multiple primary keys not supported at {}", field_path);
                }
                primary_key = Some(field_name.clone());
            }

            fields.push(IrField {
                name: field_name.clone(),
                field_type: scalar,
                primary: is_primary,
                required: field_def.required.unwrap_or(false),
                unique: field_def.unique.unwrap_or(false),
                default: field_def.default.clone(),
                values: field_def.values.clone(),
                auto: field_def.auto.unwrap_or(false),
            });
        }

        let pk = primary_key.ok_or_else(|| {
            anyhow!(
                "entity needs exactly one `primary: true` field at {}",
                entity_path
            )
        })?;

        // ── Relations ─────────────────────────────────────────────────────────
        let mut relations: Vec<IrRelation> = Vec::new();
        for (rel_name, rel_def) in entity_def.relations.iter().flatten() {
            let rel_path = format!("{}.relations.{}", entity_path, rel_name);
            let kind = parse_relation_kind(&rel_def.kind, &rel_path)?;
            relations.push(IrRelation {
                name: rel_name.clone(),
                kind,
                target: rel_def.target.clone(),
                foreign_key: rel_def.foreign_key.clone(),
                through: rel_def.through.clone(),
            });
        }

        entities.push(IrEntity {
            name: entity_name.clone(),
            table: entity_def.table.clone().unwrap_or_else(|| entity_name.clone()),
            primary_key: pk,
            fields,
            relations,
        });
    }

    // Cross-reference relation targets.
    let names: HashSet<&str> = entities.iter().map(|e| e.name.as_str()).collect();
    for entity in &entities {
        for rel in &entity.relations {
            if !names.contains(rel.target.as_str()) {
                bail!(
                    "relation target \"{}\" is not a defined entity at $.entities.{}.relations.{}",
                    rel.target,
                    entity.name,
                    rel.name,
                );
            }
        }
    }

    // ── Config ────────────────────────────────────────────────────────────────
    let config = doc.config.map(|c| SdlConfig {
        local_first: c.local_first.map(|lf| LocalFirstConfig {
            engine: lf.engine,
            sync: lf.sync,
        }),
        ai: c.ai.map(|a| AiConfig { mcp: a.mcp, a2a: a.a2a }),
    }).unwrap_or_default();

    Ok(EntityGraphIR { version, entities, config })
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn starter_schema_json() -> &'static str {
        r#"{
          "version": "1.0",
          "entities": {
            "user": {
              "fields": {
                "id":        { "type": "uuid",   "primary": true, "required": true },
                "email":     { "type": "string", "required": true, "unique": true },
                "role":      { "type": "enum",   "values": ["admin","member"] },
                "createdAt": { "type": "datetime", "auto": true }
              },
              "relations": {
                "posts": { "type": "hasMany", "target": "post", "foreignKey": "userId" }
              }
            },
            "post": {
              "fields": {
                "id":     { "type": "uuid",   "primary": true, "required": true },
                "title":  { "type": "string", "required": true },
                "userId": { "type": "uuid",   "required": true }
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
        }"#
    }

    #[test]
    fn parses_starter_schema() {
        let ir = parse_sdl_source(starter_schema_json()).unwrap();
        assert_eq!(ir.version, "1.0");
        assert_eq!(ir.entities.len(), 2);
    }

    #[test]
    fn entity_primary_keys_resolved() {
        let ir = parse_sdl_source(starter_schema_json()).unwrap();
        for entity in &ir.entities {
            assert_eq!(entity.primary_key, "id", "entity {} pk", entity.name);
        }
    }

    #[test]
    fn config_parsed() {
        let ir = parse_sdl_source(starter_schema_json()).unwrap();
        let lf = ir.config.local_first.unwrap();
        assert_eq!(lf.engine.unwrap(), "pglite");
        assert_eq!(lf.sync.unwrap(), "electric");
        let ai = ir.config.ai.unwrap();
        assert!(ai.mcp);
        assert!(!ai.a2a);
    }

    #[test]
    fn rejects_enum_without_values() {
        let bad = r#"{
          "version": "1.0",
          "entities": {
            "thing": {
              "fields": {
                "id":   { "type": "uuid", "primary": true },
                "kind": { "type": "enum" }
              }
            }
          }
        }"#;
        let err = parse_sdl_source(bad).unwrap_err().to_string();
        assert!(err.contains("values"), "expected values error: {err}");
    }

    #[test]
    fn rejects_unknown_relation_target() {
        let bad = r#"{
          "version": "1.0",
          "entities": {
            "user": {
              "fields": { "id": { "type": "uuid", "primary": true } },
              "relations": {
                "ghosts": { "type": "hasMany", "target": "ghost" }
              }
            }
          }
        }"#;
        let err = parse_sdl_source(bad).unwrap_err().to_string();
        assert!(err.contains("ghost"), "expected cross-ref error: {err}");
    }

    #[test]
    fn rejects_missing_primary_key() {
        let bad = r#"{
          "version": "1.0",
          "entities": {
            "thing": {
              "fields": {
                "name": { "type": "string", "required": true }
              }
            }
          }
        }"#;
        let err = parse_sdl_source(bad).unwrap_err().to_string();
        assert!(err.contains("primary"), "expected primary-key error: {err}");
    }

    #[test]
    fn rejects_unknown_scalar_type() {
        let bad = r#"{
          "version": "1.0",
          "entities": {
            "thing": {
              "fields": {
                "id":   { "type": "uuid",    "primary": true },
                "data": { "type": "bigint" }
              }
            }
          }
        }"#;
        let err = parse_sdl_source(bad).unwrap_err().to_string();
        assert!(err.contains("bigint"), "expected unknown-type error: {err}");
    }
}
