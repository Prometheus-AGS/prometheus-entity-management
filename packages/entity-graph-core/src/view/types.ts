/**
 * Transport-agnostic comparison operators. Same spec can compile to REST, SQL, GraphQL, or local JS (`evaluator`).
 * `custom` opts out of automatic serialization — use for predicates only the client can evaluate.
 */
export type FilterOperator = "eq"|"neq"|"gt"|"gte"|"lt"|"lte"|"in"|"nin"|"contains"|"startsWith"|"endsWith"|"isNull"|"isNotNull"|"between"|"arrayContains"|"arrayOverlaps"|"matches"|"custom";
/** Atomic filter: field path, operator, optional value, and optional JS predicate for `custom`. */
export interface FilterClause { field: string; op: FilterOperator; value?: unknown; predicate?: (fieldValue: unknown, entity: Record<string, unknown>) => boolean; }
export type FilterLogic = "and" | "or";
/** Nested boolean group so you can express `(A AND B) OR C` without losing structure when compiling to backends. */
export interface FilterGroup { logic: FilterLogic; clauses: Array<FilterClause | FilterGroup>; }
/** Top-level filter: flat AND list of clauses, or a recursive `FilterGroup`. */
export type FilterSpec = FilterGroup | FilterClause[];
export type SortDirection = "asc" | "desc";
/** Single sort key with optional null ordering and custom comparator for local sort parity with remote semantics. */
export interface SortClause { field: string; direction: SortDirection; nulls?: "first" | "last"; comparator?: (a: unknown, b: unknown) => number; }
/** Ordered multi-key sort (stable application in `compareEntities`). */
export type SortSpec = SortClause[];
/**
 * Everything `useEntityView` needs to describe a virtualized collection: filters, sorts, and simple multi-field search.
 * One descriptor can drive local evaluation, remote query compilation, or hybrid mode.
 */
export interface ViewDescriptor { filter?: FilterSpec; sort?: SortSpec; search?: { query: string; fields: string[]; minChars?: number }; }
/**
 * How complete local graph data is relative to the view: **local** (all in memory), **remote** (server must filter/sort), **hybrid** (show local fast + remote reconcile).
 */
export type CompletenessMode = "local" | "remote" | "hybrid";

/**
 * Compile a view to flat REST query params (`sort`, `q`, and `field[op]=value` keys). Skips `custom` clauses — those cannot be expressed as strings.
 */
export function toRestParams(view: ViewDescriptor): Record<string, string> {
  const params: Record<string, string> = {};
  if (view.filter) { const clauses = flattenClauses(view.filter); for (const c of clauses) { if (c.op === "custom") continue; const key = c.op === "eq" ? c.field : `${c.field}[${c.op}]`; params[key] = Array.isArray(c.value) ? (c.value as unknown[]).join(",") : String(c.value ?? ""); } }
  if (view.sort) params["sort"] = view.sort.map((s) => `${s.direction === "desc" ? "-" : ""}${s.field}`).join(",");
  if (view.search?.query) params["q"] = view.search.query;
  return params;
}

/**
 * Compile a view to parameterized SQL fragments for server-side filtering/sorting. Unknown ops become `TRUE` — validate or restrict ops at the edge.
 */
export function toSQLClauses(view: ViewDescriptor): { where: string; orderBy: string; params: unknown[] } {
  const params: unknown[] = []; let paramIdx = 1;
  function clauseToSQL(c: FilterClause): string {
    const col = `"${c.field}"`;
    switch (c.op) {
      case "eq": params.push(c.value); return `${col} = $${paramIdx++}`;
      case "neq": params.push(c.value); return `${col} != $${paramIdx++}`;
      case "gt": params.push(c.value); return `${col} > $${paramIdx++}`;
      case "gte": params.push(c.value); return `${col} >= $${paramIdx++}`;
      case "lt": params.push(c.value); return `${col} < $${paramIdx++}`;
      case "lte": params.push(c.value); return `${col} <= $${paramIdx++}`;
      case "in": params.push(c.value); return `${col} = ANY($${paramIdx++})`;
      case "nin": params.push(c.value); return `${col} != ALL($${paramIdx++})`;
      case "isNull": return `${col} IS NULL`;
      case "isNotNull": return `${col} IS NOT NULL`;
      case "contains": params.push(`%${c.value}%`); return `${col} ILIKE $${paramIdx++}`;
      case "startsWith": params.push(`${c.value}%`); return `${col} ILIKE $${paramIdx++}`;
      case "between": { const [lo, hi] = c.value as [unknown, unknown]; params.push(lo, hi); return `${col} BETWEEN $${paramIdx++} AND $${paramIdx++}`; }
      case "arrayContains": params.push(c.value); return `$${paramIdx++} = ANY(${col})`;
      default: return "TRUE";
    }
  }
  function groupToSQL(g: FilterGroup): string {
    const parts = g.clauses.map((c) => "logic" in c ? `(${groupToSQL(c)})` : clauseToSQL(c));
    return parts.join(` ${g.logic.toUpperCase()} `);
  }
  let where = "TRUE";
  if (view.filter) { if (Array.isArray(view.filter)) where = view.filter.map(clauseToSQL).join(" AND ") || "TRUE"; else where = groupToSQL(view.filter) || "TRUE"; }
  if (view.search?.query) { params.push(`%${view.search.query}%`); where += ` AND (${view.search.fields.map((f) => `"${f}"`).join(" || ' ' || ")}) ILIKE $${paramIdx++}`; }
  const orderBy = view.sort ? view.sort.map((s) => `"${s.field}" ${s.direction.toUpperCase()}${s.nulls ? ` NULLS ${s.nulls.toUpperCase()}` : ""}`).join(", ") : "";
  return { where, orderBy, params };
}

/**
 * Produce a GraphQL-variable-shaped object from a view (Hasura/Postgraphile-style `_op` maps). Intended as a starting point — wire to your actual schema.
 */
export function toGraphQLVariables(view: ViewDescriptor) {
  const result: { where?: Record<string, unknown>; orderBy?: Array<Record<string, unknown>>; search?: string } = {};
  if (view.filter) { const clauses = flattenClauses(view.filter); const where: Record<string, unknown> = {}; for (const c of clauses) { if (c.op === "custom") continue; where[c.field] = { [`_${c.op}`]: c.value }; } if (Object.keys(where).length) result.where = where; }
  if (view.sort) result.orderBy = view.sort.map((s) => ({ [s.field]: s.direction === "desc" ? "desc_nulls_last" : "asc_nulls_last" }));
  if (view.search?.query) result.search = view.search.query;
  return result;
}

/** Prisma `where` / `orderBy` compilers (JSON-serializable; pair with a route that passes them to `prisma.*.findMany`). */
export { toPrismaWhere, toPrismaOrderBy } from "./prisma-compile";

/**
 * Normalize nested `FilterGroup` trees to a flat clause list for compilers that only understand atomic predicates.
 */
export function flattenClauses(filter: FilterSpec): FilterClause[] {
  if (Array.isArray(filter)) return filter;
  function walk(g: FilterGroup): FilterClause[] { return g.clauses.flatMap((c) => ("logic" in c ? walk(c) : [c])); }
  return walk(filter);
}

/** True if any clause requires client-side `predicate` logic — forces local/hybrid evaluation paths that cannot be pushed to generic REST/SQL. */
export function hasCustomPredicates(filter: FilterSpec): boolean { return flattenClauses(filter).some((c) => c.op === "custom"); }
