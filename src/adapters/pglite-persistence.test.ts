import { describe, it, expect } from "vitest";
import { createPGlitePersistenceAdapter, type PGlitePersistenceClient } from "./pglite-persistence";

interface RecordedCall {
  kind: "query" | "exec";
  sql: string;
  params?: unknown[];
}

function makeMockPGlite(rows: Record<string, unknown>[] = []): {
  client: PGlitePersistenceClient;
  calls: RecordedCall[];
} {
  const calls: RecordedCall[] = [];
  const client: PGlitePersistenceClient = {
    async query(sql, params) {
      calls.push({ kind: "query", sql, params });
      return { rows: rows as never[] };
    },
    async exec(sql) {
      calls.push({ kind: "exec", sql });
    },
  };
  return { client, calls };
}

describe("createPGlitePersistenceAdapter", () => {
  it("creates the snapshot table on construction", async () => {
    const { client, calls } = makeMockPGlite();
    await createPGlitePersistenceAdapter(client);
    expect(calls[0]?.kind).toBe("exec");
    expect(calls[0]?.sql).toMatch(/CREATE TABLE IF NOT EXISTS _graph_snapshot/);
  });

  it("supports a custom table name", async () => {
    const { client, calls } = makeMockPGlite();
    await createPGlitePersistenceAdapter(client, { tableName: "my_snapshots" });
    expect(calls[0]?.sql).toMatch(/CREATE TABLE IF NOT EXISTS my_snapshots/);
  });

  it("rejects unsafe table names", async () => {
    const { client } = makeMockPGlite();
    await expect(
      createPGlitePersistenceAdapter(client, { tableName: "evil; DROP TABLE x" }),
    ).rejects.toThrow(/invalid tableName/);
  });

  it("get returns value when present", async () => {
    const { client } = makeMockPGlite([{ value: "stored" }]);
    const adapter = await createPGlitePersistenceAdapter(client);
    const result = await adapter.get("my-key");
    expect(result).toBe("stored");
  });

  it("get returns null when absent", async () => {
    const { client } = makeMockPGlite([]);
    const adapter = await createPGlitePersistenceAdapter(client);
    const result = await adapter.get("missing");
    expect(result).toBeNull();
  });

  it("set issues upsert with key, value, updated_at", async () => {
    const { client, calls } = makeMockPGlite();
    const adapter = await createPGlitePersistenceAdapter(client);
    await adapter.set("k", "v");
    const setCall = calls.find((c) => c.kind === "query" && /INSERT INTO/.test(c.sql));
    expect(setCall).toBeDefined();
    expect(setCall?.sql).toMatch(/ON CONFLICT \(key\) DO UPDATE/);
    expect(setCall?.params).toEqual(["k", "v"]);
  });

  it("remove issues DELETE WHERE key = $1", async () => {
    const { client, calls } = makeMockPGlite();
    const adapter = await createPGlitePersistenceAdapter(client);
    await adapter.remove!("k");
    const delCall = calls.find((c) => c.kind === "query" && /DELETE FROM/.test(c.sql));
    expect(delCall).toBeDefined();
    expect(delCall?.params).toEqual(["k"]);
  });
});
