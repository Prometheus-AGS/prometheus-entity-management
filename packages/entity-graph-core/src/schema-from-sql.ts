/**
 * schema-from-sql.ts
 *
 * Generates a JSON Schema (and registers it via `registerEntityJsonSchema`)
 * directly from a Postgres `CREATE TABLE` statement. Lets a consumer keep
 * `latest-data/supabase/migrations/*.sql` as the single source of truth for
 * column shapes — no hand-maintained TypeScript schema duplicates.
 *
 * Deliberately regex-based: a real SQL parser is overkill for the slice of
 * DDL we care about, and would add a non-trivial runtime dep.
 *
 * Type mapping
 * ------------
 *   UUID, TEXT, VARCHAR(*)             -> { type: "string" }
 *   INTEGER, INT, BIGINT, SMALLINT     -> { type: "integer" }
 *   NUMERIC(*), DECIMAL(*)             -> { type: "number" }
 *   BOOLEAN, BOOL                      -> { type: "boolean" }
 *   TIMESTAMPTZ, TIMESTAMP             -> { type: "string", format: "date-time" }
 *   DATE                               -> { type: "string", format: "date" }
 *   JSONB, JSON                        -> { type: "object" }
 *   TEXT[]                             -> { type: "array", items: { type: "string" } }
 *   anything else                      -> { type: "string" } + "x-warning"
 *
 * `required` is populated from `NOT NULL` columns that lack a `DEFAULT`.
 * Callers can pass `overrides` to deep-merge a partial config (typically to
 * narrow a JSONB column to an array, or to add `enum`/`format` hints).
 */

import {
  registerEntityJsonSchema,
  type EntityJsonSchemaConfig,
  type JsonSchemaObject,
} from "./schema";

export interface RegisterEntityFromSqlOptions {
  entityType: string;
  /** A single `CREATE TABLE` statement (extra DDL around it is ignored). */
  createTableSql: string;
  /** Optional deep-merge overrides (overrides win). */
  overrides?: Partial<EntityJsonSchemaConfig>;
}

interface ParsedColumn {
  name: string;
  sqlType: string;
  notNull: boolean;
  hasDefault: boolean;
}

interface ParsedTable {
  tableName: string;
  columns: ParsedColumn[];
}

/**
 * Parse a `CREATE TABLE` block. Exposed for tests and for callers who need
 * the intermediate representation.
 */
export function parseCreateTable(sql: string): ParsedTable {
  // Capture: CREATE TABLE [IF NOT EXISTS] <name> ( <body> )
  const headerMatch = sql.match(
    /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?["]?([A-Za-z_][A-Za-z0-9_]*)["]?\s*\(([\s\S]*)\)\s*;?\s*$/im,
  );
  if (!headerMatch) {
    throw new Error("parseCreateTable: could not locate a CREATE TABLE block");
  }
  const tableName = headerMatch[1];
  const body = headerMatch[2];

  const columns: ParsedColumn[] = [];
  for (const rawLine of splitTopLevelCommas(body)) {
    const line = rawLine.trim();
    if (!line) continue;
    // Skip table-level constraints (PRIMARY KEY, FOREIGN KEY, UNIQUE, CHECK,
    // CONSTRAINT, LIKE, EXCLUDE).
    if (/^(?:PRIMARY\s+KEY|FOREIGN\s+KEY|UNIQUE|CHECK|CONSTRAINT|LIKE|EXCLUDE)\b/i.test(line)) {
      continue;
    }
    const colMatch = line.match(/^["]?([A-Za-z_][A-Za-z0-9_]*)["]?\s+([A-Za-z][A-Za-z0-9_]*(?:\s*\([^)]*\))?(?:\s*\[\s*\])?)([\s\S]*)$/);
    if (!colMatch) continue;
    const name = colMatch[1];
    const sqlType = colMatch[2].replace(/\s+/g, "").toUpperCase();
    const rest = colMatch[3].toUpperCase();
    const notNull = /\bNOT\s+NULL\b/.test(rest);
    const hasDefault = /\bDEFAULT\b/.test(rest);
    columns.push({ name, sqlType, notNull, hasDefault });
  }

  return { tableName, columns };
}

/**
 * Split a parenthesised body on top-level commas (ignoring commas inside
 * nested parens like `NUMERIC(10, 2)`).
 */
