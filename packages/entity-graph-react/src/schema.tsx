/**
 * schema.tsx (entity-graph-react)
 *
 * React field renderers/editors + schema→field builder, built on the
 * framework-agnostic schema registry in @prometheus-ags/entity-graph-core.
 *
 * The registry + JSON-schema primitives live in core and are RE-EXPORTED here
 * so existing consumers keep working. There is exactly ONE registry (core's) —
 * no duplication (a duplicate registry would silently desync schema lookups).
 */
import React, { useMemo } from "react";
import type { FieldDescriptor, FieldType } from "./ui/entity-sheets";
import {
  getValueAtPath,
  getEntityJsonSchema,
  renderMarkdownToHtml,
  inferSchemaFieldType,
  humanizeFieldName,
  type JsonSchemaObject,
  type GetEntityJsonSchemaOptions,
} from "@prometheus-ags/entity-graph-core";

// Re-export the core registry + primitives (single source of truth).
export {
  registerEntityJsonSchema,
  registerRuntimeSchema,
  getEntityJsonSchema,
  exportGraphSnapshotWithSchemas,
  escapeHtml,
  renderMarkdownToHtml,
} from "@prometheus-ags/entity-graph-core";
export type {
  JsonSchemaObject,
  EntityJsonSchemaConfig,
  GetEntityJsonSchemaOptions,
  GraphSnapshotWithSchemasOptions,
} from "@prometheus-ags/entity-graph-core";

// ── React-specific field descriptors (depend on the UI FieldDescriptor type) ──

export interface SchemaFieldDescriptor<TEntity extends object = Record<string, unknown>>
  extends FieldDescriptor<TEntity> {
  schemaPath: string;
  schema: JsonSchemaObject;
  componentHint?: string;
}

export interface BuildEntityFieldsFromSchemaOptions {
  schema: JsonSchemaObject;
  rootField?: string;
}

export function useSchemaEntityFields<TEntity extends object = Record<string, unknown>>(
  opts: GetEntityJsonSchemaOptions & { schema?: JsonSchemaObject; rootField?: string },
) {
  return useMemo(() => {
    const schema = opts.schema ?? getEntityJsonSchema(opts)?.schema;
    if (!schema) return [];
    return buildEntityFieldsFromSchema<TEntity>({ schema, rootField: opts.rootField ?? opts.field });
  }, [opts.entityType, opts.field, opts.rootField, opts.schemaId, opts.schema]);
}

export function buildEntityFieldsFromSchema<TEntity extends object = Record<string, unknown>>(
  opts: BuildEntityFieldsFromSchemaOptions,
): SchemaFieldDescriptor<TEntity>[] {
  return buildSchemaFields<TEntity>(opts.schema, opts.rootField ?? "", "");
}

export function MarkdownFieldRenderer({ value, className }: { value: string; className?: string }) {
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(value ?? "") }} />
  );
}

export function MarkdownFieldEditor({
  value, onChange, placeholder,
}: { value: string; onChange: (value: string) => void; placeholder?: string }) {
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

export function createMarkdownDetailRenderer<TEntity extends object>(field: string) {
  return (value: unknown, entity: TEntity) => (
    <MarkdownFieldRenderer value={String(value ?? getValueAtPath(entity, field) ?? "")} className="prose prose-sm max-w-none" />
  );
}

function buildSchemaFields<TEntity extends object>(
  schema: JsonSchemaObject, pathPrefix: string, schemaPathPrefix: string,
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

function schemaField<TEntity extends object>(
  field: string, schemaPath: string, schema: JsonSchemaObject, required: boolean,
): SchemaFieldDescriptor<TEntity> {
  const type = inferSchemaFieldType(schema) as FieldType;
  const descriptor: SchemaFieldDescriptor<TEntity> = {
    field,
    label: schema.title ?? humanizeFieldName(field.split(".").pop() ?? field),
    type,
    required,
    hint: schema.description,
    schemaPath,
    schema,
    componentHint: schema["x-a2ui-component"],
  };
  if (schema.enum) {
    descriptor.options = schema.enum.map((value) => ({ value: String(value), label: String(value) }));
  }
  if (type === "markdown") descriptor.render = createMarkdownDetailRenderer(field);
  return descriptor;
}
