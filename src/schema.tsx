import React, { useMemo } from "react";
import type { FieldDescriptor, FieldType } from "./ui/entity-sheets";
import { getValueAtPath } from "./object-path";

export interface JsonSchemaObject {
  $id?: string;
  title?: string;
  description?: string;
  type?: string | string[];
  format?: string;
  enum?: unknown[];
  default?: unknown;
  properties?: Record<string, JsonSchemaObject>;
  items?: JsonSchemaObject;
  required?: string[];
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

export interface SchemaFieldDescriptor<TEntity extends Record<string, unknown> = Record<string, unknown>>
  extends FieldDescriptor<TEntity> {
  schemaPath: string;
  schema: JsonSchemaObject;
  componentHint?: string;
}

export interface BuildEntityFieldsFromSchemaOptions {
  schema: JsonSchemaObject;
  rootField?: string;
}

export interface GraphSnapshotWithSchemasOptions {
  scope: string;
  data: unknown;
  schemas: Array<EntityJsonSchemaConfig | null | undefined>;
  pretty?: boolean;
}

const schemaRegistry = new Map<string, EntityJsonSchemaConfig>();

export function registerEntityJsonSchema(config: EntityJsonSchemaConfig) {
  const key = registryKey(config.entityType, config.field, config.schemaId);
  schemaRegistry.set(key, config);
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

export function useSchemaEntityFields<TEntity extends Record<string, unknown> = Record<string, unknown>>(
  opts: GetEntityJsonSchemaOptions & { schema?: JsonSchemaObject; rootField?: string },
) {
  return useMemo(() => {
    const schema = opts.schema ?? getEntityJsonSchema(opts)?.schema;
    if (!schema) return [];
    return buildEntityFieldsFromSchema<TEntity>({ schema, rootField: opts.rootField ?? opts.field });
  }, [opts.entityType, opts.field, opts.rootField, opts.schemaId, opts.schema]);
}

export function buildEntityFieldsFromSchema<TEntity extends Record<string, unknown> = Record<string, unknown>>(
  opts: BuildEntityFieldsFromSchemaOptions,
): SchemaFieldDescriptor<TEntity>[] {
  return buildSchemaFields<TEntity>(opts.schema, opts.rootField ?? "", "");
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
  const blocks = escaped.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => renderMarkdownBlock(block)).join("");
}

export function MarkdownFieldRenderer({ value, className }: { value: string; className?: string }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(value ?? "") }}
    />
  );
}

export function MarkdownFieldEditor({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-2">
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[120px] rounded-md border bg-muted/50 px-3 py-2 text-sm resize-y focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
      />
      <div className="rounded-md border bg-background px-3 py-2">
        <MarkdownFieldRenderer value={value} className="prose prose-sm max-w-none" />
      </div>
    </div>
  );
}

export function createMarkdownDetailRenderer<TEntity extends Record<string, unknown>>(field: string) {
  return (value: unknown, entity: TEntity) => (
    <MarkdownFieldRenderer value={String(value ?? getValueAtPath(entity, field) ?? "")} className="prose prose-sm max-w-none" />
  );
}

function buildSchemaFields<TEntity extends Record<string, unknown>>(
  schema: JsonSchemaObject,
  pathPrefix: string,
  schemaPathPrefix: string,
): SchemaFieldDescriptor<TEntity>[] {
  if (schema.type === "object" && schema.properties) {
    const entries = Object.entries(schema.properties).sort(([, left], [, right]) => {
      const l = left["x-display-order"] ?? Number.MAX_SAFE_INTEGER;
      const r = right["x-display-order"] ?? Number.MAX_SAFE_INTEGER;
      return l - r;
    });

    return entries.flatMap(([key, childSchema]) => {
      if (childSchema["x-hidden"]) return [];
      const field = pathPrefix ? `${pathPrefix}.${key}` : key;
      const schemaPath = schemaPathPrefix ? `${schemaPathPrefix}.${key}` : key;
      if (childSchema.type === "object" && childSchema.properties) {
        return buildSchemaFields<TEntity>(childSchema, field, schemaPath);
      }
      return [schemaField<TEntity>(field, schemaPath, childSchema, schema.required?.includes(key) ?? false)];
    });
  }

  return [];
}

function schemaField<TEntity extends Record<string, unknown>>(
  field: string,
  schemaPath: string,
  schema: JsonSchemaObject,
  required: boolean,
): SchemaFieldDescriptor<TEntity> {
  const type = inferFieldType(schema);
  const descriptor: SchemaFieldDescriptor<TEntity> = {
    field,
    label: schema.title ?? humanize(field.split(".").pop() ?? field),
    type,
    required,
    hint: schema.description,
    schemaPath,
    schema,
    componentHint: schema["x-a2ui-component"],
  };

  if (schema.enum) {
    descriptor.options = schema.enum.map((value) => ({
      value: String(value),
      label: String(value),
    }));
  }

  if (type === "markdown") {
    descriptor.render = createMarkdownDetailRenderer(field);
  }

  return descriptor;
}

function inferFieldType(schema: JsonSchemaObject): FieldType {
  const forced = schema["x-field-type"];
  if (forced === "markdown") return "markdown";
  if (schema.format === "markdown") return "markdown";
  if (schema.enum) return "enum";

  const type = Array.isArray(schema.type) ? schema.type[0] : schema.type;
  switch (type) {
    case "boolean":
      return "boolean";
    case "integer":
    case "number":
      return "number";
    case "string":
      if (schema.format === "email") return "email";
      if (schema.format === "uri" || schema.format === "url") return "url";
      if (schema.format === "date" || schema.format === "date-time") return "date";
      return "text";
    case "array":
    case "object":
      return "json";
    default:
      return "text";
  }
}

function registryKey(entityType: string, field?: string, schemaId?: string) {
  return `${entityType}::${field ?? "*"}::${schemaId ?? "*"}`;
}

function humanize(value: string) {
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
