/**
 * adapters/electricsql-react.ts
 *
 * React hooks over the React-free ElectricSQL adapter in entity-graph-core.
 * (Change v3-electricsql-react-extract: the base `createElectricAdapter` lives
 *  in core; only these hooks need React.)
 */
import { useState, useEffect, useCallback } from "react";
import { useGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  getRealtimeManager,
  type ElectricAdapterOptions,
} from "@prometheus-ags/entity-graph-core";
import type { SyncAdapter, EntityType } from "@prometheus-ags/entity-graph-core";

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

export function usePGliteQuery<T extends object>(opts: {
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
      store.upsertEntities(type, r.rows.map((row) => ({ id: String((row as Record<string, unknown>)[idColumn]), data: normalize ? normalize(row) : (row as Record<string, unknown>) })));
      for (const row of r.rows) store.setEntityFetched(type, String((row as Record<string, unknown>)[idColumn]));
      setIsLoading(false); setError(null);
    }).catch((e) => { if (!cancelled) { setError(String(e)); setIsLoading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sql, type, ...deps]);
  return { isLoading, error };
}

export type { ElectricAdapterOptions };
