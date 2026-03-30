/**
 * adapters/realtime-manager.ts
 *
 * Routes all adapter ChangeSet events into the entity graph.
 * Coalesces rapid-fire updates within a 16ms flush window so that
 * e.g. 10 Supabase row updates for the same entity become one Zustand write.
 */
import { useGraphStore } from "../graph";
import type { RealtimeAdapter, ChangeSet, EntityChange, AdapterStatus, UnsubscribeFn, ChannelConfig } from "./types";

export interface ManagerOptions {
  flushInterval?: number;
  onStatusChange?: (adapter: string, status: AdapterStatus) => void;
  onChangeReceived?: (adapter: string, change: EntityChange) => void;
}

interface RegisteredAdapter { adapter: RealtimeAdapter; unsubscribes: UnsubscribeFn[]; }

export class RealtimeManager {
  private adapters = new Map<string, RegisteredAdapter>();
  private pendingChanges: EntityChange[] = [];
  private pendingListKeys = new Set<string>();
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private opts: Required<ManagerOptions>;

  constructor(opts: ManagerOptions = {}) {
    this.opts = {
      flushInterval: opts.flushInterval ?? 16,
      onStatusChange: opts.onStatusChange ?? (() => {}),
      onChangeReceived: opts.onChangeReceived ?? (() => {}),
    };
  }

  register(adapter: RealtimeAdapter, channels: ChannelConfig[], normalize?: (raw: unknown) => EntityChange | null): UnsubscribeFn {
    const existing = this.adapters.get(adapter.name);
    const registered: RegisteredAdapter = existing ?? { adapter, unsubscribes: [] };
    if (!existing) this.adapters.set(adapter.name, registered);
    if (adapter.onStatusChange) {
      registered.unsubscribes.push(adapter.onStatusChange((s) => this.opts.onStatusChange(adapter.name, s)));
    }
    for (const channel of channels) {
      const unsub = adapter.subscribe(
        { label: `${adapter.name}/${channel.type}`, replayOnConnect: true },
        (cs) => this.handleChangeset(adapter.name, cs, normalize)
      );
      registered.unsubscribes.push(unsub);
    }
    return () => this.unregister(adapter.name);
  }

  unregister(name: string) {
    const r = this.adapters.get(name); if (!r) return;
    for (const u of r.unsubscribes) u();
    this.adapters.delete(name);
  }

  unregisterAll() { for (const n of this.adapters.keys()) this.unregister(n); }

  private handleChangeset(name: string, cs: ChangeSet, normalize?: (raw: unknown) => EntityChange | null) {
    for (const rawChange of cs.changes) {
      const change = normalize ? normalize(rawChange) : rawChange;
      if (!change) continue;
      this.opts.onChangeReceived(name, change);
      this.pendingChanges.push(change);
    }
    if (cs.affectedListKeys) for (const k of cs.affectedListKeys) this.pendingListKeys.add(k);
    this.scheduleFlush();
  }

  private scheduleFlush() {
    if (this.opts.flushInterval === 0) { this.flush(); return; }
    if (this.flushTimer !== null) return;
    this.flushTimer = setTimeout(() => { this.flushTimer = null; this.flush(); }, this.opts.flushInterval);
  }

  flush() {
    if (this.pendingChanges.length === 0 && this.pendingListKeys.size === 0) return;
    const changes = this.pendingChanges.splice(0);
    const listKeys = new Set(this.pendingListKeys); this.pendingListKeys.clear();
    const store = useGraphStore.getState();
    for (const change of coalesceChanges(changes)) {
      switch (change.op) {
        case "insert": case "upsert":
          if (change.data) { store.upsertEntity(change.type, change.id, change.data); store.setEntityFetched(change.type, change.id); }
          break;
        case "update":
          if (change.patch) {
            if (store.entities[change.type]?.[change.id]) store.upsertEntity(change.type, change.id, change.patch as Record<string, unknown>);
            else store.invalidateEntity(change.type, change.id);
          } else if (change.data) { store.upsertEntity(change.type, change.id, change.data); store.setEntityFetched(change.type, change.id); }
          break;
        case "delete":
          store.removeEntity(change.type, change.id);
          store.removeIdFromAllLists(change.type, change.id);
          break;
      }
    }
    for (const key of listKeys) store.invalidateLists(key);
  }

  forceFlush() { if (this.flushTimer !== null) { clearTimeout(this.flushTimer); this.flushTimer = null; } this.flush(); }
}

function coalesceChanges(changes: EntityChange[]): EntityChange[] {
  const byKey = new Map<string, EntityChange>();
  for (const c of changes) {
    const key = `${c.type}:${c.id}`; const existing = byKey.get(key);
    if (!existing) { byKey.set(key, { ...c }); continue; }
    if (c.op === "delete") { byKey.set(key, c); continue; }
    if (existing.op === "delete") continue;
    byKey.set(key, { ...existing, op: "upsert", data: c.data ?? existing.data, patch: c.patch ? { ...(existing.patch ?? {}), ...c.patch } : existing.patch });
  }
  return Array.from(byKey.values());
}

let _manager: RealtimeManager | null = null;
export function getRealtimeManager(opts?: ManagerOptions): RealtimeManager {
  if (!_manager) _manager = new RealtimeManager(opts);
  return _manager;
}
export function resetRealtimeManager() { _manager?.unregisterAll(); _manager = null; }
