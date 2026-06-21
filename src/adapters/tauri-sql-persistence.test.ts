import { describe, it, expect } from "vitest";
import {
  createTauriSqlPersistenceAdapter,
  type TauriSqlClient,
} from "./tauri-sql-persistence";

/** Stateful in-memory fake of a Tauri SQLite Database (key/value table). */
function makeFakeTauriDb(): { client: TauriSqlClient; executed: string[] } {
  const store = new Map<string, string>();
  const executed: string[] = [];
  const client: TauriSqlClient = {
    async execute(query, bind = []) {
      executed.push(query);
      if (/^INSERT INTO/.test(query.trim())) {
        const [key, value] = bind as [string, string];
        store.set(key, value);
      } else if (/^DELETE FROM/.test(query.trim())) {
        const [key] = bind as [string];
        store.delete(key);
      }
      return undefined;
    },
    async select<T = Record<string, unknown>>(_query: string, bind: unknown[] = []): Promise<T[]> {
      const [key] = bind as [string];
      const value = store.get(key);
      return (value === undefined ? [] : [{ value }]) as unknown as T[];
    },
  };
  return { client, executed };
}

describe("createTauriSqlPersistenceAdapter", () => {
  it("creates the snapshot table on construction", async () => {
    const { client, executed } = makeFakeTauriDb();
    await createTauriSqlPersistenceAdapter(client);
    expect(executed[0]).toMatch(/CREATE TABLE IF NOT EXISTS _graph_snapshot/);
  });

  it("supports a custom table name", async () => {
    const { client, executed } = makeFakeTauriDb();
    await createTauriSqlPersistenceAdapter(client, { tableName: "snap" });
    expect(executed[0]).toMatch(/CREATE TABLE IF NOT EXISTS snap/);
  });

  it("rejects unsafe table names", async () => {
    const { client } = makeFakeTauriDb();
    await expect(
      createTauriSqlPersistenceAdapter(client, { tableName: "x; DROP TABLE y" }),
    ).rejects.toThrow(/invalid tableName/);
  });

  it("persists and hydrates a value (roundtrip)", async () => {
    const { client } = makeFakeTauriDb();
    const adapter = await createTauriSqlPersistenceAdapter(client);
    expect(await adapter.get("graph")).toBeNull();
    await adapter.set("graph", '{"entities":{}}');
    expect(await adapter.get("graph")).toBe('{"entities":{}}');
  });

  it("upsert overwrites an existing key", async () => {
    const { client } = makeFakeTauriDb();
    const adapter = await createTauriSqlPersistenceAdapter(client);
    await adapter.set("k", "v1");
    await adapter.set("k", "v2");
    expect(await adapter.get("k")).toBe("v2");
  });

  it("remove deletes the row", async () => {
    const { client } = makeFakeTauriDb();
    const adapter = await createTauriSqlPersistenceAdapter(client);
    await adapter.set("k", "v");
    await adapter.remove!("k");
    expect(await adapter.get("k")).toBeNull();
  });

  it("uses SQLite ?-positional binds (not $1)", async () => {
    const { client, executed } = makeFakeTauriDb();
    const adapter = await createTauriSqlPersistenceAdapter(client);
    await adapter.set("k", "v");
    const insert = executed.find((q) => /INSERT INTO/.test(q));
    expect(insert).toMatch(/VALUES \(\?, \?, \?\)/);
    expect(insert).not.toMatch(/\$1/);
  });
});
