/**
 * devtools-time-travel.ts — G4 parity: true time-travel for the entity graph.
 *
 * The Timeline tab (C5) inspected a read-only history log. This adds the
 * defining Redux-DevTools capability the gap analysis called out: **rewind the
 * LIVE graph to a prior recorded state and replay forward.**
 *
 * Model:
 * - `recordGraphSnapshot()` captures the canonical graph data (entities, patches,
 *   entityStates, syncMetadata, lists) into a bounded ring (default 50).
 * - `restoreGraphSnapshot(index)` writes a captured snapshot back into the live
 *   Zustand store — the graph (and every subscriber/view) reverts to that state.
 * - `getTimeTravelState()` exposes the ring + current cursor for the devtools UI.
 *
 * Snapshots are deep-cloned on capture and on restore so restoring never aliases
 * ring contents into the live store (a later mutation must not corrupt history).
 *
 * This is debug-time machinery: it is intended to run behind the EntityExplorer,
 * not in production data paths.
 */

import { graphStore, type GraphStore } from "./graph";

type GraphSlice = Pick<
  ReturnType<typeof graphStore.getState>,
  "entities" | "patches" | "entityStates" | "syncMetadata" | "lists"
>;

export interface TimeTravelSnapshot {
  /** Monotonic id (capture order). */
  seq: number;
  /** Capture timestamp (ms). */
  at: number;
  /** Optional label (e.g. the action that produced this state). */
  label?: string;
  data: GraphSlice;
}

export interface TimeTravelState {
  snapshots: ReadonlyArray<Omit<TimeTravelSnapshot, "data">>;
  /** Index currently restored, or null if live (at head). */
  cursor: number | null;
  capacity: number;
}

interface StoreTimeTravelState {
  capacity: number;
  ring: TimeTravelSnapshot[];
  seqCounter: number;
  cursor: number | null;
  listeners: Set<() => void>;
}

let storeStates = new WeakMap<GraphStore, StoreTimeTravelState>();

function getStoreState(storeApi: GraphStore): StoreTimeTravelState {
  let state = storeStates.get(storeApi);
  if (!state) {
    state = {
      capacity: 50,
      ring: [],
      seqCounter: 0,
      cursor: null,
      listeners: new Set(),
    };
    storeStates.set(storeApi, state);
  }
  return state;
}

function notify(state: StoreTimeTravelState): void {
  for (const listener of state.listeners) listener();
}

function cloneSlice(s: GraphSlice): GraphSlice {
  return {
    entities: structuredClone(s.entities),
    patches: structuredClone(s.patches),
    entityStates: structuredClone(s.entityStates),
    syncMetadata: structuredClone(s.syncMetadata),
    lists: structuredClone(s.lists),
  };
}

/** Configure ring capacity (number of retained snapshots). */
export function configureTimeTravel(
  opts: { capacity?: number },
  storeApi: GraphStore = graphStore,
): void {
  const state = getStoreState(storeApi);
  if (opts.capacity && opts.capacity > 0) state.capacity = opts.capacity;
  if (state.ring.length > state.capacity) state.ring = state.ring.slice(-state.capacity);
  notify(state);
}

/** Capture the current live graph state into the ring. Returns the snapshot seq. */
export function recordGraphSnapshot(label?: string, storeApi: GraphStore = graphStore): number {
  const state = getStoreState(storeApi);
  const s = storeApi.getState();
  const snap: TimeTravelSnapshot = {
    seq: state.seqCounter++,
    at: Date.now(),
    ...(label !== undefined ? { label } : {}),
    data: cloneSlice(s),
  };
  state.ring.push(snap);
  if (state.ring.length > state.capacity) state.ring = state.ring.slice(-state.capacity);
  // Recording new state means we're at the live head again.
  state.cursor = null;
  notify(state);
  return snap.seq;
}

/**
 * Restore the live graph to the snapshot at ring `index` (0-based into the
 * current ring). The Zustand store is overwritten with a deep clone of the
 * captured slice, so all subscribers re-render at that historical state.
 * Returns true if restored.
 */
export function restoreGraphSnapshot(index: number, storeApi: GraphStore = graphStore): boolean {
  const state = getStoreState(storeApi);
  const snap = state.ring[index];
  if (!snap) return false;
  const clone = cloneSlice(snap.data);
  storeApi.setState(clone as Partial<ReturnType<typeof graphStore.getState>>);
  state.cursor = index;
  notify(state);
  return true;
}

/** Restore by capture seq (stable across ring eviction within capacity). */
export function restoreGraphSnapshotBySeq(seq: number, storeApi: GraphStore = graphStore): boolean {
  const state = getStoreState(storeApi);
  const index = state.ring.findIndex((snapshot) => snapshot.seq === seq);
  return index === -1 ? false : restoreGraphSnapshot(index, storeApi);
}

/** Step the cursor by `delta` (negative = back in time) and restore. */
export function stepTimeTravel(delta: number, storeApi: GraphStore = graphStore): boolean {
  const state = getStoreState(storeApi);
  const base = state.cursor ?? state.ring.length - 1;
  const target = Math.max(0, Math.min(state.ring.length - 1, base + delta));
  return restoreGraphSnapshot(target, storeApi);
}

/** Snapshot metadata + cursor for the devtools UI (no heavy data payloads). */
export function getTimeTravelState(storeApi: GraphStore = graphStore): TimeTravelState {
  const state = getStoreState(storeApi);
  return {
    snapshots: state.ring.map(({ data: _data, ...meta }) => meta),
    cursor: state.cursor,
    capacity: state.capacity,
  };
}

/** Subscribe to ring/cursor changes (for useSyncExternalStore in the UI). */
export function subscribeTimeTravel(
  cb: () => void,
  storeApi: GraphStore = graphStore,
): () => void {
  const state = getStoreState(storeApi);
  state.listeners.add(cb);
  return () => state.listeners.delete(cb);
}

/** @internal Test-only reset. */
export function __resetTimeTravel(storeApi?: GraphStore): void {
  if (storeApi) {
    storeStates.delete(storeApi);
    return;
  }
  storeStates = new WeakMap<GraphStore, StoreTimeTravelState>();
}
