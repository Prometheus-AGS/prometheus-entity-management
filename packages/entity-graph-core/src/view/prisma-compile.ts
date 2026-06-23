import type { FilterClause, FilterGroup, FilterSpec, SortSpec } from "./types";

/**
 * Nests a leaf Prisma field filter under dotted paths (e.g. `author.name` → `{ author: { name: { … } } }`).
 */
function nestWhereField(parts: string[], leaf: unknown): Record<string, unknown> {
  if (parts.length === 0) return {};
  if (parts.length === 1) return { [parts[0]]: leaf };
  return { [parts[0]]: nestWhereField(parts.slice(1), leaf) };
}

function clauseToPrismaLeaf(c: FilterClause): Record<string, unknown> | null {
  switch (c.op) {
    case "eq":
      return { equals: c.value };
    case "neq":
      return { not: c.value };
    case "gt":
      return { gt: c.value };
    case "gte":
      return { gte: c.value };
    case "lt":
      return { lt: c.value };
    case "lte":
      return { lte: c.value };
    case "contains":
      return { contains: c.value, mode: "insensitive" };
    case "startsWith":
      return { startsWith: c.value, mode: "insensitive" };
    case "endsWith":
      return { endsWith: c.value, mode: "insensitive" };
    case "in":
      return { in: c.value };
    case "nin":
      return { notIn: c.value };
    case "arrayContains":
      return { has: c.value };
    case "between":
    case "arrayOverlaps":
    case "matches":
    case "custom":
    default:
      return null;
  }
}

function clauseToPrismaEntry(c: FilterClause): Record<string, unknown> | null {
  const parts = c.field.split(".").filter(Boolean);
  if (parts.length === 0) return null;

  if (c.op === "isNull") {
    /** `value` truthy → equals null; falsy → `{ not: null }` (see Prisma adapter docs). */
    const equalsNull = c.value === undefined || c.value === true;
    return nestWhereField(parts, equalsNull ? null : { not: null });
  }
  if (c.op === "isNotNull") {
    return nestWhereField(parts, { not: null });
  }

  const leaf = clauseToPrismaLeaf(c);
  if (leaf === null) return null;
  return nestWhereField(parts, leaf);
}

function groupToPrismaWhere(g: FilterGroup): Record<string, unknown> {
  const parts: Record<string, unknown>[] = [];
  for (const item of g.clauses) {
    if ("logic" in item) {
      const nested = groupToPrismaWhere(item);
      if (Object.keys(nested).length > 0) parts.push(nested);
    } else {
      const entry = clauseToPrismaEntry(item);
      if (entry) parts.push(entry);
    }
  }
  if (parts.length === 0) return {};
  if (parts.length === 1) return parts[0];
  return g.logic === "or" ? { OR: parts } : { AND: parts };
}

/**
 * Compiles a {@link FilterSpec} into a Prisma `where` object (plain JSON-serializable shape).
 *
 * Operator mapping matches common Prisma filter APIs: `eq` → `equals`, string ops use `mode: "insensitive"`,
 * `nin` → `notIn`, `arrayContains` → `has`, `isNull` uses `null` / `{ not: null }` per `value`, and `isNotNull` → `{ not: null }`.
 * Unsupported ops (`between`, `arrayOverlaps`, `matches`, `custom`) are omitted from the result.
 *
 * Top-level clause arrays are combined with `AND`. {@link FilterGroup} uses `AND` / `OR` to match `group.logic`.
 */
export function toPrismaWhere(filter: FilterSpec): Record<string, unknown> {
  if (Array.isArray(filter)) {
    const parts: Record<string, unknown>[] = [];
    for (const item of filter) {
      const entry = clauseToPrismaEntry(item);
      if (entry) parts.push(entry);
    }
    if (parts.length === 0) return {};
    if (parts.length === 1) return parts[0];
    return { AND: parts };
  }
  return groupToPrismaWhere(filter);
}

/**
 * Compiles a {@link SortSpec} into Prisma `orderBy` form: `[{ fieldName: "asc" | "desc" }, …]`.
 * `nulls` and `comparator` on {@link SortClause} are ignored (local-only); extend callers if your Prisma version supports null ordering.
 */
export function toPrismaOrderBy(sort: SortSpec): Record<string, string>[] {
  return sort.map((s) => ({ [s.field]: s.direction }));
}
