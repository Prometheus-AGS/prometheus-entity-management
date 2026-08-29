/**
 * Deprecated root time-travel compatibility facade.
 *
 * Snapshot data, cursors, retention, rewind state, and listeners are owned by
 * the optional per-store DevTools controller. This root module imports only a
 * lightweight delegate bridge, so normal package imports do not pull the
 * optional controller/protocol implementation into the root bundle.
 */

import {
  getGraphDevtoolsCompatibilityDelegate,
  resetGraphDevtoolsCompatibility,
  subscribeGraphDevtoolsCompatibility,
} from "./devtools-compatibility-bridge";
import { graphStore, type GraphStore } from "./graph";

type GraphSlice = Pick<
  ReturnType<typeof graphStore.getState>,
  "entities" | "patches" | "entityStates" | "syncMetadata" | "lists"
>;

export interface TimeTravelSnapshot {
  /** Monotonic controller cursor for the captured state. */
  seq: number;
  /** Capture timestamp (ms). */
  at: number;
  /** Optional compatibility label. */
  label?: string;
  /** Snapshot payloads are controller-private and no longer exposed at root. */
  data: GraphSlice;
}

export interface TimeTravelState {
  snapshots: ReadonlyArray<Omit<TimeTravelSnapshot, "data">>;
  /** Compatibility ring index currently restored, or null when live. */
  cursor: number | null;
  capacity: number;
}

/** @deprecated Attach `@prometheus-ags/entity-graph-core/devtools` and configure its controller. */
export function configureTimeTravel(
  opts: { capacity?: number },
  storeApi: GraphStore = graphStore,
): void {
  if (opts.capacity && opts.capacity > 0) {
    getGraphDevtoolsCompatibilityDelegate(storeApi)?.configure(opts.capacity);
  }
}

/**
 * @deprecated Use the attached controller's automatic snapshot history.
 * Returns `-1` when the optional controller is not attached to `storeApi`.
 */
export function recordGraphSnapshot(label?: string, storeApi: GraphStore = graphStore): number {
  return getGraphDevtoolsCompatibilityDelegate(storeApi)?.capture(label) ?? -1;
}

/** @deprecated Use `controller.rewind(cursor)` from the explicit `./devtools` entry. */
export function restoreGraphSnapshot(index: number, storeApi: GraphStore = graphStore): boolean {
  return getGraphDevtoolsCompatibilityDelegate(storeApi)?.restoreByIndex(index) ?? false;
}

/** @deprecated Use `controller.rewind(cursor)` from the explicit `./devtools` entry. */
export function restoreGraphSnapshotBySeq(seq: number, storeApi: GraphStore = graphStore): boolean {
  return getGraphDevtoolsCompatibilityDelegate(storeApi)?.restoreByCursor(seq) ?? false;
}

/** @deprecated Resolve retained cursors through the explicit per-store controller. */
export function stepTimeTravel(delta: number, storeApi: GraphStore = graphStore): boolean {
  return getGraphDevtoolsCompatibilityDelegate(storeApi)?.step(delta) ?? false;
}

/** @deprecated Use `controller.getSnapshotHistoryStatus()` and controller events. */
export function getTimeTravelState(storeApi: GraphStore = graphStore): TimeTravelState {
  return getGraphDevtoolsCompatibilityDelegate(storeApi)?.getState() ?? {
    snapshots: [],
    cursor: null,
    capacity: 50,
  };
}

/** @deprecated Subscribe to the explicit per-store controller. */
export function subscribeTimeTravel(
  cb: () => void,
  storeApi: GraphStore = graphStore,
): () => void {
  return subscribeGraphDevtoolsCompatibility(storeApi, cb);
}

/** @internal Test-only bridge reset. It owns no snapshot data. */
export function __resetTimeTravel(storeApi?: GraphStore): void {
  const target = storeApi ?? graphStore;
  resetGraphDevtoolsCompatibility(target);
}
