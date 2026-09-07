/**
 * adapters/types.ts
 *
 * Common contract every data-source adapter implements.
 * The entity graph doesn't care whether data comes from REST, GraphQL,
 * WebSocket, Supabase, Convex, PGlite shape sync — they all speak this
 * interface and write into the same graph.
 */
import type { EntityType, EntityId } from "../graph";

// ---------------------------------------------------------------------------
// Change event
// ---------------------------------------------------------------------------
export type ChangeOperation = "insert" | "update" | "delete" | "upsert";

export interface EntityChange<T = Record<string, unknown>> {
  op: ChangeOperation;
  type: EntityType;
  id: EntityId;
  data?: T;
  patch?: Partial<T>;
}

export interface ChangeSet<T = Record<string, unknown>> {
  changes: EntityChange<T>[];
  affectedListKeys?: string[];
  timestamp?: string;
  /**
   * The transport's resume position for this batch, when it has one.
   *
   * For ElectricSQL this is the shape handle plus the offset of the last
   * message in the batch — the pair a consumer echoes back to resume. It is
   * **batch-level, not per-change**: a resume position describes a boundary
   * between batches, not a point inside one.
   *
   * Absent for transports with no resume semantics (a Postgres LISTEN/NOTIFY
   * frame, for instance, carries no Electric offset). Absent is meaningful —
   * it means "this batch cannot be checkpointed", not "offset zero".
   */
  cursor?: { handle: string; offset: string };
}

// ---------------------------------------------------------------------------
// Adapter interface
// ---------------------------------------------------------------------------
export type UnsubscribeFn = () => void;

export interface SubscriptionConfig {
  label?: string;
  replayOnConnect?: boolean;
}

export interface RealtimeAdapter {
  readonly name: string;
  subscribe(config: SubscriptionConfig, handler: (changeset: ChangeSet) => void): UnsubscribeFn;
  onStatusChange?: (cb: (status: AdapterStatus) => void) => UnsubscribeFn;
}

export type AdapterStatus = "connecting" | "connected" | "disconnected" | "error";

// ---------------------------------------------------------------------------
// Sync adapter (local-first / PGlite)
// ---------------------------------------------------------------------------
export interface SyncQueryResult<T> { rows: T[]; total?: number; }

export interface SyncAdapter extends RealtimeAdapter {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<SyncQueryResult<T>>;
  execute(sql: string, params?: unknown[]): Promise<void>;
  isSynced(): boolean;
  onSyncComplete(cb: () => void): UnsubscribeFn;
}

// ---------------------------------------------------------------------------
// Channel config
// ---------------------------------------------------------------------------
export interface ChannelConfig {
  type: EntityType;
  filter?: Record<string, unknown>;
  id?: EntityId;
  operations?: ChangeOperation[];
}
