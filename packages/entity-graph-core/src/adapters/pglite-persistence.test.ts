import { describe, it, expect } from "vitest";
import { createPGlitePersistenceAdapter, evaluateResume, type PGlitePersistenceClient } from "./pglite-persistence";

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

/**
 * ADR-009 G3 — rows and resume checkpoint commit together.
 *
 * The window this closes: `set(rows)` then `setCheckpoint(pos)` is two
 * transactions, and a crash between them leaves rows whose resume position is
 * unknown. Resuming such a replica silently mixes two generations.
 */
describe("checkpoint atomicity (ADR-009 G3)", () => {
  it("writes rows and checkpoint in ONE statement", async () => {
    const { client, calls } = makeMockPGlite();
    const adapter = await createPGlitePersistenceAdapter(client);

    await adapter.setWithCheckpoint({
      key: "replica",
      value: "{}",
      checkpoint: { handle: "h-1", offset: "42", generation: 1 },
    });

    // One statement carrying both. Two writes here would be the defect.
    const writes = calls.filter(
      (c) => c.kind === "query" && /INSERT INTO/.test(c.sql),
    );
    expect(writes).toHaveLength(1);
    expect(writes[0]?.sql).toMatch(/checkpoint_handle/);
    expect(writes[0]?.params).toEqual(["replica", "{}", "h-1", "42", 1]);
  });

  it("adds checkpoint columns to an existing table", async () => {
    // An installed base already has the table; the columns must migrate in
    // place rather than requiring a drop.
    const { client, calls } = makeMockPGlite();
    await createPGlitePersistenceAdapter(client);

    const alter = calls.find((c) => c.kind === "exec" && /ALTER TABLE/.test(c.sql));
    expect(alter?.sql).toMatch(/ADD COLUMN IF NOT EXISTS checkpoint_handle/);
  });

  it("reports no checkpoint for a row written by plain set", async () => {
    // "Rows exist, position unknown" — which must read as rebuild, not as
    // offset zero.
    const { client } = makeMockPGlite([
      { checkpoint_handle: null, checkpoint_offset: null, checkpoint_generation: null },
    ]);
    const adapter = await createPGlitePersistenceAdapter(client);
    await expect(adapter.getCheckpoint("replica")).resolves.toBeNull();
  });

  it("round-trips a stored checkpoint", async () => {
    const { client } = makeMockPGlite([
      { checkpoint_handle: "h-9", checkpoint_offset: "17", checkpoint_generation: 3 },
    ]);
    const adapter = await createPGlitePersistenceAdapter(client);
    await expect(adapter.getCheckpoint("replica")).resolves.toEqual({
      handle: "h-9",
      offset: "17",
      generation: 3,
    });
  });
});

describe("evaluateResume (ADR-009 G3)", () => {
  const checkpoint = { handle: "h-1", offset: "42", generation: 1 };

  it("resumes when value, generation and handle all agree", () => {
    expect(
      evaluateResume({ value: "{}", checkpoint }, { generation: 1, handle: "h-1" }),
    ).toEqual({ action: "resume", checkpoint });
  });

  it("rebuilds when rows exist without a checkpoint", () => {
    // The interruption case: a crash after the rows landed but before a
    // checkpoint could describe them.
    expect(evaluateResume({ value: "{}", checkpoint: null }, { generation: 1 })).toEqual({
      action: "rebuild",
      reason: "no-checkpoint",
    });
  });

  it("rebuilds when the checkpoint belongs to an earlier generation", () => {
    expect(
      evaluateResume({ value: "{}", checkpoint }, { generation: 2 }),
    ).toEqual({ action: "rebuild", reason: "stale-generation" });
  });

  it("rebuilds when the server issued a new shape handle", () => {
    // Old offsets are meaningless against a new handle; resuming would apply
    // them to a different stream.
    expect(
      evaluateResume({ value: "{}", checkpoint }, { generation: 1, handle: "h-2" }),
    ).toEqual({ action: "rebuild", reason: "handle-changed" });
  });

  it("reports a cold start as a rebuild, not a fault", () => {
    expect(evaluateResume({ value: null, checkpoint: null }, { generation: 1 })).toEqual({
      action: "rebuild",
      reason: "no-value",
    });
  });

  it("does not compare a handle the caller has not got yet", () => {
    // Resuming before the server has issued a handle is legitimate; only a
    // *mismatch* invalidates.
    expect(evaluateResume({ value: "{}", checkpoint }, { generation: 1 })).toEqual({
      action: "resume",
      checkpoint,
    });
  });
});
