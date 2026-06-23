/**
 * @prometheus-ags/entity-graph-sdl
 *
 * The Schema Definition Language (SDL) for the entity graph: a stable JSON/TOML
 * schema format + a parser that produces a validated intermediate
 * representation (IR). Every code generator (Rust CLI, Flutter, framework
 * bindings) consumes the SAME IR so generated targets never diverge.
 *
 * Format (schema.json):
 * {
 *   "version": "1.0",
 *   "entities": {
 *     "user": {
 *       "fields": { "id": {"type":"string","primary":true}, "name": {"type":"string","required":true} },
 *       "relations": { "orders": {"type":"hasMany","target":"order","foreignKey":"userId"} }
 *     }
 *   },
 *   "config": { "localFirst": {"engine":"pglite","sync":"electric"}, "ai": {"mcp":true,"a2a":true} }
 * }
 */

// ── Source format types ───────────────────────────────────────────────────

export type SdlScalarType =
  | "string" | "number" | "integer" | "decimal" | "boolean"
  | "datetime" | "date" | "json" | "enum" | "uuid";

export interface SdlFieldDef {
  type: SdlScalarType;
  primary?: boolean;
  required?: boolean;
  unique?: boolean;
  default?: unknown;
  /** For enum fields. */
  values?: string[];
  /** Auto-managed by the store/server (e.g. createdAt). */
  auto?: boolean;
}

export type SdlRelationKind = "belongsTo" | "hasMany" | "manyToMany";

export interface SdlRelationDef {
  type: SdlRelationKind;
  target: string;
  foreignKey?: string;
  /** For manyToMany. */
  through?: string;
}

export interface SdlEntityDef {
  fields: Record<string, SdlFieldDef>;
  relations?: Record<string, SdlRelationDef>;
  /** Optional table name override (defaults to the entity key). */
  table?: string;
}

export interface SdlConfig {
  localFirst?: { engine?: "pglite" | "sqlite" | "none"; sync?: "electric" | "yjs" | "none" };
  ai?: { mcp?: boolean; a2a?: boolean };
}

export interface SdlDocument {
  version: string;
  entities: Record<string, SdlEntityDef>;
  config?: SdlConfig;
}

// ── Validated IR (what generators consume) ────────────────────────────────

export interface IrField extends SdlFieldDef {
  name: string;
}
export interface IrRelation extends SdlRelationDef {
  name: string;
}
export interface IrEntity {
  name: string;
  table: string;
  primaryKey: string;
  fields: IrField[];
  relations: IrRelation[];
}
export interface EntityGraphIR {
  version: string;
  entities: IrEntity[];
  config: SdlConfig;
}

export class SdlValidationError extends Error {
  readonly path: string;
  constructor(message: string, path: string) {
    super(`${message} (at ${path})`);
    this.name = "SdlValidationError";
    this.path = path;
  }
}

const SCALAR_TYPES = new Set<SdlScalarType>([
  "string", "number", "integer", "decimal", "boolean", "datetime", "date", "json", "enum", "uuid",
]);

/**
 * Parse + validate an SDL document into the generator IR. Throws
 * {@link SdlValidationError} with a precise path on the first problem.
 */
export function parseSdl(doc: unknown): EntityGraphIR {
  if (!isObject(doc)) throw new SdlValidationError("SDL root must be an object", "$");
  const version = typeof doc.version === "string" ? doc.version : "1.0";
  if (!isObject(doc.entities)) throw new SdlValidationError("`entities` must be an object", "$.entities");

  const entities: IrEntity[] = [];
  for (const [name, raw] of Object.entries(doc.entities)) {
    const path = `$.entities.${name}`;
    if (!isObject(raw) || !isObject(raw.fields)) {
      throw new SdlValidationError("entity must have a `fields` object", path);
    }
    const def = raw as unknown as SdlEntityDef;

    const fields: IrField[] = [];
    let primaryKey: string | null = null;
    for (const [fname, fdefRaw] of Object.entries(def.fields)) {
      const fpath = `${path}.fields.${fname}`;
      if (!isObject(fdefRaw)) throw new SdlValidationError("field must be an object", fpath);
      const fdef = fdefRaw as SdlFieldDef;
      if (!SCALAR_TYPES.has(fdef.type)) throw new SdlValidationError(`unknown field type "${fdef.type}"`, fpath);
      if (fdef.type === "enum" && (!Array.isArray(fdef.values) || fdef.values.length === 0)) {
        throw new SdlValidationError("enum field requires non-empty `values`", fpath);
      }
      if (fdef.primary) {
        if (primaryKey) throw new SdlValidationError("multiple primary keys not supported", fpath);
        primaryKey = fname;
      }
      fields.push({ ...fdef, name: fname });
    }
    if (!primaryKey) throw new SdlValidationError("entity needs exactly one `primary: true` field", path);

    const relations: IrRelation[] = [];
    for (const [rname, rdefRaw] of Object.entries(def.relations ?? {})) {
      const rpath = `${path}.relations.${rname}`;
      if (!isObject(rdefRaw)) throw new SdlValidationError("relation must be an object", rpath);
      const rdef = rdefRaw as SdlRelationDef;
      if (!["belongsTo", "hasMany", "manyToMany"].includes(rdef.type)) {
        throw new SdlValidationError(`unknown relation type "${rdef.type}"`, rpath);
      }
      if (typeof rdef.target !== "string") throw new SdlValidationError("relation needs a `target`", rpath);
      relations.push({ ...rdef, name: rname });
    }

    entities.push({ name, table: def.table ?? name, primaryKey, fields, relations });
  }

  // Cross-reference relation targets.
  const names = new Set(entities.map((e) => e.name));
  for (const e of entities) {
    for (const r of e.relations) {
      if (!names.has(r.target)) {
        throw new SdlValidationError(`relation target "${r.target}" is not a defined entity`, `$.entities.${e.name}.relations.${r.name}`);
      }
    }
  }

  return { version, entities, config: (doc.config as SdlConfig) ?? {} };
}

/** Parse SDL from a JSON string. */
export function parseSdlJson(json: string): EntityGraphIR {
  let doc: unknown;
  try { doc = JSON.parse(json); } catch (cause) {
    throw new SdlValidationError("invalid JSON", "$");
  }
  return parseSdl(doc);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
