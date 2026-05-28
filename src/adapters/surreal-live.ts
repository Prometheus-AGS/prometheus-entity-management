/**
 * adapters/surreal-live.ts
 *
 * SurrealDB LIVE SELECT realtime adapter.
 *
 *   SurrealDB live stream → per-channel state machine → RealtimeAdapter contract
 *   one ChannelConfig = one LIVE SELECT = one independent reconnect/replay state
 *
 * Implements the RealtimeAdapter contract (NOT SyncAdapter) per the corrected
 * spec at openspec/specs/entity-surreal-live-adapter/spec.md. The consumer
 * owns the SurrealDB client; the adapter only orchestrates live queries.
 */

import type {
  RealtimeAdapter,
  SubscriptionConfig,
  ChannelConfig,
  ChangeSet,
  EntityChange,
  ChangeOperation,
  AdapterStatus,
  UnsubscribeFn,
} from "./types";
import type { EntityType, EntityId } from "../graph";

// ---------------------------------------------------------------------------
// Public surface — minimal-surface types (D1: no hard dep on `surrealdb`)
// ---------------------------------------------------------------------------

export interface SurrealLike {
  query<T = unknown>(sql: string, vars?: Record<string, unknown>): Promise<T[]>;
  live<T = unknown>(
    table: string,
    callback: (action: SurrealLiveAction<T>) => void,
    diff?: boolean,
  ): Promise<string>;
  kill(uuid: string): Promise<void>;
}

export interface SurrealLiveAction<T = unknown> {
  action: "CREATE" | "UPDATE" | "DELETE" | "CLOSE" | string;
  result: T;
}

export interface SurrealCheckpointStore {
  get(channelKey: string): Promise<string | undefined>;
  set(channelKey: string, value: string): Promise<void>;
}

export interface SurrealTableConfig {
  type: EntityType;
  /** SurrealDB table name; defaults to `type`. */
  table?: string;
  /** Field in the row that carries the entity id; defaults to "id". */
  idField?: string;
}

export interface SurrealLiveAdapterOptions {
  name?: string;
  surreal: SurrealLike;
  tables: SurrealTableConfig[];
  initialQueryStrategy?: "select-then-live" | "live-only";
  initialDelayMs?: number;
  maxDelayMs?: number;
  connectedSettleMs?: number;
  checkpointStore?: SurrealCheckpointStore;
  checkpointField?: string;
  listKeyResolver?: (change: EntityChange) => string[] | undefined;
  permanentErrorPatterns?: RegExp[];
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createSurrealLiveAdapter(opts: SurrealLiveAdapterOptions): RealtimeAdapter {
  return new SurrealLiveAdapter(opts);
}

// ---------------------------------------------------------------------------
// Internals — Adapter
// ---------------------------------------------------------------------------

type Row = Record<string, unknown>;

const DEFAULT_INITIAL_DELAY = 500;
const DEFAULT_MAX_DELAY = 30_000;
const DEFAULT_CONNECTED_SETTLE = 30_000;
const DEFAULT_CHECKPOINT_FIELD = "updated_at";
const DEFAULT_PERMANENT_PATTERNS = [
  /authentication/i,
  /unauthor/i,
  /namespace/i,
  /unknown\s+table/i,
  /permission/i,
];
const STATUS_PRIORITY: AdapterStatus[] = ["error", "disconnected", "connecting", "connected"];

class SurrealLiveAdapter implements RealtimeAdapter {
  readonly name: string;
  private readonly opts: Required<
    Omit<SurrealLiveAdapterOptions, "checkpointStore" | "listKeyResolver" | "name">
  > & {
    name: string;
    checkpointStore?: SurrealCheckpointStore;
    listKeyResolver?: (change: EntityChange) => string[] | undefined;
  };
  private readonly channels = new Map<string, SurrealChannel>();
  private readonly channelStates = new Map<string, AdapterStatus>();
  private readonly statusCallbacks = new Set<(status: AdapterStatus) => void>();
  private _status: AdapterStatus = "connecting";

