import { createContext, createElement, useContext, useEffect, useRef, type ReactNode } from "react";
import { useStore } from "zustand";
import {
  createGraphStore,
  graphStore,
  graphSyncStatusStore,
  attachGlobalListeners,
  resolveActiveGraphStore,
  setActiveGraphStore,
} from "@prometheus-ags/entity-graph-core";
import type {
  GraphState,
  GraphStore,
  GraphSyncStatus,
} from "@prometheus-ags/entity-graph-core";

type BoundGraphStore = {
  (): GraphState;
  <T>(selector: (state: GraphState) => T): T;
  /** Reads the active graph: request scope, else provider-mounted store, else singleton. */
  getState: GraphStore["getState"];
  /** Writes the active graph: request scope, else provider-mounted store, else singleton. */
  setState: GraphStore["setState"];
  /** Subscribes to the active graph. */
  subscribe: GraphStore["subscribe"];
  /** Reads the active graph's initial state. */
  getInitialState: GraphStore["getInitialState"];
};

/**
 * The imperative surface resolves the ACTIVE graph on every call.
 *
 * Previously these were copied off the singleton with `Object.assign`, so a
 * mounted `GraphStoreProvider` could not redirect them and imperative callers
 * silently wrote to process-global state (issue #42). 3.0.4 replaced the copies
 * with delegates that warned but still targeted the singleton; this resolves
 * per call instead, so store actions, module helpers and mutation callbacks
 * honour the provider without being rewritten as hooks.
 *
 * Resolution order is owned by core: request scope (`runWithGraphStore`) →
 * module-level active store (set by the provider) → package singleton. With no
 * provider and no request scope this is exactly the old behaviour.
 */
function activeStore(): GraphStore {
  return resolveActiveGraphStore(graphStore);
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
  // Publish the store for IMPERATIVE callers too (Zustand actions, module
  // helpers, mutation callbacks) — they have no context to read. Set during
  // render rather than in an effect so imperative writes fired by children on
  // their first commit already resolve to this store; the effect only handles
  // restoration on unmount.
  //
  // On the server this is per-module, not per-request: an SSR host must wrap
  // each request in `runWithGraphStore(store, …)`, which takes precedence.
  const restoreRef = useRef<(() => void) | null>(null);
  if (restoreRef.current === null) {
    restoreRef.current = setActiveGraphStore(store);
  }
  useEffect(() => {
    const restore = restoreRef.current ?? setActiveGraphStore(store);
    restoreRef.current = null;
    return () => {
      restore();
    };
  }, [store]);

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

export const useGraphStore = new Proxy(useBoundGraphStore, {
  get(target, prop, receiver) {
    // Function's own properties (name, length, call, apply…) stay on the hook.
    if (Reflect.has(target, prop)) return Reflect.get(target, prop, receiver);
    const store = activeStore();
    const value = (store as unknown as Record<PropertyKey, unknown>)[prop];
    // Bind so `this` is the resolved store, not the Proxy.
    return typeof value === "function" ? value.bind(store) : value;
  },
  has(target, prop) {
    return Reflect.has(target, prop) || prop in activeStore();
  },
}) as unknown as BoundGraphStore;

/** React subscription hook for the framework-neutral sync status store. */
export function useGraphSyncStatus(): GraphSyncStatus {
  return useStore(graphSyncStatusStore, (state) => state.status);
}

export { createGraphStore, graphStore, graphSyncStatusStore };
export type { GraphStore };
