/**
 * graph/runtime.ts
 *
 * Local-first runtime bootstrap (design D-3):
 *   - tauri lane: durable storage is SQLite via the certified
 *     `createTauriSqlPersistenceAdapter` over `@tauri-apps/plugin-sql`;
 *   - web lane:   localStorage behind the same GraphPersistenceAdapter
 *     contract so Playwright exercises the identical code path.
 *
 * The native plugin mirror (upsert/remove/snapshot commands) runs alongside
 * as the command-channel demonstration; durable restart is SQL-backed.
 */
import Database from "@tauri-apps/plugin-sql";
import {
  createTauriSqlPersistenceAdapter,
  startLocalFirstGraph,
  type GraphPersistenceAdapter,
  type LocalFirstGraphRuntime,
} from "@prometheus-ags/prometheus-entity-management";
import { getBridge } from "../platform";
import { isTauriHost } from "../platform/bridge";

const RUNTIME_KEY = "prometheus-tauri-universal:graph";

function localStorageAdapter(): GraphPersistenceAdapter {
  return {
    get: (key) => Promise.resolve(window.localStorage.getItem(key)),
    set: (key, value) => {
      window.localStorage.setItem(key, value);
      return Promise.resolve();
    },
    remove: (key) => {
      window.localStorage.removeItem(key);
      return Promise.resolve();
    },
  };
}

async function resolveStorage(): Promise<GraphPersistenceAdapter> {
  if (!isTauriHost()) return localStorageAdapter();
  const db = await Database.load("sqlite:prometheus-tasks.db");
  return createTauriSqlPersistenceAdapter(db);
}

let runtime: LocalFirstGraphRuntime | null = null;

export async function startGraphRuntime(): Promise<LocalFirstGraphRuntime> {
  if (runtime) return runtime;
  const storage = await resolveStorage();
  runtime = startLocalFirstGraph({ storage, key: RUNTIME_KEY, persistDebounceMs: 25 });
  await runtime.ready;
  return runtime;
}

export { getBridge };