  constructor(rawOpts: SurrealLiveAdapterOptions) {
    this.opts = {
      name: rawOpts.name ?? "surreal-live",
      surreal: rawOpts.surreal,
      tables: rawOpts.tables,
      initialQueryStrategy: rawOpts.initialQueryStrategy ?? "select-then-live",
      initialDelayMs: rawOpts.initialDelayMs ?? DEFAULT_INITIAL_DELAY,
      maxDelayMs: rawOpts.maxDelayMs ?? DEFAULT_MAX_DELAY,
      connectedSettleMs: rawOpts.connectedSettleMs ?? DEFAULT_CONNECTED_SETTLE,
      checkpointField: rawOpts.checkpointField ?? DEFAULT_CHECKPOINT_FIELD,
      permanentErrorPatterns: rawOpts.permanentErrorPatterns ?? DEFAULT_PERMANENT_PATTERNS,
      checkpointStore: rawOpts.checkpointStore,
      listKeyResolver: rawOpts.listKeyResolver,
    };
    this.name = this.opts.name;
  }

  subscribe(config: SubscriptionConfig, handler: (cs: ChangeSet) => void): UnsubscribeFn {
    const channelConfig = this._resolveChannelConfig(config);
    const key = this._channelKey(config, channelConfig);
    const channel = new SurrealChannel(this, config, channelConfig, key, handler);
    this.channels.set(key, channel);
    this.channelStates.set(key, "connecting");
    this._recomputeStatus();
    // Fire-and-forget start; channel records its own status transitions.
    channel.start().catch(() => {
      // start() handles its own error reporting via _setStatus(error)
    });
    return () => {
      const ch = this.channels.get(key);
      if (!ch) return;
      this.channels.delete(key);
      this.channelStates.delete(key);
      void ch.stop();
      this._recomputeStatus();
    };
  }

  onStatusChange = (cb: (status: AdapterStatus) => void): UnsubscribeFn => {
    this.statusCallbacks.add(cb);
    return () => {
      this.statusCallbacks.delete(cb);
    };
  };

  // ─── package-private helpers used by SurrealChannel ───────────────────────

  _setChannelStatus(key: string, status: AdapterStatus): void {
    if (this.channelStates.get(key) === status) return;
    this.channelStates.set(key, status);
    this._recomputeStatus();
  }

  _getOpts() {
    return this.opts;
  }

  private _recomputeStatus(): void {
    const states = [...this.channelStates.values()];
    const aggregate: AdapterStatus =
      states.length === 0
        ? "connecting"
        : (STATUS_PRIORITY.find((s) => states.includes(s)) ?? "connecting");
    if (aggregate === this._status) return;
    this._status = aggregate;
    for (const cb of this.statusCallbacks) cb(aggregate);
  }

  private _resolveChannelConfig(config: SubscriptionConfig): ChannelConfig {
    // The RealtimeManager passes `label: "<adapter-name>/<type>"`; recover the type from there.
    // When labels don't follow that shape, fall back to the first configured table.
    const labelType = config.label?.split("/").pop();
    const match = this.opts.tables.find((t) => t.type === labelType) ?? this.opts.tables[0];
    if (!match) {
      throw new Error(
        `[surreal-live] no tables configured; pass at least one SurrealTableConfig to createSurrealLiveAdapter`,
      );
    }
    return {
      type: match.type,
    };
  }

  private _channelKey(config: SubscriptionConfig, channelConfig: ChannelConfig): string {
    const label = config.label ?? `${this.name}/${channelConfig.type}`;
    return label;
  }
}

// ---------------------------------------------------------------------------
// Internals — per-channel state machine (design D2)
// ---------------------------------------------------------------------------

class SurrealChannel {
  private liveUuid: string | null = null;
  private buffer: SurrealLiveAction<Row>[] = [];
  private seedComplete = false;
  private attempt = 0;
  private connectedSettleTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private aborted = false;
  private status: AdapterStatus = "connecting";

  constructor(
    private readonly adapter: SurrealLiveAdapter,
    private readonly config: SubscriptionConfig,
    private readonly channelConfig: ChannelConfig,
    readonly key: string,
    private readonly handler: (cs: ChangeSet) => void,
  ) {}

