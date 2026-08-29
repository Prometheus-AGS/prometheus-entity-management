import { createContext, createElement, useContext, useEffect, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createGraphStore,
  graphStore,
  graphSyncStatusStore,
  attachGlobalListeners,
} from "@prometheus-ags/entity-graph-core";
import type {
  GraphState,
  GraphStore,
  GraphSyncStatus,
} from "@prometheus-ags/entity-graph-core";

type BoundGraphStore = {
  (): GraphState;
  <T>(selector: (state: GraphState) => T): T;
  /** @deprecated Always reads the default singleton. Use `useGraphStoreApi()` in React. */
  getState: GraphStore["getState"];
  /** @deprecated Always writes the default singleton. Use `useGraphStoreApi()` in React. */
  setState: GraphStore["setState"];
  /** @deprecated Always subscribes to the default singleton. Inject a `GraphStore` outside React. */
  subscribe: GraphStore["subscribe"];
  /** @deprecated Always reads the default singleton. Inject a `GraphStore` outside React. */
  getInitialState: GraphStore["getInitialState"];
};

type SingletonMethod = "getState" | "setState" | "subscribe" | "getInitialState";

declare const process: { env: { NODE_ENV?: string } } | undefined;

const warnedSingletonMethods = new Set<SingletonMethod>();

function warnSingletonMethod(method: SingletonMethod): void {
  if (
    (typeof process === "undefined" || process.env.NODE_ENV !== "production") &&
    !warnedSingletonMethods.has(method)
  ) {
    warnedSingletonMethods.add(method);
    console.warn(
      `[prometheus-entity-management] useGraphStore.${method}() always targets the default singleton, even below GraphStoreProvider. Capture useGraphStoreApi() in React callbacks or inject an explicit GraphStore outside React.`,
    );
  }
}

function singletonDelegate<K extends SingletonMethod>(method: K): GraphStore[K] {
  const target = graphStore[method] as (...args: never[]) => unknown;
  const delegate = (...args: unknown[]) => {
    warnSingletonMethod(method);
    return Reflect.apply(target, graphStore, args);
  };
  return delegate as unknown as GraphStore[K];
}

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
  const store = useContext(GraphStoreContext) ?? graphStore;
  useEffect(() => attachGlobalListeners(store), [store]);
  return store;
}

/**
 * React binding for the default vanilla graph store.
 *
 * Components should normally use the domain hooks exported by this package.
 * The deprecated attached StoreApi methods preserve the 3.x imperative API,
 * but always target the default singleton. Capture `useGraphStoreApi()` in a
 * React component before using imperative methods in effects or callbacks.
 */
const useBoundGraphStore = <T = GraphState>(
  selector: (state: GraphState) => T = identity as (state: GraphState) => T,
) => useStore(useGraphStoreApi(), selector);

export const useGraphStore = Object.assign(
  useBoundGraphStore,
  {
    getState: singletonDelegate("getState"),
    setState: singletonDelegate("setState"),
    subscribe: singletonDelegate("subscribe"),
    getInitialState: singletonDelegate("getInitialState"),
  },
) as BoundGraphStore;

/** React subscription hook for the framework-neutral sync status store. */
export function useGraphSyncStatus(): GraphSyncStatus {
  return useStore(graphSyncStatusStore, (state) => state.status);
}

export { createGraphStore, graphStore, graphSyncStatusStore };
export type { GraphStore };
