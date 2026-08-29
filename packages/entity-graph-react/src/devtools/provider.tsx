import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import {
  attachGraphDevtools,
  createGraphDevtoolsClient,
  type AttachGraphDevtoolsOptions,
  type GraphDevtoolsClient,
  type GraphDevtoolsController,
  type GraphDevtoolsSnapshot,
} from "@prometheus-ags/entity-graph-core/devtools";
import { useGraphStoreApi } from "../graph-store";

type ProviderStatus = "connecting" | "ready" | "disabled";

interface SnapshotStore {
  getSnapshot(): GraphDevtoolsSnapshot;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

interface AttachedRuntime {
  store: GraphStore;
  options: AttachGraphDevtoolsOptions;
  controller: GraphDevtoolsController;
  client: GraphDevtoolsClient;
  snapshots: SnapshotStore;
  dispose(): void;
}

export interface EntityGraphDevtoolsContextValue {
  status: ProviderStatus;
  store: GraphStore;
  storeId: string | null;
  controller: GraphDevtoolsController | null;
  client: GraphDevtoolsClient | null;
}

interface InternalEntityGraphDevtoolsContextValue extends EntityGraphDevtoolsContextValue {
  snapshots: SnapshotStore | null;
}

const EntityGraphDevtoolsContext = createContext<InternalEntityGraphDevtoolsContextValue | null>(null);
const EMPTY_SERVER_SNAPSHOT: GraphDevtoolsSnapshot | null = null;
const subscribeToNothing = () => () => {};
const getNoSnapshot = () => EMPTY_SERVER_SNAPSHOT;

function createSnapshotStore(controller: GraphDevtoolsController): SnapshotStore {
  let snapshot = controller.getSnapshot();
  const listeners = new Set<() => void>();
  const unsubscribe = controller.subscribe(() => {
    snapshot = controller.getSnapshot();
    for (const listener of listeners) listener();
  });

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    dispose() {
      unsubscribe();
      listeners.clear();
    },
  };
}

export interface EntityGraphDevtoolsProviderProps {
  children: ReactNode;
  store?: GraphStore;
  enabled?: boolean;
  options?: Omit<AttachGraphDevtoolsOptions, "enabled">;
}

/** Attach one reference-counted core controller to the selected graph store. */
export function EntityGraphDevtoolsProvider({
  children,
  store,
  enabled = true,
  options,
}: EntityGraphDevtoolsProviderProps) {
  const inheritedStore = useGraphStoreApi();
  const selectedStore = store ?? inheritedStore;
  const valueMode = options?.values?.mode ?? "metadata-only";
  const redact = options?.values?.mode === "include" ? options.values.redact : undefined;
  const attachOptions = useMemo<AttachGraphDevtoolsOptions>(() => ({
    enabled: true,
    storeId: options?.storeId,
    historyLimit: options?.historyLimit,
    historyBytesLimit: options?.historyBytesLimit,
    eventBytesLimit: options?.eventBytesLimit,
    snapshotLimit: options?.snapshotLimit,
    snapshotBytesLimit: options?.snapshotBytesLimit,
    values: valueMode === "include"
      ? { mode: "include", ...(redact ? { redact } : {}) }
      : { mode: "metadata-only" },
  }), [
    options?.storeId,
    options?.historyLimit,
    options?.historyBytesLimit,
    options?.eventBytesLimit,
    options?.snapshotLimit,
    options?.snapshotBytesLimit,
    redact,
    valueMode,
  ]);
  const [attached, setAttached] = useState<AttachedRuntime | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const attachment = attachGraphDevtools(selectedStore, attachOptions);
    const controller = attachment.controller;
    if (!controller) return attachment.detach;

    const client = createGraphDevtoolsClient(controller.storeId, controller.connect());
    const snapshots = createSnapshotStore(controller);
    const runtime: AttachedRuntime = {
      store: selectedStore,
      options: attachOptions,
      controller,
      client,
      snapshots,
      dispose() {
        snapshots.dispose();
        client.disconnect();
        attachment.detach();
      },
    };
    setAttached(runtime);
    return runtime.dispose;
  }, [attachOptions, enabled, selectedStore]);

  const current = enabled && attached?.store === selectedStore && attached.options === attachOptions
    ? attached
    : null;
  const value = useMemo<InternalEntityGraphDevtoolsContextValue>(() => ({
    status: !enabled ? "disabled" : current ? "ready" : "connecting",
    store: selectedStore,
    storeId: current?.controller.storeId ?? null,
    controller: current?.controller ?? null,
    client: current?.client ?? null,
    snapshots: current?.snapshots ?? null,
  }), [current, enabled, selectedStore]);

  return (
    <EntityGraphDevtoolsContext.Provider value={value}>
      {children}
    </EntityGraphDevtoolsContext.Provider>
  );
}

/** Resolve the selected store-scoped DevTools controller and protocol client. */
export function useEntityGraphDevtools(): EntityGraphDevtoolsContextValue {
  const value = useContext(EntityGraphDevtoolsContext);
  if (!value) {
    throw new Error("useEntityGraphDevtools must be used inside EntityGraphDevtoolsProvider");
  }
  return value;
}

/** Cached controller snapshot subscription suitable for React concurrent rendering and SSR. */
export function useEntityGraphDevtoolsSnapshot(): GraphDevtoolsSnapshot | null {
  const value = useContext(EntityGraphDevtoolsContext);
  if (!value) {
    throw new Error("useEntityGraphDevtoolsSnapshot must be used inside EntityGraphDevtoolsProvider");
  }
  const snapshotStore = value.snapshots;

  return useSyncExternalStore(
    snapshotStore?.subscribe ?? subscribeToNothing,
    snapshotStore?.getSnapshot ?? getNoSnapshot,
    getNoSnapshot,
  );
}
