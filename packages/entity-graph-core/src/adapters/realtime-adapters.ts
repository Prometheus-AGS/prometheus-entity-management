/**
 * adapters/realtime-adapters.ts
 *
 * WebSocket, Supabase Realtime, Convex, and GraphQL subscription adapters.
 * All implement RealtimeAdapter and route through RealtimeManager → entity graph.
 */
import type {
  RealtimeAdapter,
  SubscriptionConfig,
  ChangeSet,
  EntityChange,
  ChangeOperation,
  AdapterStatus,
  UnsubscribeFn,
  ChannelConfig,
} from "./types";

// =============================================================================
// WebSocket adapter
// =============================================================================

export interface WebSocketAdapterOptions {
  url: string | (() => string);
  parseMessage?: (data: unknown) => EntityChange[] | null;
  protocols?: string | string[];
  reconnectBaseDelay?: number;
  maxReconnectAttempts?: number;
  pingInterval?: number;
  pingMessage?: string;
}

export function createWebSocketAdapter(opts: WebSocketAdapterOptions): RealtimeAdapter {
  const {
    url,
    parseMessage,
    protocols,
    reconnectBaseDelay = 1_000,
    maxReconnectAttempts = Infinity,
    pingInterval = 30_000,
    pingMessage = '{"type":"ping"}',
  } = opts;

  const statusCbs  = new Set<(s: AdapterStatus) => void>();
  const handlers   = new Set<(cs: ChangeSet) => void>();
  let ws: WebSocket | null = null;
  let attempts = 0;
  let reconnTimer: ReturnType<typeof setTimeout> | null = null;
  let pingTimer:   ReturnType<typeof setInterval>  | null = null;
  let stopped = false;

  const emit = (s: AdapterStatus) => { for (const cb of statusCbs) cb(s); };

  function connect() {
    if (stopped) return;
    const u = typeof url === "function" ? url() : url;
    emit("connecting");
    ws = new WebSocket(u, protocols);
    ws.onopen = () => {
      attempts = 0;
      emit("connected");
      if (pingInterval > 0)
        pingTimer = setInterval(() => { if (ws?.readyState === 1) ws.send(pingMessage); }, pingInterval);
    };
    ws.onmessage = (ev) => {
      let parsed: unknown;
      try { parsed = JSON.parse(ev.data); } catch { return; }
      const changes = parseMessage ? parseMessage(parsed) : defaultParse(parsed);
      if (!changes?.length) return;
      for (const h of handlers) h({ changes, timestamp: new Date().toISOString() });
    };
    ws.onclose = () => {
      emit("disconnected");
      clearInterval(pingTimer!);
      if (!stopped && attempts < maxReconnectAttempts)
        reconnTimer = setTimeout(connect, reconnectBaseDelay * Math.pow(2, Math.min(attempts++, 6)));
    };
    ws.onerror = () => { emit("error"); ws?.close(); };
  }

  return {
    name: "websocket",
    subscribe(_cfg: SubscriptionConfig, handler: (cs: ChangeSet) => void): UnsubscribeFn {
      handlers.add(handler);
      if (!ws || ws.readyState === WebSocket.CLOSED) connect();
      return () => {
        handlers.delete(handler);
        if (handlers.size === 0) {
          stopped = true;
          clearTimeout(reconnTimer!);
          clearInterval(pingTimer!);
          ws?.close();
          ws = null;
        }
      };
    },
    onStatusChange: (cb) => { statusCbs.add(cb); return () => statusCbs.delete(cb); },
  };
}

function defaultParse(data: unknown): EntityChange[] | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (d.op && d.type && d.id) return [d as unknown as EntityChange];
  if (Array.isArray(d.changes)) return d.changes as EntityChange[];
  return null;
}

// =============================================================================
// Supabase Realtime adapter
// =============================================================================

// Minimal surface types — no hard dep on @supabase/supabase-js
interface SupabaseClient { channel(name: string): SupabaseChannel; }
interface SupabaseChannel {
  on(
    event: "postgres_changes",
    config: { event: "*"|"INSERT"|"UPDATE"|"DELETE"; schema: string; table: string; filter?: string },
    handler: (payload: SupabasePayload) => void
  ): SupabaseChannel;
  subscribe(cb?: (status: string) => void): SupabaseChannel;
  unsubscribe(): Promise<void>;
}
interface SupabasePayload {
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: Record<string, unknown>;
  old: Record<string, unknown>;
  table: string;
}

