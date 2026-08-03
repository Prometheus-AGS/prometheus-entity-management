import { createContext, createElement, useContext, type ReactNode } from "react";
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

const GraphStoreContext = createContext<GraphStore | null>(null);

export interface GraphStoreProviderProps {
  store: GraphStore;
  children: ReactNode;
}

/**
 * Scope React graph hooks to an application-owned store.
 *
 * The default remains the package singleton. Next.js and other SSR hosts use
 * this provider to keep concurrent request renders isolated while hydrating
 * one browser-owned graph for the mounted application tree.
 */
export function GraphStoreProvider({ store, children }: GraphStoreProviderProps) {
  return createElement(GraphStoreContext.Provider, { value: store }, children);
}

/** Resolve the nearest scoped graph, falling back to the public singleton. */
export function useGraphStoreApi(): GraphStore {
  return useContext(GraphStoreContext) ?? graphStore;
}

/**
 * React binding for the default vanilla graph store.
 *
 * Components should normally use the domain hooks exported by this package.
 * The attached StoreApi methods preserve the established imperative API for
 * adapters, tests, and migration code.
 */
const useBoundGraphStore = <T = GraphState>(
  selector: (state: GraphState) => T = identity as (state: GraphState) => T,
) => useStore(useGraphStoreApi(), selector);

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
