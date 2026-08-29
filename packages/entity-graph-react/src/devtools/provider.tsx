import {
  createContext,
  useCallback,
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
import { observeRenderedGraphViews } from "../view/view-registration";

type ProviderStatus = "connecting" | "ready" | "disabled";
export type EntityGraphDevtoolsValuePolicyMode = "metadata-only" | "include";

interface SnapshotStore {
  getSnapshot(): GraphDevtoolsSnapshot;
  subscribe(listener: () => void): () => void;
  dispose(): void;
}

export interface EntityGraphDevtoolsStoreDefinition {
  store: GraphStore;
  label?: string;
  options?: Omit<AttachGraphDevtoolsOptions, "enabled">;
}

export interface EntityGraphDevtoolsStoreDescriptor {
  storeId: string;
  label: string;
  selected: boolean;
  valuePolicyMode: EntityGraphDevtoolsValuePolicyMode;
}

interface PreparedStoreDefinition {
  store: GraphStore;
  label: string;
  options: AttachGraphDevtoolsOptions;
}

interface AttachedRuntime {
  store: GraphStore;
  label: string;
  options: AttachGraphDevtoolsOptions;
  controller: GraphDevtoolsController;
  client: GraphDevtoolsClient;
  snapshots: SnapshotStore;
  dispose(): void;
}

interface AttachedRuntimeSet {
  definitions: readonly PreparedStoreDefinition[];
  runtimes: readonly AttachedRuntime[];
}

export interface EntityGraphDevtoolsContextValue {
  status: ProviderStatus;
  store: GraphStore;
  storeId: string | null;
  stores: readonly EntityGraphDevtoolsStoreDescriptor[];
  selectStore(storeId: string): void;
  valuePolicyMode: EntityGraphDevtoolsValuePolicyMode;
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

function prepareOptions(
  base: Omit<AttachGraphDevtoolsOptions, "enabled"> | undefined,
  override: Omit<AttachGraphDevtoolsOptions, "enabled"> | undefined,
): AttachGraphDevtoolsOptions {
  const values = override?.values ?? base?.values;
  const redact = values?.mode === "include" ? values.redact : undefined;
  return {
    enabled: true,
    storeId: override?.storeId ?? base?.storeId,
    historyLimit: override?.historyLimit ?? base?.historyLimit,
    historyBytesLimit: override?.historyBytesLimit ?? base?.historyBytesLimit,
    eventBytesLimit: override?.eventBytesLimit ?? base?.eventBytesLimit,
    snapshotLimit: override?.snapshotLimit ?? base?.snapshotLimit,
    snapshotBytesLimit: override?.snapshotBytesLimit ?? base?.snapshotBytesLimit,
    values: values?.mode === "include"
      ? { mode: "include", ...(redact ? { redact } : {}) }
      : { mode: "metadata-only" },
  };
}

function attachRuntime(definition: PreparedStoreDefinition): AttachedRuntime | null {
  const attachment = attachGraphDevtools(definition.store, definition.options);
  const controller = attachment.controller;
  if (!controller) {
    attachment.detach();
    return null;
  }
  const client = createGraphDevtoolsClient(controller.storeId, controller.connect());
  const snapshots = createSnapshotStore(controller);
  const renderedViewRegistrations = new Map<symbol, ReturnType<typeof controller.registerView>>();
  const stopObservingRenderedViews = observeRenderedGraphViews(definition.store, (event) => {
    if (event.state === "removed") {
      renderedViewRegistrations.get(event.token)?.unregister();
      renderedViewRegistrations.delete(event.token);
      return;
    }
    let registration = renderedViewRegistrations.get(event.snapshot.token);
    if (!registration) {
      registration = controller.registerView(event.snapshot.definition);
      renderedViewRegistrations.set(event.snapshot.token, registration);
    }
    registration.updateMembership(event.snapshot.entityIds);
  });
  return {
    ...definition,
    controller,
    client,
    snapshots,
    dispose() {
      stopObservingRenderedViews();
      for (const registration of renderedViewRegistrations.values()) registration.unregister();
      renderedViewRegistrations.clear();
      snapshots.dispose();
      client.disconnect();
      attachment.detach();
    },
  };
}

export interface EntityGraphDevtoolsProviderProps {
  children: ReactNode;
  store?: GraphStore;
  stores?: readonly EntityGraphDevtoolsStoreDefinition[];
  enabled?: boolean;
  options?: Omit<AttachGraphDevtoolsOptions, "enabled">;
}

/** Attach reference-counted controllers and select one explicit graph store for inspection. */
export function EntityGraphDevtoolsProvider({
  children,
  store,
  stores,
  enabled = true,
  options,
}: EntityGraphDevtoolsProviderProps) {
  const inheritedStore = useGraphStoreApi();
  const fallbackStore = store ?? inheritedStore;
  const baseOptions = useMemo(() => prepareOptions(options, undefined), [options]);
  const definitions = useMemo<readonly PreparedStoreDefinition[]>(() => {
    const supplied: readonly EntityGraphDevtoolsStoreDefinition[] = stores && stores.length > 0
      ? stores
      : [{ store: fallbackStore, label: baseOptions.storeId ?? "Default graph" }];
    const seen = new Set<GraphStore>();
    return supplied.flatMap((definition, index) => {
      if (seen.has(definition.store)) return [];
      seen.add(definition.store);
      const preparedOptions = prepareOptions(baseOptions, definition.options);
      return [{
        store: definition.store,
        label: definition.label ?? preparedOptions.storeId ?? `Graph ${index + 1}`,
        options: preparedOptions,
      }];
    });
  }, [baseOptions, fallbackStore, stores]);
  const [attached, setAttached] = useState<AttachedRuntimeSet | null>(null);
  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const runtimes = definitions.flatMap((definition) => {
      const runtime = attachRuntime(definition);
      return runtime ? [runtime] : [];
    });
    const next = { definitions, runtimes };
    setAttached(next);
    setSelectedStoreId((current) => (
      runtimes.some((runtime) => runtime.controller.storeId === current)
        ? current
        : runtimes[0]?.controller.storeId ?? null
    ));
    return () => {
      for (const runtime of runtimes) runtime.dispose();
    };
  }, [definitions, enabled]);

  const currentSet = enabled && attached?.definitions === definitions ? attached : null;
  const current = currentSet?.runtimes.find(
    (runtime) => runtime.controller.storeId === selectedStoreId,
  ) ?? currentSet?.runtimes[0] ?? null;
  const selectStore = useCallback((storeId: string) => {
    if (currentSet?.runtimes.some((runtime) => runtime.controller.storeId === storeId)) {
      setSelectedStoreId(storeId);
    }
  }, [currentSet]);
  const descriptors = useMemo<readonly EntityGraphDevtoolsStoreDescriptor[]>(() => (
    (currentSet?.runtimes ?? []).map((runtime) => ({
      storeId: runtime.controller.storeId,
      label: runtime.label,
      selected: runtime === current,
      valuePolicyMode: runtime.options.values?.mode === "include" ? "include" : "metadata-only",
    }))
  ), [current, currentSet]);
  const value = useMemo<InternalEntityGraphDevtoolsContextValue>(() => ({
    status: !enabled ? "disabled" : current ? "ready" : "connecting",
    store: current?.store ?? definitions[0]?.store ?? fallbackStore,
    storeId: current?.controller.storeId ?? null,
    stores: descriptors,
    selectStore,
    valuePolicyMode: current?.options.values?.mode === "include" ? "include" : "metadata-only",
    controller: current?.controller ?? null,
    client: current?.client ?? null,
    snapshots: current?.snapshots ?? null,
  }), [current, definitions, descriptors, enabled, fallbackStore, selectStore]);

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

/** Cached selected-controller snapshot subscription suitable for concurrent rendering and SSR. */
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
