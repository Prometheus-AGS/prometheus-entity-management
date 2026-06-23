/**
 * adapters/pglite-persistence.ts
 *
 * PGlite-backed implementation of {@link GraphPersistenceAdapter}.
 *
 * Stores the local-first runtime's graph snapshot inside a PGlite table
 * (`_graph_snapshot` by default) instead of `localStorage`/`IndexedDB`.
 *
 * Why this exists:
 *   - The app already has a PGlite handle for ElectricSQL sync.
 *   - Putting the graph snapshot alongside synced data means one storage
 *     surface to back up, clear, and reason about.
 *   - Works in Tauri WebView + Node (PGlite is a WASM Postgres) without
 *     pulling in browser-only storage.
 *
 * Contract:
 *   - `get(key)`    -> returns the stored string or null
 *   - `set(key, v)` -> upserts (insert-or-replace), stamping `updated_at`
 *   - `remove(key)` -> deletes the row (no-op if absent)
 *
 * The function lazily ensures the storage table exists on first call.
 * That `CREATE TABLE IF NOT EXISTS` is idempotent so it's safe to retry.
 *
 * Self-hosted Supabase only. HotSeatersMVP is the bible. This module does
 * not import `@electric-sql/pglite` — consumers pass a PGlite-shaped handle.
 */

import type { GraphPersistenceAdapter } from "../local-first-runtime";

// ---------------------------------------------------------------------------
// Minimal surface type — matches the pattern used by adapters/electricsql.ts.
// Avoids a hard dep on @electric-sql/pglite.
// ---------------------------------------------------------------------------
export interface PGlitePersistenceClient {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<unknown>;
}

export interface CreatePGlitePersistenceAdapterOptions {
  /** Name of the snapshot table. Defaults to `_graph_snapshot`. */
  tableName?: string;
}

const DEFAULT_TABLE = "_graph_snapshot";

/**
 * Returns a {@link GraphPersistenceAdapter} that reads/writes the graph
 * snapshot through a PGlite-shaped client.
 *
 * @example
 * ```ts
 * import { PGlite } from "@electric-sql/pglite";
 * import { startLocalFirstGraph, createPGlitePersistenceAdapter } from "@prometheus-ags/prometheus-entity-management";
 *
 * const pglite = await PGlite.create("idb://hotseaters");
 * const storage = await createPGlitePersistenceAdapter(pglite);
 * const runtime = startLocalFirstGraph({ storage, key: "hotseaters:graph" });
 * ```
 */
export async function createPGlitePersistenceAdapter(
  pglite: PGlitePersistenceClient,
  options: CreatePGlitePersistenceAdapterOptions = {},
): Promise<GraphPersistenceAdapter> {
  const tableName = options.tableName ?? DEFAULT_TABLE;
  // Quote-escape the identifier with simple validation. Reject anything that
  // isn't a safe identifier so we never interpolate hostile names.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
    throw new Error(`createPGlitePersistenceAdapter: invalid tableName "${tableName}"`);
  }

  await pglite.exec(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
       key        TEXT        PRIMARY KEY,
       value      TEXT        NOT NULL,
       updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
     )`,
  );

  return {
    async get(key: string): Promise<string | null> {
      const result = await pglite.query<{ value: string }>(
        `SELECT value FROM ${tableName} WHERE key = $1`,
        [key],
      );
      const row = result.rows[0];
      return row?.value ?? null;
    },
    async set(key: string, value: string): Promise<void> {
      await pglite.query(
        `INSERT INTO ${tableName} (key, value, updated_at)
         VALUES ($1, $2, now())
         ON CONFLICT (key) DO UPDATE
           SET value = EXCLUDED.value,
               updated_at = now()`,
        [key, value],
      );
    },
    async remove(key: string): Promise<void> {
      await pglite.query(`DELETE FROM ${tableName} WHERE key = $1`, [key]);
    },
  };
}
