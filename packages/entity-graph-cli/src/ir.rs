//! Intermediate representation (IR) types mirrored from `@prometheus-ags/entity-graph-sdl`.
//!
//! These structs map 1-to-1 onto the JSON shape produced by `parseSdl()` so that
//! the CLI can deserialize any `EntityGraphIR` JSON that the TS SDL parser emits.

use serde::{Deserialize, Serialize};

// ── Scalar types ─────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ScalarType {
    String,
    Number,
    Integer,
    Decimal,
    Boolean,
    Datetime,
    Date,
    Json,
    Enum,
    Uuid,
}

impl ScalarType {
    /// Map the SDL scalar to a TypeScript type string.
    pub fn to_ts_type(&self, values: Option<&[String]>) -> String {
        match self {
            ScalarType::String => "string".to_owned(),
            ScalarType::Number | ScalarType::Decimal => "number".to_owned(),
            ScalarType::Integer => "number".to_owned(),
            ScalarType::Boolean => "boolean".to_owned(),
            ScalarType::Datetime | ScalarType::Date => "string".to_owned(),
            ScalarType::Json => "unknown".to_owned(),
            ScalarType::Uuid => "string".to_owned(),
            ScalarType::Enum => {
                if let Some(vs) = values {
                    if vs.is_empty() {
                        "string".to_owned()
                    } else {
                        vs.iter()
                            .map(|v| format!("\"{}\"", v))
                            .collect::<Vec<_>>()
                            .join(" | ")
                    }
                } else {
                    "string".to_owned()
                }
            }
        }
    }
}

// ── Field ─────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IrField {
    pub name: String,
    #[serde(rename = "type")]
    pub field_type: ScalarType,
    #[serde(default)]
    pub primary: bool,
    #[serde(default)]
    pub required: bool,
    #[serde(default)]
    pub unique: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub default: Option<serde_json::Value>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub values: Option<Vec<String>>,
    #[serde(default)]
    pub auto: bool,
}

impl IrField {
    /// TypeScript type including optionality marker.
    pub fn ts_type_string(&self) -> String {
        self.field_type.to_ts_type(self.values.as_deref())
    }

    /// Whether the field is optional in the TypeScript interface.
    pub fn is_optional(&self) -> bool {
        !self.required && !self.primary
    }
}

// ── Relation ──────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum RelationKind {
    BelongsTo,
    HasMany,
    ManyToMany,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IrRelation {
    pub name: String,
    #[serde(rename = "type")]
    pub kind: RelationKind,
    pub target: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub foreign_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub through: Option<String>,
}

// ── Entity ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IrEntity {
    pub name: String,
    pub table: String,
    pub primary_key: String,
    pub fields: Vec<IrField>,
    pub relations: Vec<IrRelation>,
}

// ── Config ────────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct LocalFirstConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub engine: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sync: Option<String>,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct AiConfig {
    #[serde(default)]
    pub mcp: bool,
    #[serde(default)]
    pub a2a: bool,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct SdlConfig {
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_first: Option<LocalFirstConfig>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub ai: Option<AiConfig>,
}

// ── Root IR ───────────────────────────────────────────────────────────────────

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EntityGraphIR {
    pub version: String,
    pub entities: Vec<IrEntity>,
    #[serde(default)]
    pub config: SdlConfig,
}

// ── Tests ─────────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn sample_ir_json() -> serde_json::Value {
        json!({
            "version": "1.0",
            "entities": [
                {
                    "name": "user",
                    "table": "user",
                    "primary_key": "id",
                    "fields": [
                        { "name": "id", "type": "uuid", "primary": true, "required": true, "unique": true, "auto": false },
                        { "name": "name", "type": "string", "primary": false, "required": true, "unique": false, "auto": false },
                        { "name": "role", "type": "enum", "primary": false, "required": false, "unique": false, "auto": false,
                          "values": ["admin", "member"] }
                    ],
                    "relations": [
                        { "name": "orders", "type": "hasMany", "target": "order", "foreign_key": "userId" }
                    ]
                },
                {
                    "name": "order",
                    "table": "order",
                    "primary_key": "id",
                    "fields": [
                        { "name": "id", "type": "uuid", "primary": true, "required": true, "unique": true, "auto": false },
                        { "name": "userId", "type": "uuid", "primary": false, "required": true, "unique": false, "auto": false }
                    ],
                    "relations": [
                        { "name": "user", "type": "belongsTo", "target": "user", "foreign_key": "userId" }
                    ]
                }
            ],
            "config": {}
        })
    }

    #[test]
    fn deserialize_full_ir() {
        let ir: EntityGraphIR = serde_json::from_value(sample_ir_json()).unwrap();
        assert_eq!(ir.version, "1.0");
        assert_eq!(ir.entities.len(), 2);
        let user = &ir.entities[0];
        assert_eq!(user.name, "user");
        assert_eq!(user.primary_key, "id");
        assert_eq!(user.fields.len(), 3);
        assert_eq!(user.relations.len(), 1);
    }

    #[test]
    fn scalar_type_to_ts() {
        assert_eq!(ScalarType::String.to_ts_type(None), "string");
        assert_eq!(ScalarType::Integer.to_ts_type(None), "number");
        assert_eq!(ScalarType::Boolean.to_ts_type(None), "boolean");
        assert_eq!(ScalarType::Uuid.to_ts_type(None), "string");
        let e = ScalarType::Enum.to_ts_type(Some(&["a".into(), "b".into()]));
        assert_eq!(e, "\"a\" | \"b\"");
    }

    #[test]
    fn field_optionality() {
        let required_field = IrField {
            name: "name".into(),
            field_type: ScalarType::String,
            primary: false,
            required: true,
            unique: false,
            default: None,
            values: None,
            auto: false,
        };
        assert!(!required_field.is_optional());

        let optional_field = IrField {
            name: "bio".into(),
            field_type: ScalarType::String,
            primary: false,
            required: false,
            unique: false,
            default: None,
            values: None,
            auto: false,
        };
        assert!(optional_field.is_optional());
    }
}
