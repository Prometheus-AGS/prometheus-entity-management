/**
 * Render-only live layer: fast-changing, ephemeral field values (streaming
 * text, cursors, partial tool arguments) held beside the graph.
 *
 * Live values are NOT graph writes: they do not publish to graph subscribers,
 * are not persisted by `persistGraphToStorage`, and do not appear in devtools
 * snapshots or time travel. Subscribers of one entity are notified per write,
 * and `read()` returns the durable entity merged with its live fields (a stable
 * reference until either side changes). `commit()` makes the live values
 * durable with one graph write and clears them; `discard()` drops them.
 *
 * Typical streaming use: `append` every token, render from `read`, and
 * `commit` at message boundaries or on a checkpoint cadence.
 */
import { graphStore, type EntityId, type EntityType, type GraphState, type GraphStore } from "./graph";
import { batchGraphWrites } from "./graph-batch";

export interface LiveLayerOptions {
  /** Graph the live values overlay and commit into (default: the process graph). */
  store?: GraphStore;
}

export interface LiveLayer {
  /** Merge ephemeral field values for one entity. */
  set(type: EntityType, id: EntityId, values: Record<string, unknown>): void;
  /**
   * Append a chunk to a string field. Starts from the current live value, else
   * the durable value when it is a string, else the empty string.
   */
  append(type: EntityType, id: EntityId, field: string, chunk: string): void;
  /** The live fields of one entity, or `undefined` when none are held. */
  get(type: EntityType, id: EntityId): Readonly<Record<string, unknown>> | undefined;
  /** Durable entity (canonical + patches) overlaid with live fields; `null` when neither exists. */
  read<T = Record<string, unknown>>(type: EntityType, id: EntityId): T | null;
  /** Listen to live writes and durable graph changes for one entity. Returns an unsubscribe function. */
  subscribe(type: EntityType, id: EntityId, listener: () => void): () => void;
  /** Write the entity's live fields (or only `fields`) to the graph in one write and clear them. */
  commit(type: EntityType, id: EntityId, options?: { fields?: readonly string[] }): void;
  /** Commit every entity's live fields in one graph publication. */
  commitAll(): void;
  /** Drop live fields (all, or only `fields`) without touching the graph. */
  discard(type: EntityType, id: EntityId, fields?: readonly string[]): void;
}

interface MergedCacheEntry {
  base: Record<string, unknown> | null;
  live: Record<string, unknown> | undefined;
  merged: Record<string, unknown> | null;
}

function liveKey(type: EntityType, id: EntityId): string {
  return `${type}:${id}`;
}

function without(values: Record<string, unknown>, fields: readonly string[]): Record<string, unknown> | undefined {
  const rest = { ...values };
  for (const field of fields) delete rest[field];
  return Object.keys(rest).length > 0 ? rest : undefined;
}

function pick(values: Record<string, unknown>, fields: readonly string[] | undefined): Record<string, unknown> {
  if (!fields) return values;
  const picked: Record<string, unknown> = {};
  for (const field of fields) if (Object.hasOwn(values, field)) picked[field] = values[field];
  return picked;
}

/** Create a live layer over a graph store. */
export function createLiveLayer(options: LiveLayerOptions = {}): LiveLayer {
  const store = options.store ?? graphStore;
  const values = new Map<string, { type: EntityType; id: EntityId; fields: Record<string, unknown> }>();
  const listeners = new Map<string, Set<() => void>>();
  const mergedCache = new Map<string, MergedCacheEntry>();
  /** Keys whose graph-change notifications are folded into a commit's single notification. */
  const muted = new Set<string>();

  const notify = (key: string) => {
    const set = listeners.get(key);
    if (!set) return;
    for (const listener of [...set]) listener();
  };

  const putLive = (type: EntityType, id: EntityId, fields: Record<string, unknown> | undefined) => {
    const key = liveKey(type, id);
    if (fields) values.set(key, { type, id, fields });
    else values.delete(key);
  };

  const durable = (state: GraphState, type: EntityType, id: EntityId) => state.readEntity(type, id);

  const layer: LiveLayer = {
    set(type, id, next) {
      const current = values.get(liveKey(type, id))?.fields;
      putLive(type, id, { ...current, ...next });
      notify(liveKey(type, id));
    },

    append(type, id, field, chunk) {
      const current = values.get(liveKey(type, id))?.fields;
      let prior: unknown = current && Object.hasOwn(current, field) ? current[field] : undefined;
      if (prior === undefined) prior = durable(store.getState(), type, id)?.[field];
      layer.set(type, id, { [field]: (typeof prior === "string" ? prior : "") + chunk });
    },

    get(type, id) {
      return values.get(liveKey(type, id))?.fields;
    },

    read<T>(type: EntityType, id: EntityId): T | null {
      const key = liveKey(type, id);
      const base = durable(store.getState(), type, id);
      const live = values.get(key)?.fields;
      const cached = mergedCache.get(key);
      if (cached && cached.base === base && cached.live === live) return cached.merged as T | null;
      const merged = live ? { ...(base ?? {}), ...live } : base;
      if (merged === null) mergedCache.delete(key);
      else mergedCache.set(key, { base, live, merged });
      return merged as T | null;
    },

    subscribe(type, id, listener) {
      const key = liveKey(type, id);
      let set = listeners.get(key);
      if (!set) listeners.set(key, (set = new Set()));
      set.add(listener);
      const unsubscribeGraph = store.subscribe(
        (state) => [state.entities[type]?.[id], state.patches[type]?.[id]] as const,
        () => {
          if (!muted.has(key)) listener();
        },
        { equalityFn: (a, b) => a[0] === b[0] && a[1] === b[1] },
      );
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        unsubscribeGraph();
        set.delete(listener);
        if (set.size === 0 && listeners.get(key) === set) listeners.delete(key);
      };
    },

    commit(type, id, commitOptions = {}) {
      const key = liveKey(type, id);
      const live = values.get(key)?.fields;
      if (!live) return;
      const data = pick(live, commitOptions.fields);
      muted.add(key);
      try {
        if (Object.keys(data).length > 0) store.getState().upsertEntity(type, id, data);
      } finally {
        muted.delete(key);
      }
      // Cleared only after the durable write succeeded, so a failed write loses nothing.
      putLive(type, id, commitOptions.fields ? without(live, commitOptions.fields) : undefined);
      notify(key);
    },

    commitAll() {
      const entries = [...values.entries()];
      if (entries.length === 0) return;
      for (const [key] of entries) muted.add(key);
      try {
        batchGraphWrites((batch) => {
          for (const [, entry] of entries) batch.upsertEntity(entry.type, entry.id, entry.fields);
        }, store);
      } finally {
        for (const [key] of entries) muted.delete(key);
      }
      for (const [key] of entries) values.delete(key);
      for (const [key] of entries) notify(key);
    },

    discard(type, id, fields) {
      const key = liveKey(type, id);
      const live = values.get(key)?.fields;
      if (!live) return;
      putLive(type, id, fields ? without(live, fields) : undefined);
      notify(key);
    },
  };

  return layer;
}
