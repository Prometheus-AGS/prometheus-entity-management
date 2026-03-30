/**
 * adapters/electricsql.ts
 *
 * ElectricSQL + PGlite local-first adapter.
 *
 * Server Postgres → ElectricSQL shape sync (SSE) → PGlite (local WASM Postgres)
 *                                                        ↓ NOTIFY
 *                                                   Entity Graph (Zustand)
 *
 * Reads from PGlite (instant, offline-capable).
 * Writes go to PGlite first (optimistic); Electric syncs to Postgres in background.
 */
import { useState, useEffect, useCallback } from "react";
import { useGraphStore } from "../graph";
import { getRealtimeManager } from "./realtime-manager";
import type { SyncAdapter, SubscriptionConfig, ChangeSet, EntityChange, AdapterStatus, UnsubscribeFn } from "./types";
import type { EntityType, EntityId } from "../graph";

// ---------------------------------------------------------------------------
// Minimal surface types (avoids hard deps on @electric-sql/pglite etc.)
// ---------------------------------------------------------------------------
interface PGlite {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>;
  exec(sql: string): Promise<void>;
  listen(channel: string, handler: (payload: string) => void): Promise<() => void>;
}
interface ShapeMessage<T = Record<string, unknown>> {
  headers: { operation: "insert" | "update" | "delete" };
  offset: string; value: T; key: string;
}
interface ShapeStream<T = Record<string, unknown>> {
  subscribe(onMsg: (msgs: ShapeMessage<T>[]) => void, onErr?: (e: Error) => void): () => void;
  isUpToDate: boolean; lastOffset: string;
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
export interface ElectricTableConfig<T extends Record<string, unknown>> {
  type: EntityType; table: string; where?: string; idColumn?: string;
  normalize?: (row: T) => Record<string, unknown>;
  shapeStream: ShapeStream<T>;
}

export interface ElectricAdapterOptions {
  pglite: PGlite;
  tables: ElectricTableConfig<Record<string, unknown>>[];
  onSynced?: () => void;
}

// ---------------------------------------------------------------------------
// Adapter factory
// ---------------------------------------------------------------------------
export function createElectricAdapter(opts: ElectricAdapterOptions): SyncAdapter {
  const { pglite, tables, onSynced } = opts;
  const statusCbs = new Set<(s: AdapterStatus) => void>();
  const syncedCbs = new Set<() => void>();
  const syncedTables = new Set<string>();
  let globalHandler: ((cs: ChangeSet) => void) | null = null;

  function checkAllSynced() {
    if (tables.every((t) => syncedTables.has(t.table))) { onSynced?.(); for (const cb of syncedCbs) cb(); }
  }

  function toChange<T extends Record<string, unknown>>(tc: ElectricTableConfig<T>, msg: ShapeMessage<T>): EntityChange | null {
    const { type, idColumn = "id", normalize } = tc; const op = msg.headers.operation;
    const raw = msg.value; const id = String(raw[idColumn]); if (!id) return null;
    const data = normalize ? normalize(raw) : (raw as Record<string, unknown>);
    if (op === "delete") return { op: "delete", type, id };
    return { op: op === "insert" ? "insert" : "upsert", type, id, data };
  }

  const shapeUnsubs: UnsubscribeFn[] = [];
  for (const tc of tables) {
    shapeUnsubs.push(tc.shapeStream.subscribe((msgs) => {
      if (!globalHandler) return;
      const changes = msgs.map((m) => toChange(tc as ElectricTableConfig<Record<string, unknown>>, m as ShapeMessage<Record<string, unknown>>)).filter((c): c is EntityChange => c !== null);
      if (changes.length > 0) globalHandler({ changes, timestamp: new Date().toISOString() });
      if (tc.shapeStream.isUpToDate) { syncedTables.add(tc.table); checkAllSynced(); }
    }, (e) => { console.error(`[Electric] ${tc.table}:`, e); for (const cb of statusCbs) cb("error"); }));
  }

  void (async () => {
    for (const tc of tables) {
      await pglite.listen(`entity_store_${tc.table}`, (payload) => {
        if (!globalHandler) return;
        try {
          const parsed: { op: string; row: Record<string, unknown> } = JSON.parse(payload);
          const change = toChange(tc as ElectricTableConfig<Record<string, unknown>>, { headers: { operation: parsed.op as "insert"|"update"|"delete" }, offset: "", key: String(parsed.row[tc.idColumn ?? "id"]), value: parsed.row });
          if (change) globalHandler({ changes: [change] });
        } catch { /* non-JSON frame */ }
      });
    }
  })();

  return {
    name: "electricsql",
    subscribe(_cfg: SubscriptionConfig, handler: (cs: ChangeSet) => void): UnsubscribeFn {
      globalHandler = handler;
      for (const cb of statusCbs) cb("connected");
      return () => { globalHandler = null; for (const u of shapeUnsubs) u(); };
    },
    onStatusChange(cb) { statusCbs.add(cb); return () => statusCbs.delete(cb); },
    async query<T = Record<string, unknown>>(sql: string, params?: unknown[]) { const r = await pglite.query<T>(sql, params); return { rows: r.rows }; },
    async execute(sql: string, _params?: unknown[]) { await pglite.exec(sql); },
    isSynced() { return tables.every((t) => syncedTables.has(t.table)); },
    onSyncComplete(cb): UnsubscribeFn {
      if (this.isSynced()) { cb(); return () => {}; }
      syncedCbs.add(cb); return () => syncedCbs.delete(cb);
    },
  };
}

// ---------------------------------------------------------------------------
// React hook: useLocalFirst
// ---------------------------------------------------------------------------
export interface UseLocalFirstResult {
  isSynced: boolean;
  query: <T = Record<string, unknown>>(sql: string, params?: unknown[]) => Promise<T[]>;
  execute: (sql: string, params?: unknown[]) => Promise<void>;
}

export function useLocalFirst(adapter: SyncAdapter): UseLocalFirstResult {
  const [isSynced, setIsSynced] = useState(adapter.isSynced());
  useEffect(() => {
    const u1 = adapter.onSyncComplete(() => setIsSynced(true));
    const u2 = getRealtimeManager().register(adapter, []);
    return () => { u1(); u2(); };
  }, [adapter]);
  const query = useCallback(async <T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> => (await adapter.query<T>(sql, params)).rows, [adapter]);
  const execute = useCallback((sql: string, params?: unknown[]) => adapter.execute(sql, params), [adapter]);
  return { isSynced, query, execute };
}

// ---------------------------------------------------------------------------
// usePGliteQuery — run raw SQL, populate graph
// ---------------------------------------------------------------------------
export function usePGliteQuery<T extends Record<string, unknown>>(opts: {
  adapter: SyncAdapter; type: EntityType; sql: string; params?: unknown[];
  idColumn?: string; normalize?: (row: T) => Record<string, unknown>; deps?: unknown[];
}) {
  const { adapter, type, sql, params, idColumn = "id", normalize, deps = [] } = opts;
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false; setIsLoading(true);
    adapter.query<T>(sql, params).then((r) => {
      if (cancelled) return;
      const store = useGraphStore.getState();
      store.upsertEntities(type, r.rows.map((row) => ({ id: String(row[idColumn]), data: normalize ? normalize(row) : (row as Record<string, unknown>) })));
      for (const row of r.rows) store.setEntityFetched(type, String(row[idColumn]));
      setIsLoading(false); setError(null);
    }).catch((e) => { if (!cancelled) { setError(String(e)); setIsLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql, type, ...deps]);
  return { isLoading, error };
}
