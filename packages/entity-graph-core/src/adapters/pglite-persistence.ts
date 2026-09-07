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

/**
 * Where a replica resumes from, and which generation it belongs to.
 *
 * `handle` and `offset` are ElectricSQL's own values, echoed back verbatim on
 * resume — they are opaque here. `generation` increments when a snapshot is
 * rebuilt (Electric's must-refetch), so a checkpoint from a previous generation
 * is recognisably stale rather than silently resumed against new rows.
 */
export interface ReplicaCheckpoint {
  handle: string;
  offset: string;
  generation: number;
}

/** Checkpoint plus the rows it describes, committed together or not at all. */
export interface CheckpointedWrite {
  key: string;
  value: string;
  checkpoint: ReplicaCheckpoint;
}

/** What a caller should do with what it found on disk. */
export type ResumeDecision =
  | { action: "resume"; checkpoint: ReplicaCheckpoint }
  | { action: "rebuild"; reason: ResumeRejection };

/**
 * Why a stored replica cannot be resumed.
 *
 * Each is a *rebuild*, never a silent continue: resuming against a boundary
 * that does not describe the rows on disk is how a replica ends up with a
 * plausible-looking mixture of two generations.
 */
export type ResumeRejection =
  /** Nothing stored — a cold start, not a fault. */
  | "no-value"
  /** Rows exist but were written by plain `set`, so their position is unknown. */
  | "no-checkpoint"
  /** The checkpoint predates a rebuild; its offsets refer to a dead generation. */
  | "stale-generation"
  /** The server issued a new shape handle, so old offsets are meaningless. */
  | "handle-changed";

/**
 * Decide whether a stored replica may be resumed.
 *
 * Pure so the decision is testable without a database. `expected` is what the
 * caller intends to resume as — its current replica generation, and the shape
 * handle the server most recently gave it.
 */
export function evaluateResume(
  stored: { value: string | null; checkpoint: ReplicaCheckpoint | null },
  expected: { generation: number; handle?: string },
): ResumeDecision {
  if (stored.value === null) return { action: "rebuild", reason: "no-value" };
  if (!stored.checkpoint) return { action: "rebuild", reason: "no-checkpoint" };
  if (stored.checkpoint.generation !== expected.generation) {
    return { action: "rebuild", reason: "stale-generation" };
  }
  // Only compare handles when the caller has one to compare against; a caller
  // that does not yet know the handle is resuming, not validating it.
  if (expected.handle && stored.checkpoint.handle !== expected.handle) {
    return { action: "rebuild", reason: "handle-changed" };
  }
  return { action: "resume", checkpoint: stored.checkpoint };
}

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

/**
 * A persistence adapter that can also commit a resume checkpoint atomically.
 *
 * The plain {@link GraphPersistenceAdapter} contract cannot express this: its
 * `set` writes a value and returns, so a checkpoint written after it is a
 * second transaction, and a crash between the two leaves rows whose resume
 * position is unknown. `setWithCheckpoint` closes that window (ADR-009 G3).
 */
export interface CheckpointingPersistenceAdapter extends GraphPersistenceAdapter {
  /** Commit rows and their resume checkpoint in ONE transaction. */
  setWithCheckpoint: (write: CheckpointedWrite) => Promise<void>;
  /** The checkpoint stored for `key`, or null if none. */
  getCheckpoint: (key: string) => Promise<ReplicaCheckpoint | null>;
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
): Promise<CheckpointingPersistenceAdapter> {
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

  // Checkpoint columns live on the SAME ROW as the value they describe, so one
  // UPDATE commits both and no transaction can interleave between them. A
  // separate checkpoint table would reintroduce the two-write window this
  // exists to close. Added separately so an existing table is migrated in place.
  await pglite.exec(
    `ALTER TABLE ${tableName}
       ADD COLUMN IF NOT EXISTS checkpoint_handle     TEXT,
       ADD COLUMN IF NOT EXISTS checkpoint_offset     TEXT,
       ADD COLUMN IF NOT EXISTS checkpoint_generation INTEGER`,
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

    /**
     * Commit rows and their resume checkpoint together.
     *
     * One statement, so the two cannot be separated by a crash: either the row
     * carries the new value AND the new checkpoint, or it carries neither. On
     * resume, `getCheckpoint` therefore describes exactly the value returned by
     * `get` — the property ADR-009 G3 requires.
     */
    async setWithCheckpoint({ key, value, checkpoint }: CheckpointedWrite): Promise<void> {
      await pglite.query(
        `INSERT INTO ${tableName}
           (key, value, updated_at, checkpoint_handle, checkpoint_offset, checkpoint_generation)
         VALUES ($1, $2, now(), $3, $4, $5)
         ON CONFLICT (key) DO UPDATE
           SET value                 = EXCLUDED.value,
               updated_at            = now(),
               checkpoint_handle     = EXCLUDED.checkpoint_handle,
               checkpoint_offset     = EXCLUDED.checkpoint_offset,
               checkpoint_generation = EXCLUDED.checkpoint_generation`,
        [key, value, checkpoint.handle, checkpoint.offset, checkpoint.generation],
      );
    },

    async getCheckpoint(key: string): Promise<ReplicaCheckpoint | null> {
      const result = await pglite.query<{
        checkpoint_handle: string | null;
        checkpoint_offset: string | null;
        checkpoint_generation: number | null;
      }>(
        `SELECT checkpoint_handle, checkpoint_offset, checkpoint_generation
           FROM ${tableName} WHERE key = $1`,
        [key],
      );
      const row = result.rows[0];
      // A row written by plain `set` has no checkpoint. That is not an error —
      // it means "rows exist but their resume position is unknown", which the
      // caller must treat as a rebuild, not as offset zero.
      if (!row?.checkpoint_handle || row.checkpoint_offset === null) return null;
      return {
        handle: row.checkpoint_handle,
        offset: row.checkpoint_offset,
        generation: row.checkpoint_generation ?? 0,
      };
    },
  };
}