export interface SupabaseAdapterOptions {
  tableTypeMap?: Record<string, string>;
  extractId?: (record: Record<string, unknown>) => string;
  schema?: string;
}

export function createSupabaseRealtimeAdapter(
  client: SupabaseClient,
  opts: SupabaseAdapterOptions = {}
): RealtimeAdapter & {
  subscribeChannel: (config: ChannelConfig & { _handler?: (cs: ChangeSet) => void }) => UnsubscribeFn;
} {
  const {
    tableTypeMap = {},
    extractId = (r) => String(r.id),
    schema = "public",
  } = opts;
  const statusCbs = new Set<(s: AdapterStatus) => void>();

  function resolveType(table: string): string {
    return tableTypeMap[table] ?? (table.charAt(0).toUpperCase() + table.slice(1));
  }

  function payloadToChange(p: SupabasePayload): EntityChange | null {
    const type = resolveType(p.table);
    if (p.eventType === "DELETE") {
      const id = extractId(p.old);
      return id ? { op: "delete", type, id } : null;
    }
    const id = extractId(p.new);
    if (!id) return null;
    return { op: p.eventType === "INSERT" ? "insert" : "upsert", type, id, data: p.new };
  }

  return {
    name: "supabase-realtime",
    /**
     * Generic subscribe is a no-op for Supabase. Use `subscribeChannel()` instead,
     * which accepts a `ChannelConfig` with Supabase-specific table/filter parameters.
     */
    subscribe(_cfg: SubscriptionConfig, _handler: (cs: ChangeSet) => void): UnsubscribeFn {
      return () => {};
    },
    onStatusChange: (cb) => { statusCbs.add(cb); return () => statusCbs.delete(cb); },
    subscribeChannel(config) {
      const tableName =
        Object.entries(tableTypeMap).find(([, t]) => t === config.type)?.[0] ??
        config.type.toLowerCase();
      const filterStr = config.id
        ? `id=eq.${config.id}`
        : config.filter
        ? Object.entries(config.filter).map(([k, v]) => `${k}=eq.${v}`).join(",")
        : undefined;

      const channel = client
        .channel(`entity-store:${config.type}:${config.id ?? "all"}`)
        .on("postgres_changes", { event: "*", schema, table: tableName, ...(filterStr ? { filter: filterStr } : {}) }, (payload) => {
          const change = payloadToChange(payload);
          if (!change) return;
          config._handler?.({ changes: [change], timestamp: new Date().toISOString() });
        })
        .subscribe((status) => {
          const s: AdapterStatus =
            status === "SUBSCRIBED"    ? "connected"    :
            status === "CHANNEL_ERROR" ? "error"        :
            status === "CLOSED"        ? "disconnected" : "connecting";
          for (const cb of statusCbs) cb(s);
        });

      return () => { channel.unsubscribe(); };
    },
  };
}

// =============================================================================
// Convex adapter — snapshot-diff reactive queries → EntityChanges
// =============================================================================

interface ConvexClient {
  onUpdate<T>(
    query: unknown,
    args: Record<string, unknown>,
    handler: (result: T) => void
  ): UnsubscribeFn;
}

export interface ConvexChannelConfig<T extends object> {
  type: string;
  query: unknown;
  args?: Record<string, unknown>;
  extractId?: (record: T) => string;
  normalize?: (record: T) => Record<string, unknown>;
}

