/**
 * table/presets/electricsql-adapter.ts
 *
 * ElectricSQL / PGlite adapter for local-first preset persistence.
 * Uses type-only imports; PGlite is a peer/optional dependency.
 */
import type { TableStorageAdapter } from "./storage";
import type {
  FilterPreset,
  ColumnPreset,
  ActivePresets,
  PresetChangeEvent,
  UnsubscribeFn,
} from "./types";

interface PGliteInstance {
  query: <T = Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ) => Promise<{ rows: T[] }>;
  exec: (sql: string) => Promise<void>;
  listen?: (
    channel: string,
    callback: (payload: string) => void,
  ) => Promise<() => void>;
}

export interface ElectricSQLAdapterOptions {
  db: PGliteInstance;
  tableName?: string;
}

export class ElectricSQLAdapter implements TableStorageAdapter {
  private db: PGliteInstance;
  private tableName: string;
  private initialized = false;

  constructor(options: ElectricSQLAdapterOptions) {
    this.db = options.db;
    this.tableName = options.tableName ?? "table_presets";
  }

  private async ensureTable() {
    if (this.initialized) return;
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        id TEXT PRIMARY KEY,
        table_id TEXT NOT NULL,
        preset_type TEXT NOT NULL,
        preset_id TEXT NOT NULL,
        preset_data TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_${this.tableName}_table_type
        ON ${this.tableName}(table_id, preset_type);
    `);
    this.initialized = true;
  }

  private makeId(tableId: string, presetType: string, presetId: string): string {
    return `${tableId}:${presetType}:${presetId}`;
  }

  async loadFilterPresets(tableId: string): Promise<FilterPreset[]> {
    await this.ensureTable();
    const { rows } = await this.db.query<{ preset_data: string }>(
      `SELECT preset_data FROM ${this.tableName} WHERE table_id = $1 AND preset_type = $2`,
      [tableId, "filter"],
    );
    return rows.map((r) => JSON.parse(r.preset_data) as FilterPreset);
  }

  async saveFilterPreset(tableId: string, preset: FilterPreset): Promise<void> {
    await this.ensureTable();
    const id = this.makeId(tableId, "filter", preset.id);
    await this.db.query(
      `INSERT INTO ${this.tableName} (id, table_id, preset_type, preset_id, preset_data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET preset_data = $5, updated_at = $6`,
      [id, tableId, "filter", preset.id, JSON.stringify(preset), new Date().toISOString()],
    );
  }

  async deleteFilterPreset(tableId: string, presetId: string): Promise<void> {
    await this.ensureTable();
    const id = this.makeId(tableId, "filter", presetId);
    await this.db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  async loadColumnPresets(tableId: string): Promise<ColumnPreset[]> {
    await this.ensureTable();
    const { rows } = await this.db.query<{ preset_data: string }>(
      `SELECT preset_data FROM ${this.tableName} WHERE table_id = $1 AND preset_type = $2`,
      [tableId, "column"],
    );
    return rows.map((r) => JSON.parse(r.preset_data) as ColumnPreset);
  }

  async saveColumnPreset(tableId: string, preset: ColumnPreset): Promise<void> {
    await this.ensureTable();
    const id = this.makeId(tableId, "column", preset.id);
    await this.db.query(
      `INSERT INTO ${this.tableName} (id, table_id, preset_type, preset_id, preset_data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET preset_data = $5, updated_at = $6`,
      [id, tableId, "column", preset.id, JSON.stringify(preset), new Date().toISOString()],
    );
  }

  async deleteColumnPreset(tableId: string, presetId: string): Promise<void> {
    await this.ensureTable();
    const id = this.makeId(tableId, "column", presetId);
    await this.db.query(`DELETE FROM ${this.tableName} WHERE id = $1`, [id]);
  }

  async loadActivePresets(tableId: string): Promise<ActivePresets> {
    await this.ensureTable();
    const id = this.makeId(tableId, "active", "active");
    const { rows } = await this.db.query<{ preset_data: string }>(
      `SELECT preset_data FROM ${this.tableName} WHERE id = $1`,
      [id],
    );
    if (rows.length === 0) return {};
    return JSON.parse(rows[0].preset_data) as ActivePresets;
  }

  async saveActivePresets(tableId: string, active: ActivePresets): Promise<void> {
    await this.ensureTable();
    const id = this.makeId(tableId, "active", "active");
    await this.db.query(
      `INSERT INTO ${this.tableName} (id, table_id, preset_type, preset_id, preset_data, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (id) DO UPDATE SET preset_data = $5, updated_at = $6`,
      [id, tableId, "active", "active", JSON.stringify(active), new Date().toISOString()],
    );
  }

  subscribe(
    tableId: string,
    callback: (event: PresetChangeEvent) => void,
  ): UnsubscribeFn {
    if (!this.db.listen) return () => {};

    let unsub: (() => void) | null = null;

    this.db
      .listen!(`preset_change_${tableId}`, (payload) => {
        try {
          const event = JSON.parse(payload) as PresetChangeEvent;
          callback({ ...event, source: "remote" });
        } catch {
          // ignore parse errors
        }
      })
      .then((fn) => {
        unsub = fn;
      });

    return () => unsub?.();
  }
}
