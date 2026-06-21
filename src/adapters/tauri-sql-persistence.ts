/**
 * adapters/tauri-sql-persistence.ts
 *
 * SQLite-backed implementation of {@link GraphPersistenceAdapter} for Tauri
 * desktop, via the official `@tauri-apps/plugin-sql` `Database` handle.
 *
 * Why this exists:
 *   - On Tauri desktop the natural on-device store is SQLite, not PGlite-wasm.
 *   - This pairs with `createPGlitePersistenceAdapter` (browser/wasm) so the
 *     same local-first runtime persists across web and desktop unchanged.
 *
 * The consumer owns the Tauri `Database` handle (from `Database.load(...)`).
 * This module does NOT import `@tauri-apps/plugin-sql` — it takes a
 * minimal-surface client, mirroring the PGlite/Electric adapter pattern, so it
 * adds no hard dependency. `@tauri-apps/plugin-sql` is an optional peer.
 *
 * Contract (same as every GraphPersistenceAdapter):
 *   - `get(key)`    -> stored string or null
 *   - `set(key, v)` -> upsert (INSERT ... ON CONFLICT)
 *   - `remove(key)` -> delete (no-op if absent)
 *
 * Tauri SQL uses SQLite `?`-positional bind params (not `$1`).
 */

import type { GraphPersistenceAdapter } from "../local-first-runtime";

/**
 * Minimal surface of a `@tauri-apps/plugin-sql` `Database` handle.
 * Avoids a hard dep; matches the loaded-Database shape (`execute` + `select`).
 */
export interface TauriSqlClient {
  execute(query: string, bindValues?: unknown[]): Promise<unknown>;
  select<T = Record<string, unknown>>(query: string, bindValues?: unknown[]): Promise<T[]>;
}

export interface CreateTauriSqlPersistenceAdapterOptions {
  /** Name of the snapshot table. Defaults to `_graph_snapshot`. */
  tableName?: string;
}

const DEFAULT_TABLE = "_graph_snapshot";

/**
 * Returns a {@link GraphPersistenceAdapter} backed by a Tauri SQLite `Database`.
 *
 * @example
 * ```ts
 * import Database from "@tauri-apps/plugin-sql";
 * import { startLocalFirstGraph, createTauriSqlPersistenceAdapter } from "@prometheus-ags/prometheus-entity-management";
 *
 * const db = await Database.load("sqlite:app.db");
 * const storage = await createTauriSqlPersistenceAdapter(db);
 * const runtime = startLocalFirstGraph({ storage, key: "app:graph" });
 * ```
 */
export async function createTauriSqlPersistenceAdapter(
  db: TauriSqlClient,
  options: CreateTauriSqlPersistenceAdapterOptions = {},
): Promise<GraphPersistenceAdapter> {
  const tableName = options.tableName ?? DEFAULT_TABLE;
  // Reject anything that isn't a safe identifier so we never interpolate a
  // hostile table name into DDL.
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(tableName)) {
    throw new Error(`createTauriSqlPersistenceAdapter: invalid tableName "${tableName}"`);
  }

  await db.execute(
    `CREATE TABLE IF NOT EXISTS ${tableName} (
       key        TEXT PRIMARY KEY,
       value      TEXT NOT NULL,
       updated_at INTEGER NOT NULL
     )`,
  );

  return {
    async get(key: string): Promise<string | null> {
      const rows = await db.select<{ value: string }>(
        `SELECT value FROM ${tableName} WHERE key = ?`,
        [key],
      );
      return rows[0]?.value ?? null;
    },
    async set(key: string, value: string): Promise<void> {
      await db.execute(
        `INSERT INTO ${tableName} (key, value, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE
           SET value = excluded.value,
               updated_at = excluded.updated_at`,
        [key, value, Date.now()],
      );
    },
    async remove(key: string): Promise<void> {
      await db.execute(`DELETE FROM ${tableName} WHERE key = ?`, [key]);
    },
  };
}
