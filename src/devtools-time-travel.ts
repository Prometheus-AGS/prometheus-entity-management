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

import { useGraphStore } from "./graph";

type GraphSlice = Pick<
  ReturnType<typeof useGraphStore.getState>,
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

let capacity = 50;
let ring: TimeTravelSnapshot[] = [];
let seqCounter = 0;
let cursor: number | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) l();
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
export function configureTimeTravel(opts: { capacity?: number }): void {
  if (opts.capacity && opts.capacity > 0) capacity = opts.capacity;
  if (ring.length > capacity) ring = ring.slice(-capacity);
  notify();
}

/** Capture the current live graph state into the ring. Returns the snapshot seq. */
export function recordGraphSnapshot(label?: string): number {
  const s = useGraphStore.getState();
  const snap: TimeTravelSnapshot = {
    seq: seqCounter++,
    at: Date.now(),
    ...(label !== undefined ? { label } : {}),
    data: cloneSlice(s),
  };
  ring.push(snap);
  if (ring.length > capacity) ring = ring.slice(-capacity);
  // Recording new state means we're at the live head again.
  cursor = null;
  notify();
  return snap.seq;
}

/**
 * Restore the live graph to the snapshot at ring `index` (0-based into the
 * current ring). The Zustand store is overwritten with a deep clone of the
 * captured slice, so all subscribers re-render at that historical state.
 * Returns true if restored.
 */
export function restoreGraphSnapshot(index: number): boolean {
  const snap = ring[index];
  if (!snap) return false;
  const clone = cloneSlice(snap.data);
  useGraphStore.setState(clone as Partial<ReturnType<typeof useGraphStore.getState>>);
  cursor = index;
  notify();
  return true;
}

/** Restore by capture seq (stable across ring eviction within capacity). */
export function restoreGraphSnapshotBySeq(seq: number): boolean {
  const index = ring.findIndex((s) => s.seq === seq);
  return index === -1 ? false : restoreGraphSnapshot(index);
}

/** Step the cursor by `delta` (negative = back in time) and restore. */
export function stepTimeTravel(delta: number): boolean {
  const base = cursor ?? ring.length - 1;
  const target = Math.max(0, Math.min(ring.length - 1, base + delta));
  return restoreGraphSnapshot(target);
}

/** Snapshot metadata + cursor for the devtools UI (no heavy data payloads). */
export function getTimeTravelState(): TimeTravelState {
  return {
    snapshots: ring.map(({ data: _data, ...meta }) => meta),
    cursor,
    capacity,
  };
}

/** Subscribe to ring/cursor changes (for useSyncExternalStore in the UI). */
export function subscribeTimeTravel(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** @internal Test-only reset. */
export function __resetTimeTravel(): void {
  ring = [];
  seqCounter = 0;
  cursor = null;
  capacity = 50;
}
