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
