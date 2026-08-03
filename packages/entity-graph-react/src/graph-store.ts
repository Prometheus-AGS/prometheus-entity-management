import { useStore } from "zustand";
import {
  createGraphStore,
  graphStore,
  graphSyncStatusStore,
} from "@prometheus-ags/entity-graph-core";
import type {
  GraphState,
  GraphStore,
  GraphSyncStatus,
} from "@prometheus-ags/entity-graph-core";

type BoundGraphStore = {
  (): GraphState;
  <T>(selector: (state: GraphState) => T): T;
} & GraphStore;

const identity = (state: GraphState) => state;

/**
 * React binding for the default vanilla graph store.
 *
 * Components should normally use the domain hooks exported by this package.
 * The attached StoreApi methods preserve the established imperative API for
 * adapters, tests, and migration code.
 */
const useBoundGraphStore = <T = GraphState>(
  selector: (state: GraphState) => T = identity as (state: GraphState) => T,
) => useStore(graphStore, selector);

export const useGraphStore = Object.assign(
  useBoundGraphStore,
  graphStore,
) as BoundGraphStore;

/** React subscription hook for the framework-neutral sync status store. */
export function useGraphSyncStatus(): GraphSyncStatus {
  return useStore(graphSyncStatusStore, (state) => state.status);
}

export { createGraphStore, graphStore, graphSyncStatusStore };
export type { GraphStore };