  async start(): Promise<void> {
    if (this.aborted) return;
    this._setStatus("connecting");
    try {
      // D3: open LIVE first so notifications arriving during seed are buffered.
      await this._openLive();
      const opts = this.adapter._getOpts();
      if (opts.initialQueryStrategy !== "live-only") {
        await this._runSeed();
      }
      // Flush the buffer (which may have grown during seed) in arrival order.
      this.seedComplete = true;
      const buffered = this.buffer.splice(0);
      for (const action of buffered) this._handleAction(action);
      this._setStatus("connected");
      this._armConnectedSettle();
    } catch (err) {
      this._scheduleReconnect(err);
    }
  }

  async stop(): Promise<void> {
    this.aborted = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.connectedSettleTimer) {
      clearTimeout(this.connectedSettleTimer);
      this.connectedSettleTimer = null;
    }
    if (this.liveUuid) {
      const uuid = this.liveUuid;
      this.liveUuid = null;
      try {
        await this.adapter._getOpts().surreal.kill(uuid);
      } catch {
        // already-closed live queries are no-ops (defensive per design risk §4)
      }
    }
  }

  // ─── private ──────────────────────────────────────────────────────────────

  private _table(): string {
    const t = this.adapter._getOpts().tables.find((x) => x.type === this.channelConfig.type);
    return t?.table ?? this.channelConfig.type;
  }

  private _idField(): string {
    const t = this.adapter._getOpts().tables.find((x) => x.type === this.channelConfig.type);
    return t?.idField ?? "id";
  }

  private async _openLive(): Promise<void> {
    if (this.aborted) return;
    const surreal = this.adapter._getOpts().surreal;
    this.liveUuid = await surreal.live<Row>(this._table(), (action) => {
      this._onLiveAction(action);
    });
  }

  private _onLiveAction(action: SurrealLiveAction<Row>): void {
    if (this.aborted) return;
    if (!this.seedComplete) {
      this.buffer.push(action);
      return;
    }
    this._handleAction(action);
  }

  private _handleAction(action: SurrealLiveAction<Row>): void {
    const op = mapAction(action.action);
    if (op === "close") {
      this._scheduleReconnect(new Error("SurrealDB live query closed"));
      return;
    }
    if (op === null) {
      // Unknown action — warn + skip.
      // eslint-disable-next-line no-console
      console.warn(`[surreal-live] unknown action "${action.action}"; skipping`);
      return;
    }
    // D8: ChannelConfig.operations filter — honor when present.
    const allowed = this.channelConfig.operations;
    if (allowed && !allowed.includes(op)) return;

    const change = this._rowToChange(op, action.result);
    if (!change) return;
    const changeset: ChangeSet = {
      changes: [change],
      timestamp: new Date().toISOString(),
      affectedListKeys: this._resolveListKeys([change]),
    };
    this.handler(changeset);
    void this._persistCheckpoint(change);
  }

  private async _runSeed(): Promise<void> {
    const surreal = this.adapter._getOpts().surreal;
    const table = this._table();
    const sql = `SELECT * FROM ${table}`;
    const rows = (await surreal.query<Row>(sql)) ?? [];
    const changes: EntityChange[] = [];
    for (const row of rows) {
      const change = this._rowToChange("insert", row);
      if (change) changes.push(change);
    }
    const changeset: ChangeSet = {
      changes,
      timestamp: new Date().toISOString(),
      affectedListKeys: this._resolveListKeys(changes),
    };
    this.handler(changeset);
    // Update checkpoint to the latest seen row (best-effort).
    for (const change of changes) void this._persistCheckpoint(change);
  }

  private _rowToChange(op: ChangeOperation, row: Row | null | undefined): EntityChange | null {
    if (!row && op !== "delete") return null;
    const idValue = row?.[this._idField()];
    if (idValue == null) {
      // delete without an id — skip; consumer can't act on it
      // eslint-disable-next-line no-console
      console.warn(`[surreal-live] action ${op} missing id field "${this._idField()}"; skipping`);
      return null;
    }
    const id = String(idValue) as EntityId;
    const base = {
      op,
      type: this.channelConfig.type,
      id,
    };
    if (op === "delete") return base;
    return { ...base, data: row as Record<string, unknown> };
  }

