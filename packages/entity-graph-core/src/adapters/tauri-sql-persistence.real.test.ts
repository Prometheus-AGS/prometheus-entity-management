/**
 * tauri-sql-persistence.real.test.ts — G5 parity proof: real SQLite engine.
 *
 * The original test used an in-memory fake. This drives the SAME TauriSqlClient
 * surface against a real SQLite engine (better-sqlite3, same SQL dialect Tauri's
 * plugin uses), proving the adapter's DDL/upsert/delete actually work against a
 * real database — including persistence across a reopen.
 */
import { describe, it, expect } from "vitest";
import Database from "better-sqlite3";
import {
  createTauriSqlPersistenceAdapter,
  type TauriSqlClient,
} from "./tauri-sql-persistence";

/** Adapt a real better-sqlite3 Database to the TauriSqlClient surface. */
function tauriClientOver(db: Database.Database): TauriSqlClient {
  return {
    async execute(query, bind = []) {
      db.prepare(query).run(...(bind as never[]));
    },
    async select<T = Record<string, unknown>>(query: string, bind: unknown[] = []): Promise<T[]> {
      return db.prepare(query).all(...(bind as never[])) as T[];
    },
  };
}

describe("G5: Tauri SQLite persistence against a REAL SQLite engine", () => {
  it("creates the table and round-trips a value through real SQL", async () => {
    const db = new Database(":memory:");
    const adapter = await createTauriSqlPersistenceAdapter(tauriClientOver(db));
    expect(await adapter.get("graph")).toBeNull();
    await adapter.set("graph", '{"entities":{"Order":{"o1":{"id":"o1"}}}}');
    expect(await adapter.get("graph")).toBe('{"entities":{"Order":{"o1":{"id":"o1"}}}}');
    db.close();
  });

  it("real ON CONFLICT upsert overwrites", async () => {
    const db = new Database(":memory:");
    const adapter = await createTauriSqlPersistenceAdapter(tauriClientOver(db));
    await adapter.set("k", "v1");
    await adapter.set("k", "v2");
    expect(await adapter.get("k")).toBe("v2");
    db.close();
  });

  it("persists across a reopen of the same file (true durability)", async () => {
    const fs = await import("node:fs");
    const os = await import("node:os");
    const path = await import("node:path");
    const file = path.join(os.tmpdir(), `pem-g5-${process.pid}.db`);
    try {
      const db1 = new Database(file);
      const a1 = await createTauriSqlPersistenceAdapter(tauriClientOver(db1));
      const snapshot = JSON.stringify({ entities: { User: { u1: { id: "u1", name: "Ada" } } } });
      await a1.set("graph", snapshot);
      db1.close();

      // Reopen — hydrate must return the persisted snapshot byte-for-byte.
      const db2 = new Database(file);
      const a2 = await createTauriSqlPersistenceAdapter(tauriClientOver(db2));
      expect(await a2.get("graph")).toBe(snapshot);
      db2.close();
    } finally {
      fs.rmSync(file, { force: true });
    }
  });

  it("remove deletes through real SQL", async () => {
    const db = new Database(":memory:");
    const adapter = await createTauriSqlPersistenceAdapter(tauriClientOver(db));
    await adapter.set("k", "v");
    await adapter.remove!("k");
    expect(await adapter.get("k")).toBeNull();
    db.close();
  });
});
