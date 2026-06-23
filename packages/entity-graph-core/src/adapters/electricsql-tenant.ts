/**
 * adapters/electricsql-tenant.ts
 *
 * Tenant-scoped Electric adapter — the safety primitive that enforces
 * **RULE 5 — Shape predicates ⊆ RLS** (see hotseaters constraints).
 *
 * PGlite has no row-level security. The only way to guarantee a client
 * never sees cross-tenant data through Electric is to refuse to attach
 * any shape that lacks a tenant predicate. This wrapper does exactly that:
 *
 *   - Validates the tenant claim (currently `{ companyId }`) is a UUID.
 *   - Refuses to attach a shape whose `tenantColumn` is `undefined`. We
 *     accept explicit `null` for the company root itself (filtered by `id`).
 *   - Builds the `where` clause from `tenantColumn` and the validated
 *     companyId so individual shape factories cannot drift from RLS.
 *   - Delegates to the existing `createElectricAdapter` for the actual
 *     sync wiring.
 *
 * This also fulfils Change 13 item 11 (auth-claim-aware shape registration):
 * the `tenantClaim` is the typed seam where authn meets shape registration.
 *
 * Self-hosted Supabase only. Local stack and `https://electricsql.prometheusags.ai`
 * are the only acceptable Electric endpoints — this module does not
 * hard-code either; it only governs the predicate.
 */

import { createElectricAdapter } from "./electricsql";
import type { SyncAdapter } from "./types";
import type { EntityType } from "../graph";

// ---------------------------------------------------------------------------
// Minimal surface types (mirror adapters/electricsql.ts)
// ---------------------------------------------------------------------------
interface PGlite {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
  listen(channel: string, handler: (payload: string) => void): Promise<() => void>;
}

interface ShapeMessage<T = Record<string, unknown>> {
  headers: { operation: "insert" | "update" | "delete" };
  offset: string;
  value: T;
  key: string;
}

interface ShapeStream<T = Record<string, unknown>> {
  subscribe(onMsg: (msgs: ShapeMessage<T>[]) => void, onErr?: (e: Error) => void): () => void;
  isUpToDate: boolean;
  lastOffset: string;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/** Auth claim required to register tenant-scoped shapes. */
export interface TenantClaim {
  companyId: string;
}

export interface TenantScopedTableConfig<T extends object = Record<string, unknown>> {
  type: EntityType;
  table: string;
  /**
   * Column used for tenant filtering.
   *
   * - A string (`"company_id"`) yields `WHERE company_id = '<companyId>'`.
   * - Explicit `null` means the table IS the tenant root and is filtered by
   *   `id = '<companyId>'`. Only the `company` table qualifies.
   * - `undefined` is **rejected** — this is the safety gate.
   */
  tenantColumn: string | null;
  primaryKey?: string[];
  /**
   * Factory invoked with the constructed `where` clause and the tenant claim.
   * Consumers wire their preferred Electric `ShapeStream` builder here. The
   * factory must use the supplied `where` verbatim (no widening).
   */
  shapeStreamFactory: (params: {
    table: string;
    where: string;
    tenantClaim: TenantClaim;
  }) => ShapeStream<T>;
  normalize?: (row: T) => Record<string, unknown>;
}

export interface TenantScopedAdapterOptions {
  pglite: PGlite;
  tenantClaim: TenantClaim;
  tables: TenantScopedTableConfig[];
  onSynced?: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertUuid(companyId: string): void {
  if (typeof companyId !== "string" || !UUID_RE.test(companyId)) {
    throw new Error(
      `tenant-scoped adapter: companyId must be a UUID, received "${companyId}".`,
    );
  }
}

function assertSafeColumn(column: string): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(column)) {
    throw new Error(`tenant-scoped adapter: unsafe tenantColumn "${column}".`);
  }
}

/**
 * Build the `where` clause for a single shape. Exposed for tests.
 *
 * - `tenantColumn === null` → `id = '<companyId>'` (company-root case)
 * - `tenantColumn === string` → `<tenantColumn> = '<companyId>'`
 *
 * Throws if `tenantColumn` is `undefined` or `companyId` is not a UUID.
 */
export function buildTenantWhere(
  tenantColumn: string | null | undefined,
  companyId: string,
  tableLabel: string,
): string {
  if (typeof tenantColumn === "undefined") {
    throw new Error(
      `shape "${tableLabel}" lacks tenantColumn — tenant-scoped adapter refuses to attach unscoped shapes.`,
    );
  }
  assertUuid(companyId);
  if (tenantColumn === null) {
    return `id = '${companyId}'`;
  }
  assertSafeColumn(tenantColumn);
  return `${tenantColumn} = '${companyId}'`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a tenant-scoped {@link SyncAdapter}.
 *
 * For each table in `tables`:
 *   1. Validates `tenantColumn` is defined (string or explicit null).
 *   2. Validates `companyId` is a UUID.
 *   3. Builds the predicate and calls `shapeStreamFactory(...)` to get the
 *      actual `ShapeStream`.
 *   4. Hands the resulting list off to `createElectricAdapter` for wiring.
 *
 * @throws if any table lacks `tenantColumn`, or the company id is not a UUID.
 */
export function createTenantScopedElectricAdapter(
  opts: TenantScopedAdapterOptions,
): SyncAdapter {
  const { pglite, tenantClaim, tables, onSynced } = opts;
  assertUuid(tenantClaim.companyId);

  const wired = tables.map((tc) => {
    const where = buildTenantWhere(tc.tenantColumn, tenantClaim.companyId, tc.table);
    const shapeStream = tc.shapeStreamFactory({ table: tc.table, where, tenantClaim });
    return {
      type: tc.type,
      table: tc.table,
      where,
      idColumn: tc.primaryKey?.[0] ?? "id",
      normalize: tc.normalize,
      shapeStream,
    };
  });

  return createElectricAdapter({ pglite, tables: wired, onSynced });
}
