import type { FilterSpec, FilterClause, FilterGroup, SortSpec, SortClause } from "./types";

/**
 * Evaluate `FilterSpec` against one in-memory entity — mirrors remote semantics as closely as plain JS allows.
 * Use for **local** and **hybrid** `useEntityView` paths so UI filtering matches what users expect from the declarative spec.
 */
export function matchesFilter(entity: Record<string, unknown>, filter: FilterSpec): boolean {
  if (Array.isArray(filter)) return filter.every((clause) => matchesClause(entity, clause));
  return matchesGroup(entity, filter);
}
function matchesGroup(entity: Record<string, unknown>, group: FilterGroup): boolean {
  const { logic, clauses } = group;
  if (logic === "and") return clauses.every((c) => "logic" in c ? matchesGroup(entity, c) : matchesClause(entity, c));
  return clauses.some((c) => "logic" in c ? matchesGroup(entity, c) : matchesClause(entity, c));
}
function matchesClause(entity: Record<string, unknown>, clause: FilterClause): boolean {
  const { field, op, value, predicate } = clause;
  const fv = getNestedValue(entity, field);
  switch (op) {
    case "eq": return fv === value;
    case "neq": return fv !== value;
    case "gt": return (fv as number) > (value as number);
    case "gte": return (fv as number) >= (value as number);
    case "lt": return (fv as number) < (value as number);
    case "lte": return (fv as number) <= (value as number);
    case "in": return Array.isArray(value) && value.includes(fv);
    case "nin": return Array.isArray(value) && !value.includes(fv);
    case "isNull": return fv == null;
    case "isNotNull": return fv != null;
    case "contains": return typeof fv === "string" && typeof value === "string" && fv.toLowerCase().includes(value.toLowerCase());
    case "startsWith": return typeof fv === "string" && typeof value === "string" && fv.toLowerCase().startsWith(value.toLowerCase());
    case "endsWith": return typeof fv === "string" && typeof value === "string" && fv.toLowerCase().endsWith(value.toLowerCase());
    case "between": { const [lo, hi] = value as [number, number]; return (fv as number) >= lo && (fv as number) <= hi; }
    case "arrayContains": return Array.isArray(fv) && fv.includes(value);
    case "arrayOverlaps": return Array.isArray(fv) && Array.isArray(value) && value.some((v) => fv.includes(v));
    case "matches": return typeof fv === "string" && new RegExp(value as string).test(fv);
    case "custom": return predicate ? predicate(fv, entity) : true;
    default: return true;
  }
}
/**
 * Case-insensitive substring match across configured string fields; empty query is a no-op pass.
 * Keeps quick search consistent between client-only and debounced remote `q` params.
 */
export function matchesSearch(entity: Record<string, unknown>, query: string, fields: string[]): boolean {
  if (!query.trim()) return true;
  const lq = query.toLowerCase();
  return fields.some((field) => { const v = getNestedValue(entity, field); return typeof v === "string" && v.toLowerCase().includes(lq); });
}
/**
 * Multi-key comparator implementing `SortSpec` (null ordering, optional custom comparators, locale-aware string fallback).
 * Shared by local sorting and binary insertion for realtime updates.
 */
export function compareEntities(a: Record<string, unknown>, b: Record<string, unknown>, sort: SortSpec): number {
  for (const clause of sort) { const r = compareByClause(a, b, clause); if (r !== 0) return r; } return 0;
}
function compareByClause(a: Record<string, unknown>, b: Record<string, unknown>, clause: SortClause): number {
  const { field, direction, nulls = "last", comparator } = clause;
  const av = getNestedValue(a, field); const bv = getNestedValue(b, field);
  const aNull = av == null; const bNull = bv == null;
  if (aNull && bNull) return 0;
  if (aNull) return nulls === "first" ? -1 : 1;
  if (bNull) return nulls === "first" ? 1 : -1;
  let cmp: number;
  if (comparator) cmp = comparator(av, bv);
  else if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv, undefined, { sensitivity: "base", numeric: true });
  else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
  else cmp = String(av).localeCompare(String(bv));
  return direction === "desc" ? -cmp : cmp;
}
/**
 * Binary-search insertion index so realtime inserts land in sorted order without resorting the full id list (O(log n) per insert).
 * Skips missing `getEntity` rows by advancing low — callers should ensure entities exist or tolerate append-like behavior.
 */
export function findInsertionIndex(entity: Record<string, unknown>, sortedIds: string[], getEntity: (id: string) => Record<string, unknown> | null, sort: SortSpec): number {
  let lo = 0; let hi = sortedIds.length;
  while (lo < hi) { const mid = (lo + hi) >>> 1; const me = getEntity(sortedIds[mid]); if (!me) { lo = mid + 1; continue; } if (compareEntities(entity, me, sort) <= 0) hi = mid; else lo = mid + 1; }
  return lo;
}
/**
 * Pure list projection: map ids → entities, drop missing, filter/sort/search, return **ids** in display order.
 * Bridges stored id lists with on-the-fly view descriptors without duplicating entity payloads.
 */
export function applyView(ids: string[], getEntity: (id: string) => Record<string, unknown> | null, filter?: FilterSpec | null, sort?: SortSpec | null, search?: { query: string; fields: string[] } | null): string[] {
  let entries: Array<{ id: string; entity: Record<string, unknown> }> = [];
  for (const id of ids) { const entity = getEntity(id); if (!entity) continue; entries.push({ id, entity }); }
  if (filter && entries.length > 0) entries = entries.filter(({ entity }) => matchesFilter(entity, filter));
  if (search?.query) entries = entries.filter(({ entity }) => matchesSearch(entity, search.query, search.fields));
  if (sort && sort.length > 0) entries.sort((a, b) => compareEntities(a.entity, b.entity, sort));
  return entries.map((e) => e.id);
}
/**
 * Heuristic for whether the graph likely holds **all** rows for a list key (enables local-only filtering/sorting in `useEntityView`).
 * `total` and `hasNextPage` come from list metadata written by fetchers.
 */
export function checkCompleteness(loadedCount: number, total: number | null, hasNextPage: boolean): { isComplete: boolean; reason: string } {
  if (!hasNextPage && total !== null && loadedCount >= total) return { isComplete: true, reason: "all-loaded" };
  if (hasNextPage) return { isComplete: false, reason: "has-more-pages" };
  return { isComplete: true, reason: "no-more-pages" };
}
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
  let current: unknown = obj;
  for (const part of parts) { if (current == null || typeof current !== "object") return undefined; current = (current as Record<string, unknown>)[part]; }
  return current;
}