  private _resolveListKeys(changes: EntityChange[]): string[] | undefined {
    const resolver = this.adapter._getOpts().listKeyResolver;
    if (!resolver) return undefined;
    const acc = new Set<string>();
    for (const change of changes) {
      const keys = resolver(change);
      if (!keys) continue;
      for (const k of keys) acc.add(k);
    }
    return acc.size === 0 ? undefined : [...acc];
  }

  private async _persistCheckpoint(change: EntityChange): Promise<void> {
    const opts = this.adapter._getOpts();
    if (!opts.checkpointStore) return;
    const value = (change.data as Record<string, unknown> | undefined)?.[opts.checkpointField];
    if (value == null) return;
    try {
      await opts.checkpointStore.set(this.key, String(value));
    } catch {
      // best-effort; do not interrupt the dispatch loop
    }
  }

  private async _replayFromCheckpoint(): Promise<void> {
    const opts = this.adapter._getOpts();
    if (!opts.checkpointStore) return;
    const stored = await opts.checkpointStore.get(this.key);
    if (!stored) return;
    const sql = `SELECT * FROM ${this._table()} WHERE ${opts.checkpointField} > $stored ORDER BY ${opts.checkpointField} ASC`;
    const rows = (await opts.surreal.query<Row>(sql, { stored })) ?? [];
    if (rows.length === 0) return;
    const changes: EntityChange[] = [];
    for (const row of rows) {
      const change = this._rowToChange("update", row);
      if (change) changes.push(change);
    }
    if (changes.length === 0) return;
    const changeset: ChangeSet = {
      changes,
      timestamp: new Date().toISOString(),
      affectedListKeys: this._resolveListKeys(changes),
    };
    this.handler(changeset);
    for (const change of changes) void this._persistCheckpoint(change);
  }

  private _scheduleReconnect(reason: unknown): void {
    if (this.aborted) return;
    if (this._isPermanent(reason)) {
      this._setStatus("error");
      return;
    }
    this._setStatus("disconnected");
    this.attempt += 1;
    const opts = this.adapter._getOpts();
    const exp = Math.min(this.attempt - 1, 6);
    const base = Math.min(opts.initialDelayMs * 2 ** exp, opts.maxDelayMs);
    const jitter = base * 0.25 * (Math.random() * 2 - 1);
    const delay = Math.max(0, Math.round(base + jitter));
    this._setStatus("connecting");
    this.reconnectTimer = setTimeout(async () => {
      if (this.aborted) return;
      try {
        await this._openLive();
        if (opts.checkpointStore) await this._replayFromCheckpoint();
        this._setStatus("connected");
        this._armConnectedSettle();
      } catch (err) {
        this._scheduleReconnect(err);
      }
    }, delay);
  }

  private _isPermanent(reason: unknown): boolean {
    const msg = reason instanceof Error ? reason.message : String(reason ?? "");
    const patterns = this.adapter._getOpts().permanentErrorPatterns;
    return patterns.some((re) => re.test(msg));
  }

  private _armConnectedSettle(): void {
    if (this.connectedSettleTimer) clearTimeout(this.connectedSettleTimer);
    this.connectedSettleTimer = setTimeout(() => {
      this.attempt = 0;
    }, this.adapter._getOpts().connectedSettleMs);
  }

  private _setStatus(status: AdapterStatus): void {
    if (this.status === status) return;
    this.status = status;
    this.adapter._setChannelStatus(this.key, status);
  }
}

// ---------------------------------------------------------------------------
// Action enum normalization (design D6)
// ---------------------------------------------------------------------------

function mapAction(action: string): ChangeOperation | "close" | null {
  switch ((action ?? "").toUpperCase()) {
    case "CREATE":
      return "insert";
    case "UPDATE":
      return "update";
    case "DELETE":
      return "delete";
    case "CLOSE":
      return "close";
    default:
      return null;
  }
}
