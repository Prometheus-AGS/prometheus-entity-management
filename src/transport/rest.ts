/**
 * `makeRestTransport` — built-in helper for the most common case: a
 * Supabase / PostgREST backend reached through a `SupabaseClient`-like
 * object.
 *
 * Why a helper (not a class): consumers stay declarative —
 *   registerEntityTransport("Client",
 *     makeRestTransport<Client>({ supabase, table: "client" }));
 * — and the library never imports `@supabase/supabase-js` directly
 * (peer-dep-free).
 *
 * The transport:
 * - Compiles `ListQuery` (filter / sort / search / cursor / limit)
 *   into a PostgREST query via the supabase-js builder.
 * - Maps HTTP status to `TerminalError` (4xx) or `TransientError`
 *   (5xx / network).
 * - Honours `AbortSignal` via supabase-js `.abortSignal(signal)`.
 * - Returns `total` from PostgREST `count: 'exact'` when requested.
 */

import { TerminalError, TransientError, toEntityError } from "../errors";
import type { FilterClause, FilterGroup, FilterSpec, SortClause } from "../view/types";
import { flattenClauses } from "../view/types";
import type { ChangeEvent, EntityTransport, ListQuery, ListResult } from "./types";

/**
 * Minimal slice of the `@supabase/supabase-js` `SupabaseClient` we use.
 * Declared structurally so the library does not need to import the
 * package as a dependency (peer-dep-free).
 */
export interface SupabaseLike {
  from: (table: string) => SupabaseQueryBuilderLike;
}

/**
 * Subset of the supabase-js builder we exercise. Each call returns the
 * same builder for chaining; `then`-able at the end resolves to
 * `{ data, error, count, status }`.
 */
export interface SupabaseQueryBuilderLike {
  select: (columns: string, opts?: { count?: "exact" | "planned" | "estimated"; head?: boolean }) => SupabaseQueryBuilderLike;
  eq: (col: string, val: unknown) => SupabaseQueryBuilderLike;
  neq: (col: string, val: unknown) => SupabaseQueryBuilderLike;
  gt: (col: string, val: unknown) => SupabaseQueryBuilderLike;
  gte: (col: string, val: unknown) => SupabaseQueryBuilderLike;
  lt: (col: string, val: unknown) => SupabaseQueryBuilderLike;
  lte: (col: string, val: unknown) => SupabaseQueryBuilderLike;
  in: (col: string, vals: readonly unknown[]) => SupabaseQueryBuilderLike;
  ilike: (col: string, pattern: string) => SupabaseQueryBuilderLike;
  is: (col: string, val: null | boolean) => SupabaseQueryBuilderLike;
  or: (filter: string) => SupabaseQueryBuilderLike;
  order: (col: string, opts?: { ascending?: boolean; nullsFirst?: boolean }) => SupabaseQueryBuilderLike;
  range: (from: number, to: number) => SupabaseQueryBuilderLike;
  limit: (n: number) => SupabaseQueryBuilderLike;
  abortSignal?: (signal: AbortSignal) => SupabaseQueryBuilderLike;
  then: <TResult1 = unknown, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown; count?: number | null; status?: number }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ) => Promise<TResult1 | TResult2>;
}

/** Options for `makeRestTransport`. */
export interface MakeRestTransportOptions<T extends object> {
  /** A `@supabase/supabase-js` client (or any structurally-compatible thing). */
  supabase: SupabaseLike;
  /** PostgREST table name. */
  table: string;
  /** Columns to select (default `"*"`). */
  select?: string;
  /** Stable id derivation. Defaults to `(row) => String(row.id)`. */
  identify?: (row: T) => string;
  /** Whether the local cache is treated as authoritative. */
  authoritative?: boolean;
  /** Stale-time hint in ms. */
  staleTime?: number;
  /** Free-text search column list (compiled to `or=col.ilike.*query*,…`). */
  searchColumns?: string[];
  /** Default page size when `ListQuery.limit` is absent. */
  defaultLimit?: number;
}

/**
 * Build an `EntityTransport<T>` from a Supabase client + a table name.
 *
 * The returned transport:
 * - Maps `ListQuery.filter` clauses to PostgREST operators (`eq`, `gt`,
 *   `in`, `ilike`, `is null`, etc.).
 * - Compiles `ListQuery.search` into an `or=` clause across
 *   `searchColumns`.
 * - Uses `count: 'exact'` on first page to surface `total`.
 * - Throws `TerminalError` on 4xx (no retry); `TransientError` on 5xx
 *   or network failure.
 * - Honours `signal` via `.abortSignal(signal)` (supabase-js >= 2.39).
 */
