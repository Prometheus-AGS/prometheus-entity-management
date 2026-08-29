import type { GraphStore } from "./graph";

export interface LegacyTimeTravelSnapshotMetadata {
  seq: number;
  at: number;
  label?: string;
}

export interface LegacyTimeTravelState {
  snapshots: ReadonlyArray<LegacyTimeTravelSnapshotMetadata>;
  cursor: number | null;
  capacity: number;
}

/**
 * Thin root-safe facade supplied by an attached optional DevTools controller.
 * It owns no graph data, cursor, or snapshot history.
 */
export interface GraphDevtoolsCompatibilityDelegate {
  configure(capacity: number): void;
  capture(label?: string): number;
  restoreByIndex(index: number): boolean;
  restoreByCursor(cursor: number): boolean;
  step(delta: number): boolean;
  getState(): LegacyTimeTravelState;
  subscribe(listener: () => void): () => void;
  clear(): void;
}

interface CompatibilityEntry {
  delegate: GraphDevtoolsCompatibilityDelegate | null;
  listeners: Set<() => void>;
  unsubscribeDelegate: (() => void) | null;
  compatibilityDetach: (() => void) | null;
}

interface CompatibilityBridgeState {
  version: 1;
  entries: WeakMap<GraphStore, CompatibilityEntry>;
  factory: ((store: GraphStore) => () => void) | null;
}

const BRIDGE_KEY = Symbol.for("prometheus.entity-graph.devtools.compatibility.v1");
const bridgeHost = globalThis as typeof globalThis & { [key: symbol]: unknown };
const existingBridge = bridgeHost[BRIDGE_KEY] as CompatibilityBridgeState | undefined;
const bridgeState: CompatibilityBridgeState = existingBridge?.version === 1
  ? existingBridge
  : { version: 1, entries: new WeakMap(), factory: null };
bridgeHost[BRIDGE_KEY] = bridgeState;

function getOrCreateEntry(store: GraphStore): CompatibilityEntry {
  let entry = bridgeState.entries.get(store);
  if (!entry) {
    entry = {
      delegate: null,
      listeners: new Set(),
      unsubscribeDelegate: null,
      compatibilityDetach: null,
    };
    bridgeState.entries.set(store, entry);
  }
  return entry;
}

function ensureDelegate(store: GraphStore, entry: CompatibilityEntry): void {
  const factory = bridgeState.factory;
  if (entry.delegate || entry.compatibilityDetach || !factory) return;
  entry.compatibilityDetach = factory(store);
}

/** Registered only when the explicit optional DevTools module is loaded. */
export function registerGraphDevtoolsCompatibilityFactory(
  factory: (store: GraphStore) => () => void,
): void {
  bridgeState.factory = factory;
}

function notify(entry: CompatibilityEntry): void {
  for (const listener of [...entry.listeners]) {
    try {
      listener();
    } catch {
      // Deprecated tooling listeners never interrupt the graph or controller.
    }
  }
}

export function registerGraphDevtoolsCompatibilityDelegate(
  store: GraphStore,
  delegate: GraphDevtoolsCompatibilityDelegate,
): () => void {
  const entry = getOrCreateEntry(store);
  entry.unsubscribeDelegate?.();
  entry.delegate = delegate;
  entry.unsubscribeDelegate = delegate.subscribe(() => notify(entry));
  notify(entry);

  let unregistered = false;
  return () => {
    if (unregistered || entry.delegate !== delegate) return;
    unregistered = true;
    entry.unsubscribeDelegate?.();
    entry.unsubscribeDelegate = null;
    entry.delegate = null;
    notify(entry);
    if (entry.listeners.size === 0) bridgeState.entries.delete(store);
  };
}

export function getGraphDevtoolsCompatibilityDelegate(
  store: GraphStore,
): GraphDevtoolsCompatibilityDelegate | null {
  const entry = getOrCreateEntry(store);
  ensureDelegate(store, entry);
  return entry.delegate;
}

export function peekGraphDevtoolsCompatibilityDelegate(
  store: GraphStore,
): GraphDevtoolsCompatibilityDelegate | null {
  return bridgeState.entries.get(store)?.delegate ?? null;
}

export function subscribeGraphDevtoolsCompatibility(
  store: GraphStore,
  listener: () => void,
): () => void {
  const entry = getOrCreateEntry(store);
  entry.listeners.add(listener);
  ensureDelegate(store, entry);
  return () => {
    entry.listeners.delete(listener);
    if (entry.listeners.size === 0 && entry.delegate === null) bridgeState.entries.delete(store);
  };
}

export function resetGraphDevtoolsCompatibility(store?: GraphStore): void {
  if (store) {
    const entry = bridgeState.entries.get(store);
    entry?.delegate?.clear();
    if (entry?.compatibilityDetach) {
      const detach = entry.compatibilityDetach;
      entry.compatibilityDetach = null;
      detach();
    }
    if (entry && entry.delegate === null && entry.listeners.size === 0) bridgeState.entries.delete(store);
    return;
  }
  bridgeState.entries = new WeakMap<GraphStore, CompatibilityEntry>();
}