export function createConvexAdapter<T extends object>(opts: {
  client: ConvexClient;
  channels: ConvexChannelConfig<T>[];
}): RealtimeAdapter {
  const { client, channels } = opts;
  const statusCbs = new Set<(s: AdapterStatus) => void>();
  const snapshots = new Map<string, Map<string, T>>();

  function diffSnapshot(
    type: string,
    prev: Map<string, T>,
    next: T[],
    extractId: (r: T) => string,
    normalize?: (r: T) => Record<string, unknown>
  ): EntityChange[] {
    const changes: EntityChange[] = [];
    const nextIds = new Set<string>();

    for (const record of next) {
      const id = extractId(record);
      nextIds.add(id);
      const data = normalize ? normalize(record) : (record as unknown as Record<string, unknown>);
      changes.push({ op: prev.has(id) ? "upsert" : "insert", type, id, data });
      prev.set(id, record);
    }

    for (const [id] of prev) {
      if (!nextIds.has(id)) {
        changes.push({ op: "delete", type, id });
        prev.delete(id);
      }
    }

    return changes;
  }

  return {
    name: "convex",
    subscribe(_cfg: SubscriptionConfig, handler: (cs: ChangeSet) => void): UnsubscribeFn {
      const unsubs: UnsubscribeFn[] = [];

      for (const ch of channels) {
        const { type, query, args = {}, normalize } = ch;
        const extractId =
          ch.extractId ??
          ((r: T) =>
            String(
              (r as Record<string, unknown>)._id ??
              (r as Record<string, unknown>).id
            ));

        if (!snapshots.has(type)) snapshots.set(type, new Map());
        const snap = snapshots.get(type)!;

        unsubs.push(
          client.onUpdate(query, args, (records: T[]) => {
            const changes = diffSnapshot(type, snap, records, extractId, normalize);
            if (changes.length > 0)
              handler({ changes, timestamp: new Date().toISOString() });
          })
        );
      }

      for (const cb of statusCbs) cb("connected");
      return () => {
        for (const u of unsubs) u();
        for (const cb of statusCbs) cb("disconnected");
      };
    },
    onStatusChange: (cb) => { statusCbs.add(cb); return () => statusCbs.delete(cb); },
  };
}

// =============================================================================
// GraphQL Subscription adapter — graphql-ws protocol
// =============================================================================

interface GQLWsClient {
  subscribe<T>(
    payload: { query: string; variables?: Record<string, unknown> },
    sink: {
      next: (value: { data: T }) => void;
      error: (err: unknown) => void;
      complete: () => void;
    }
  ): UnsubscribeFn;
}

export interface GQLSubscriptionConfig<T extends object> {
  type: string;
  document: string;
  variables?: Record<string, unknown>;
  getPayload: (
    data: T
  ) => GQLPayload | GQLPayload[] | null;
}

interface GQLPayload {
  type?: string;
  node?: Record<string, unknown>;
  id?: string;
}

export function createGraphQLSubscriptionAdapter<T extends object>(opts: {
  client: GQLWsClient;
  subscriptions: GQLSubscriptionConfig<T>[];
  extractId?: (node: Record<string, unknown>, type: string) => string;
  normalize?: (node: Record<string, unknown>, type: string) => Record<string, unknown>;
}): RealtimeAdapter {
  const {
    client,
    subscriptions,
    extractId = (n) => String(n.id),
    normalize,
  } = opts;
  const statusCbs = new Set<(s: AdapterStatus) => void>();

  function payloadToChange(type: string, p: GQLPayload): EntityChange | null {
    const gqlType = p.type ?? "updated";

    if (gqlType === "deleted") {
      const id = p.id ?? (p.node ? extractId(p.node, type) : null);
      return id ? { op: "delete", type, id } : null;
    }

    if (!p.node) return null;
    const id = extractId(p.node, type);
    const data = normalize ? normalize(p.node, type) : stripTypename(p.node);
    const op: ChangeOperation = gqlType === "created" ? "insert" : "upsert";
    return { op, type, id, data };
  }

  return {
    name: "graphql-subscription",
    subscribe(_cfg: SubscriptionConfig, handler: (cs: ChangeSet) => void): UnsubscribeFn {
      const unsubs: UnsubscribeFn[] = [];

      for (const sub of subscriptions) {
        const { type, document, variables, getPayload } = sub;

        unsubs.push(
          client.subscribe<T>(
            { query: document, variables },
            {
              next: ({ data }) => {
                const raw = getPayload(data);
                if (!raw) return;
                const payloads = Array.isArray(raw) ? raw : [raw];
                const changes = payloads
                  .map((p) => payloadToChange(type, p))
                  .filter((c): c is EntityChange => c !== null);
                if (changes.length > 0)
                  handler({ changes, timestamp: new Date().toISOString() });
              },
              error: (e) => {
                console.error(`[GQLSub] ${type}:`, e);
                for (const cb of statusCbs) cb("error");
              },
              complete: () => {
                for (const cb of statusCbs) cb("disconnected");
              },
            }
          )
        );
      }

      for (const cb of statusCbs) cb("connected");
      return () => { for (const u of unsubs) u(); };
    },
    onStatusChange: (cb) => { statusCbs.add(cb); return () => statusCbs.delete(cb); },
  };
}

function stripTypename(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (k === "__typename") continue;
    result[k] =
      v && typeof v === "object" && !Array.isArray(v)
        ? stripTypename(v as Record<string, unknown>)
        : v;
  }
  return result;
}