export function makeRestTransport<T extends object>(
  opts: MakeRestTransportOptions<T>,
): EntityTransport<T> {
  const {
    supabase,
    table,
    select = "*",
    identify = (row: T) => String((row as { id?: unknown }).id),
    authoritative = false,
    staleTime,
    searchColumns = [],
    defaultLimit = 200,
  } = opts;

  return {
    identify,
    authoritative,
    staleTime,

    async list(q: ListQuery): Promise<ListResult<T>> {
      const limit = q.limit ?? defaultLimit;
      const offset = typeof q.cursor === "number" ? q.cursor : 0;

      let builder = supabase
        .from(table)
        .select(select, { count: offset === 0 ? "exact" : undefined });

      // Apply filter
      if (q.filter) builder = applyFilter(builder, q.filter);

      // Apply search across configured columns
      if (q.search && searchColumns.length > 0) {
        const escaped = q.search.replace(/[%,()]/g, ""); // PostgREST safety
        const orClause = searchColumns
          .map((c) => `${c}.ilike.*${escaped}*`)
          .join(",");
        builder = builder.or(orClause);
      }

      // Apply sort
      if (q.sort) {
        for (const s of q.sort as SortClause[]) {
          builder = builder.order(s.field, {
            ascending: s.direction === "asc",
            nullsFirst: s.nulls === "first",
          });
        }
      }

      // Page
      builder = builder.range(offset, offset + limit - 1);

      // Abort
      if (q.signal && builder.abortSignal) builder = builder.abortSignal(q.signal);

      const result = (await builder) as { data: unknown; error: unknown; count?: number | null; status?: number };

      if (result.error) {
        throw mapPostgrestError(result.error, result.status);
      }

      const rows = (result.data as T[] | null) ?? [];
      const total = typeof result.count === "number" ? result.count : null;
      const nextCursor = rows.length === limit ? offset + limit : null;
      return { rows, total, nextCursor };
    },
  };
}

/** Compile a `FilterSpec` against a supabase-js builder. */
function applyFilter(
  builder: SupabaseQueryBuilderLike,
  filter: FilterSpec,
): SupabaseQueryBuilderLike {
  // PostgREST does not have nested OR/AND of arbitrary depth in the
  // builder API, so we flatten and concatenate top-level AND clauses.
  // Nested OR groups become an `.or()` string clause.
  if (!Array.isArray(filter) && (filter as FilterGroup).logic === "or") {
    const parts = (filter as FilterGroup).clauses
      .filter((c): c is FilterClause => !("logic" in c))
      .map((c) => clauseToOrFragment(c))
      .filter((s): s is string => !!s);
    if (parts.length > 0) return builder.or(parts.join(","));
    return builder;
  }
  const clauses = flattenClauses(filter);
  let b = builder;
  for (const c of clauses) {
    b = applyClause(b, c);
  }
  return b;
}

function applyClause(
  builder: SupabaseQueryBuilderLike,
  c: FilterClause,
): SupabaseQueryBuilderLike {
  switch (c.op) {
    case "eq": return builder.eq(c.field, c.value);
    case "neq": return builder.neq(c.field, c.value);
    case "gt": return builder.gt(c.field, c.value);
    case "gte": return builder.gte(c.field, c.value);
    case "lt": return builder.lt(c.field, c.value);
    case "lte": return builder.lte(c.field, c.value);
    case "in": return builder.in(c.field, c.value as readonly unknown[]);
    case "isNull": return builder.is(c.field, null);
    case "isNotNull": return builder.neq(c.field, null);
    case "contains": return builder.ilike(c.field, `%${String(c.value)}%`);
    case "startsWith": return builder.ilike(c.field, `${String(c.value)}%`);
    case "endsWith": return builder.ilike(c.field, `%${String(c.value)}`);
    case "matches": return builder.ilike(c.field, String(c.value));
    case "custom": return builder; // local-only predicate; skip on server
    default: return builder;
  }
}

/** Map a single clause to a PostgREST `or=` fragment (e.g. `name.eq.foo`). */
function clauseToOrFragment(c: FilterClause): string | null {
  const v = encodeURIComponent(String(c.value ?? ""));
  switch (c.op) {
    case "eq": return `${c.field}.eq.${v}`;
    case "neq": return `${c.field}.neq.${v}`;
    case "gt": return `${c.field}.gt.${v}`;
    case "gte": return `${c.field}.gte.${v}`;
    case "lt": return `${c.field}.lt.${v}`;
    case "lte": return `${c.field}.lte.${v}`;
    case "isNull": return `${c.field}.is.null`;
    case "isNotNull": return `${c.field}.not.is.null`;
    case "contains": return `${c.field}.ilike.*${v}*`;
    case "startsWith": return `${c.field}.ilike.${v}*`;
    case "endsWith": return `${c.field}.ilike.*${v}`;
    default: return null;
  }
}

/** Convert a PostgREST error envelope into one of our typed errors. */
function mapPostgrestError(error: unknown, status?: number): TerminalError | TransientError {
  // Already a typed entity error (a custom transport could rethrow these)
  if (error instanceof TerminalError || error instanceof TransientError) return error;

  // PostgrestError has `.code`, `.message`, `.details`, `.hint`.
  const message = (error && typeof error === "object" && "message" in error)
    ? String((error as { message?: unknown }).message ?? "Unknown REST error")
    : String(error);

  // Some PostgREST errors carry their HTTP status only on the outer
  // response. If `status` is provided we trust it.
  if (typeof status === "number") {
    if (status >= 400 && status < 500) {
      return new TerminalError(message, { status, cause: error });
    }
    if (status >= 500) {
      return new TransientError(message, { status, cause: error });
    }
  }

  // Postgres "relation does not exist" → 42P01 → terminal.
  const code = (error && typeof error === "object" && "code" in error)
    ? String((error as { code?: unknown }).code ?? "")
    : "";
  if (code === "42P01" || code === "PGRST116" || code === "PGRST106") {
    return new TerminalError(message, { cause: error });
  }

  return toEntityError(error);
}

export type { ChangeEvent };
