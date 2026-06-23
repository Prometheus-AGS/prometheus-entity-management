/**
 * schema.ts (core) — framework-agnostic JSON-schema registry + snapshot/markdown
 * helpers. The React field renderers/editors (MarkdownFieldRenderer,
 * MarkdownFieldEditor, useSchemaEntityFields, buildEntityFieldsFromSchema which
 * depends on the UI FieldDescriptor type) live in the react binding's schema.tsx,
 * built on these primitives.
 */

export interface JsonSchemaObject {
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  format?: string;
  enum?: readonly unknown[];
  default?: unknown;
  properties?: Record<string, JsonSchemaObject>;
  items?: JsonSchemaObject;
  required?: string[];
  additionalProperties?: boolean | JsonSchemaObject;
  ["x-a2ui-component"]?: string;
  ["x-display-order"]?: number;
  ["x-field-type"]?: string;
  ["x-hidden"]?: boolean;
}

export interface EntityJsonSchemaConfig {
  entityType: string;
  schemaId?: string;
  field?: string;
  version?: string;
  source?: "static" | "runtime" | "ai";
  schema: JsonSchemaObject;
}

export interface GetEntityJsonSchemaOptions {
  entityType: string;
  schemaId?: string;
  field?: string;
}

export interface GraphSnapshotWithSchemasOptions {
  scope: string;
  data: unknown;
  schemas: Array<EntityJsonSchemaConfig | null | undefined>;
  pretty?: boolean;
}

const schemaRegistry = new Map<string, EntityJsonSchemaConfig>();

export function registerEntityJsonSchema(config: EntityJsonSchemaConfig) {
  schemaRegistry.set(registryKey(config.entityType, config.field, config.schemaId), config);
}

export function registerRuntimeSchema(config: EntityJsonSchemaConfig) {
  registerEntityJsonSchema(config);
}

export function getEntityJsonSchema(opts: GetEntityJsonSchemaOptions): EntityJsonSchemaConfig | null {
  const exact = schemaRegistry.get(registryKey(opts.entityType, opts.field, opts.schemaId));
  if (exact) return exact;
  if (opts.field) {
    const byField = schemaRegistry.get(registryKey(opts.entityType, opts.field));
    if (byField) return byField;
  }
  if (opts.schemaId) {
    const byId = schemaRegistry.get(registryKey(opts.entityType, undefined, opts.schemaId));
    if (byId) return byId;
  }
  for (const schema of schemaRegistry.values()) {
    if (schema.entityType !== opts.entityType) continue;
    if (opts.field && schema.field !== opts.field) continue;
    return schema;
  }
  return null;
}

export function exportGraphSnapshotWithSchemas(opts: GraphSnapshotWithSchemasOptions): string {
  return JSON.stringify(
    {
      scope: opts.scope,
      generatedAt: new Date().toISOString(),
      data: opts.data,
      schemas: opts.schemas.filter(Boolean),
    },
    null,
    opts.pretty === false ? 0 : 2,
  );
}

export function escapeHtml(input: string): string {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function renderMarkdownToHtml(value: string): string {
  const escaped = escapeHtml(value);
  const blocks = escaped.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  return blocks.map((block) => renderMarkdownBlock(block)).join("");
}

/** Infer a coarse field-type string from a JSON-schema node (UI-agnostic). */
export function inferSchemaFieldType(schema: JsonSchemaObject): string {
  const forced = schema["x-field-type"];
  if (forced === "markdown") return "markdown";
  if (schema.format === "markdown") return "markdown";
  if (schema.enum) return "enum";
  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case "boolean": return "boolean";
    case "integer":
    case "number": return "number";
    case "string":
      if (schema.format === "email") return "email";
      if (schema.format === "uri" || schema.format === "url") return "url";
      if (schema.format === "date" || schema.format === "date-time") return "date";
      return "text";
    case "array":
    case "object": return "json";
    default: return "text";
  }
}

export function registryKey(entityType: string, field?: string, schemaId?: string) {
  return `${entityType}::${field ?? "*"}::${schemaId ?? "*"}`;
}

export function humanizeFieldName(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function renderMarkdownBlock(block: string): string {
  if (block.startsWith("# ")) return `<h1>${renderInlineMarkdown(block.slice(2))}</h1>`;
  if (block.startsWith("## ")) return `<h2>${renderInlineMarkdown(block.slice(3))}</h2>`;
  return `<p>${renderInlineMarkdown(block).replaceAll("\n", "<br/>")}</p>`;
}

function renderInlineMarkdown(block: string): string {
  return block.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}
