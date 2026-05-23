import { describe, it, expect } from "vitest";
import {
  parseCreateTable,
  registerEntityFromSql,
  sqlTypeToJsonSchema,
} from "./schema-from-sql";
import { getEntityJsonSchema } from "./schema";

// V2 `company` table from
// latest-data/supabase/migrations/20260523000004_v2_schema_company_user.sql
const COMPANY_DDL = `
CREATE TABLE IF NOT EXISTS company (
    id                      UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    legacy_id               TEXT        UNIQUE,
    name                    TEXT        NOT NULL,
    email                   TEXT,
    sender_email            TEXT,
    phone                   TEXT,
    website                 TEXT,
    address                 TEXT,
    city                    TEXT,
    state                   TEXT,
    zip                     TEXT,
    owner_id                UUID,
    subscription_tier       TEXT,
    is_active               BOOLEAN     NOT NULL DEFAULT TRUE,
    stripe_customer_id      TEXT,
    marketplace_post_jobs   BOOLEAN     NOT NULL DEFAULT FALSE,
    marketplace_fill_jobs   BOOLEAN     NOT NULL DEFAULT FALSE,
    has_hsh_addon           BOOLEAN     NOT NULL DEFAULT FALSE,
    hsh_rating              NUMERIC,
    hsh_reviews_count       INTEGER,
    show_debug_info         BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_sample               BOOLEAN     NOT NULL DEFAULT FALSE,
    created_by_id           UUID,
    created_by              TEXT
);
`;

describe("parseCreateTable", () => {
  it("extracts table name and all columns", () => {
    const parsed = parseCreateTable(COMPANY_DDL);
    expect(parsed.tableName).toBe("company");
    const names = parsed.columns.map((c) => c.name);
    expect(names).toContain("id");
    expect(names).toContain("name");
    expect(names).toContain("is_active");
    expect(names).toContain("hsh_rating");
    expect(names).toContain("created_at");
  });

  it("captures NOT NULL and DEFAULT flags", () => {
    const parsed = parseCreateTable(COMPANY_DDL);
    const name = parsed.columns.find((c) => c.name === "name");
    expect(name?.notNull).toBe(true);
    expect(name?.hasDefault).toBe(false);
    const isActive = parsed.columns.find((c) => c.name === "is_active");
    expect(isActive?.notNull).toBe(true);
    expect(isActive?.hasDefault).toBe(true);
  });
});

describe("sqlTypeToJsonSchema", () => {
  it("maps the common Postgres types", () => {
    expect(sqlTypeToJsonSchema("UUID").schema).toEqual({ type: "string" });
    expect(sqlTypeToJsonSchema("TEXT").schema).toEqual({ type: "string" });
    expect(sqlTypeToJsonSchema("BOOLEAN").schema).toEqual({ type: "boolean" });
    expect(sqlTypeToJsonSchema("INTEGER").schema).toEqual({ type: "integer" });
    expect(sqlTypeToJsonSchema("NUMERIC").schema).toEqual({ type: "number" });
    expect(sqlTypeToJsonSchema("TIMESTAMPTZ").schema).toEqual({
      type: "string",
      format: "date-time",
    });
    expect(sqlTypeToJsonSchema("DATE").schema).toEqual({
      type: "string",
      format: "date",
    });
    expect(sqlTypeToJsonSchema("JSONB").schema).toEqual({ type: "object" });
    expect(sqlTypeToJsonSchema("TEXT[]").schema).toEqual({
      type: "array",
      items: { type: "string" },
    });
  });

  it("flags unknown types with a warning", () => {
    const { schema, warning } = sqlTypeToJsonSchema("WIDGET");
    expect(schema).toEqual({ type: "string" });
    expect(warning).toMatch(/not explicitly mapped/);
  });
});

describe("registerEntityFromSql", () => {
  it("builds and registers a JSON Schema from the company DDL", () => {
    const config = registerEntityFromSql({
      entityType: "CompanyFromSql",
      createTableSql: COMPANY_DDL,
    });
    expect(config.entityType).toBe("CompanyFromSql");
    expect(config.schema.type).toBe("object");
    const props = config.schema.properties ?? {};
    expect(props.id).toEqual({ type: "string" });
    expect(props.name).toEqual({ type: "string" });
    expect(props.is_active).toEqual({ type: "boolean" });
    expect(props.hsh_rating).toEqual({ type: "number" });
    expect(props.created_at).toEqual({ type: "string", format: "date-time" });

    // `name` is NOT NULL without a DEFAULT -> required.
    // `is_active` is NOT NULL but has DEFAULT TRUE -> NOT required.
    expect(config.schema.required).toContain("name");
    expect(config.schema.required).not.toContain("is_active");

    const fetched = getEntityJsonSchema({ entityType: "CompanyFromSql" });
    expect(fetched).not.toBeNull();
    expect(fetched?.schema.properties?.id).toEqual({ type: "string" });
  });

  it("deep-merges overrides over generated schema", () => {
    const config = registerEntityFromSql({
      entityType: "CompanyOverride",
      createTableSql: COMPANY_DDL,
      overrides: {
        schema: {
          properties: {
            subscription_tier: {
              type: "string",
              enum: ["free", "pro", "enterprise"],
            },
          },
        },
      },
    });
    expect(config.schema.properties?.subscription_tier).toEqual({
      type: "string",
      enum: ["free", "pro", "enterprise"],
    });
    // Other properties survive the merge.
    expect(config.schema.properties?.name).toEqual({ type: "string" });
  });
});