function splitTopLevelCommas(body: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of body) {
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (ch === "," && depth === 0) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

/**
 * Map a normalized (uppercased, whitespace-stripped) SQL type to a JSON
 * schema fragment.
 *
 * Returns `{ schema, warning }` so the caller can surface "unmapped type"
 * notes via `x-warning` on the property.
 */
export function sqlTypeToJsonSchema(sqlType: string): {
  schema: JsonSchemaObject;
  warning?: string;
} {
  const t = sqlType.replace(/\s+/g, "").toUpperCase();

  if (/^TEXT\[\]$/.test(t)) {
    return { schema: { type: "array", items: { type: "string" } } };
  }
  if (t === "UUID" || t === "TEXT" || /^VARCHAR(\(.*\))?$/.test(t) || /^CHAR(\(.*\))?$/.test(t)) {
    return { schema: { type: "string" } };
  }
  if (t === "INTEGER" || t === "INT" || t === "BIGINT" || t === "SMALLINT" || t === "INT4" || t === "INT8" || t === "INT2") {
    return { schema: { type: "integer" } };
  }
  if (/^NUMERIC(\(.*\))?$/.test(t) || /^DECIMAL(\(.*\))?$/.test(t) || t === "REAL" || t === "DOUBLEPRECISION" || t === "FLOAT") {
    return { schema: { type: "number" } };
  }
  if (t === "BOOLEAN" || t === "BOOL") {
    return { schema: { type: "boolean" } };
  }
  if (t === "TIMESTAMPTZ" || t === "TIMESTAMP" || t === "TIMESTAMPWITHTIMEZONE" || t === "TIMESTAMPWITHOUTTIMEZONE") {
    return { schema: { type: "string", format: "date-time" } };
  }
  if (t === "DATE") {
    return { schema: { type: "string", format: "date" } };
  }
  if (t === "JSONB" || t === "JSON") {
    return { schema: { type: "object" } };
  }
  return {
    schema: { type: "string" },
    warning: `sql type "${sqlType}" not explicitly mapped; defaulting to string`,
  };
}

/**
 * Untyped deep-merge used by `mergeEntityConfig`. Generic and `unknown`-typed
 * to keep this internal helper free of the interface-vs-Record friction that
 * strict-mode `Record<string, unknown>` introduces with named interfaces.
 *
 * @internal
 */
function deepMergeUnknown(
  base: Record<string, unknown>,
  override: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseValue = base[key];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      baseValue !== null &&
      typeof baseValue === "object" &&
      !Array.isArray(baseValue)
    ) {
      out[key] = deepMergeUnknown(
        baseValue as Record<string, unknown>,
        value as Record<string, unknown>,
      );
    } else {
      out[key] = value;
    }
  }
  return out;
}

/**
 * Merge a generated `EntityJsonSchemaConfig` with an optional caller-supplied
 * overrides object. Required fields (`entityType`, `schema`) always come from
 * the generated value; overrides may extend them but cannot remove them.
 */
function mergeEntityConfig(
  generated: EntityJsonSchemaConfig,
  overrides?: Partial<EntityJsonSchemaConfig>,
): EntityJsonSchemaConfig {
  if (!overrides) return generated;
  const merged = deepMergeUnknown(
    generated as unknown as Record<string, unknown>,
    overrides as unknown as Record<string, unknown>,
  );
  // Re-impose the required fields from the generated source — overrides may
  // not erase them, only refine them.
  // The deepMerge result is structurally compatible but TypeScript can't
  // narrow it back through the Record<> intermediate; the explicit
  // `unknown` hop is the documented escape per the TS strict-mode contract.
  const refined = merged as unknown as EntityJsonSchemaConfig;
  return {
    ...refined,
    entityType: generated.entityType,
    schema: refined.schema ?? generated.schema,
  };
}

/**
 * Build (and register) an `EntityJsonSchemaConfig` from a CREATE TABLE
 * statement. Returns the registered config so callers can introspect it.
 */
export function registerEntityFromSql(
  opts: RegisterEntityFromSqlOptions,
): EntityJsonSchemaConfig {
  const parsed = parseCreateTable(opts.createTableSql);
  const properties: Record<string, JsonSchemaObject> = {};
  const required: string[] = [];

  for (const col of parsed.columns) {
    const { schema, warning } = sqlTypeToJsonSchema(col.sqlType);
    const propSchema: JsonSchemaObject = { ...schema };
    if (warning) {
      (propSchema as Record<string, unknown>)["x-warning"] = warning;
    }
    properties[col.name] = propSchema;
    if (col.notNull && !col.hasDefault) {
      required.push(col.name);
    }
  }

  const generated: EntityJsonSchemaConfig = {
    entityType: opts.entityType,
    source: "runtime",
    schema: {
      type: "object",
      title: parsed.tableName,
      properties,
      required,
    },
  };

  const config = mergeEntityConfig(generated, opts.overrides);
  registerEntityJsonSchema(config);
  return config;
}
