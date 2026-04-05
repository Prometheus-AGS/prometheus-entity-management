import { useGraphStore } from "./graph";
import { queryOnce } from "./graph-query";
import { exportGraphSnapshotWithSchemas, getEntityJsonSchema } from "./schema";

export interface GraphSnapshotExportOptions {
  scope: string;
  data: unknown;
  pretty?: boolean;
}

export interface GraphToolContext {
  store: ReturnType<typeof useGraphStore.getState>;
  queryOnce: typeof queryOnce;
  exportGraphSnapshot: typeof exportGraphSnapshot;
}

export interface SchemaGraphToolContext extends GraphToolContext {
  getEntityJsonSchema: typeof getEntityJsonSchema;
  exportGraphSnapshotWithSchemas: typeof exportGraphSnapshotWithSchemas;
}

export function exportGraphSnapshot(opts: GraphSnapshotExportOptions): string {
  const payload = {
    scope: opts.scope,
    generatedAt: new Date().toISOString(),
    data: opts.data,
  };
  return JSON.stringify(payload, null, opts.pretty === false ? 0 : 2);
}

export function createGraphTool<TInput, TResult>(
  handler: (input: TInput, ctx: GraphToolContext) => Promise<TResult> | TResult,
) {
  return (input: TInput) =>
    handler(input, {
      store: useGraphStore.getState(),
      queryOnce,
      exportGraphSnapshot,
    });
}

export function createSchemaGraphTool<TInput, TResult>(
  handler: (input: TInput, ctx: SchemaGraphToolContext) => Promise<TResult> | TResult,
) {
  return (input: TInput) =>
    handler(input, {
      store: useGraphStore.getState(),
      queryOnce,
      exportGraphSnapshot,
      getEntityJsonSchema,
      exportGraphSnapshotWithSchemas,
    });
}
