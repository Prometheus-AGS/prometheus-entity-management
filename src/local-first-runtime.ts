import { create } from "zustand";
import { useGraphStore } from "./graph";
import { replayRegisteredGraphAction, subscribeGraphActionEvents } from "./graph-actions";

export interface GraphPersistenceAdapter {
  get: (key: string) => Promise<string | null> | string | null;
  set: (key: string, value: string) => Promise<void> | void;
  remove?: (key: string) => Promise<void> | void;
}

export interface GraphActionRecord {
  id: string;
  key: string;
  input: unknown;
  enqueuedAt: string;
}

export interface GraphSyncStatus {
  phase: "idle" | "hydrating" | "syncing" | "ready" | "offline" | "error";
  isOnline: boolean;
  isSynced: boolean;
  pendingActions: number;
  lastHydratedAt: string | null;
  lastPersistedAt: string | null;
  storageKey: string | null;
  error: string | null;
}

export interface GraphSnapshotPayload {
  version: 1;
  snapshot: {
    entities: ReturnType<typeof useGraphStore.getState>["entities"];
    patches: ReturnType<typeof useGraphStore.getState>["patches"];
    entityStates: ReturnType<typeof useGraphStore.getState>["entityStates"];
    syncMetadata: ReturnType<typeof useGraphStore.getState>["syncMetadata"];
    lists: ReturnType<typeof useGraphStore.getState>["lists"];
  };
  pendingActions: GraphActionRecord[];
}

export interface PersistGraphToStorageOptions {
  storage: GraphPersistenceAdapter;
  key: string;
  pendingActions?: GraphActionRecord[];
}

export interface HydrateGraphFromStorageOptions {
  storage: GraphPersistenceAdapter;
  key: string;
}

export interface StartLocalFirstGraphOptions {
  storage: GraphPersistenceAdapter;
  key?: string;
  replayPendingActions?: boolean;
  onlineSource?: {
    getIsOnline: () => boolean;
    subscribe: (listener: (online: boolean) => void) => () => void;
  };
  persistDebounceMs?: number;
}

export interface LocalFirstGraphRuntime {
  ready: Promise<void>;
  dispose: () => void;
  persistNow: () => Promise<void>;
  hydrate: () => Promise<Awaited<ReturnType<typeof hydrateGraphFromStorage>>>;
  getStatus: () => GraphSyncStatus;
}

const DEFAULT_STORAGE_KEY = "prometheus:graph";

const useGraphSyncStatusStore = create<{ status: GraphSyncStatus; setStatus: (status: Partial<GraphSyncStatus>) => void }>((set) => ({
  status: {
    phase: "idle",
    isOnline: true,
    isSynced: true,
    pendingActions: 0,
    lastHydratedAt: null,
    lastPersistedAt: null,
    storageKey: null,
    error: null,
  },
  setStatus: (status) =>
    set((state) => ({
      status: {
        ...state.status,
        ...status,
      },
    })),
}));

const pendingActions = new Map<string, GraphActionRecord>();

export function useGraphSyncStatus() {
  return useGraphSyncStatusStore((state) => state.status);
}

export async function persistGraphToStorage(opts: PersistGraphToStorageOptions) {
  const payload: GraphSnapshotPayload = {
    version: 1,
    snapshot: cloneGraphSnapshot(),
    pendingActions: opts.pendingActions ?? Array.from(pendingActions.values()),
  };
  const json = JSON.stringify(payload);
  await opts.storage.set(opts.key, json);
  const persistedAt = new Date().toISOString();
  useGraphSyncStatusStore.getState().setStatus({
    lastPersistedAt: persistedAt,
    storageKey: opts.key,
    pendingActions: payload.pendingActions.length,
  });
  return {
    ok: true as const,
    key: opts.key,
    bytes: json.length,
    persistedAt,
  };
}

export async function hydrateGraphFromStorage(opts: HydrateGraphFromStorageOptions) {
  const raw = await opts.storage.get(opts.key);
  if (!raw) {
    return {
      ok: false as const,
      key: opts.key,
      hydratedAt: null,
      entityCounts: {},
      error: "No persisted graph snapshot found",
    };
  }

  try {
    const parsed = JSON.parse(raw) as GraphSnapshotPayload;
    useGraphStore.setState(parsed.snapshot as Partial<ReturnType<typeof useGraphStore.getState>>);
    pendingActions.clear();
    for (const action of parsed.pendingActions ?? []) pendingActions.set(action.id, action);
    const hydratedAt = new Date().toISOString();
    useGraphSyncStatusStore.getState().setStatus({
      lastHydratedAt: hydratedAt,
      storageKey: opts.key,
      pendingActions: pendingActions.size,
      error: null,
    });
    return {
      ok: true as const,
      key: opts.key,
      hydratedAt,
      entityCounts: Object.fromEntries(
        Object.entries(parsed.snapshot.entities).map(([type, entities]) => [type, Object.keys(entities).length]),
      ),
      pendingActions: Array.from(pendingActions.values()),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    useGraphSyncStatusStore.getState().setStatus({
      phase: "error",
      error: message,
      storageKey: opts.key,
    });
    return {
      ok: false as const,
      key: opts.key,
      hydratedAt: null,
      entityCounts: {},
      error: message,
    };
  }
}

export function startLocalFirstGraph(opts: StartLocalFirstGraphOptions): LocalFirstGraphRuntime {
  const key = opts.key ?? DEFAULT_STORAGE_KEY;
  const persistDebounceMs = opts.persistDebounceMs ?? 50;
  const statusStore = useGraphSyncStatusStore.getState();
  statusStore.setStatus({
    phase: "hydrating",
    storageKey: key,
    isOnline: opts.onlineSource?.getIsOnline() ?? getDefaultOnlineSource().getIsOnline(),
    isSynced: pendingActions.size === 0,
    error: null,
  });

  let persistTimer: ReturnType<typeof setTimeout> | null = null;
  const schedulePersist = () => {
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      void persistGraphToStorage({ storage: opts.storage, key });
    }, persistDebounceMs);
  };

  const graphUnsub = useGraphStore.subscribe(() => {
    schedulePersist();
  });

  const actionUnsub = subscribeGraphActionEvents((event) => {
    if (event.type === "enqueued") pendingActions.set(event.record.id, event.record);
    if (event.type === "settled") pendingActions.delete(event.record.id);
    useGraphSyncStatusStore.getState().setStatus({
      pendingActions: pendingActions.size,
      isSynced: pendingActions.size === 0,
    });
    schedulePersist();
  });

  const onlineSource = opts.onlineSource ?? getDefaultOnlineSource();
  const onlineUnsub = onlineSource.subscribe((online) => {
    useGraphSyncStatusStore.getState().setStatus({
      isOnline: online,
      phase: online ? "ready" : "offline",
    });
  });

  const ready = (async () => {
    const hydrated = await hydrateGraphFromStorage({ storage: opts.storage, key });
    if (opts.replayPendingActions && hydrated.ok && pendingActions.size > 0) {
      useGraphSyncStatusStore.getState().setStatus({
        phase: "syncing",
        isSynced: false,
      });
      for (const action of Array.from(pendingActions.values())) {
        await replayRegisteredGraphAction(action);
        pendingActions.delete(action.id);
      }
      await persistGraphToStorage({ storage: opts.storage, key });
    }

    const online = onlineSource.getIsOnline();
    useGraphSyncStatusStore.getState().setStatus({
      phase: online ? "ready" : "offline",
      isOnline: online,
      isSynced: pendingActions.size === 0,
      pendingActions: pendingActions.size,
    });
  })();

  return {
    ready,
    dispose() {
      graphUnsub();
      actionUnsub();
      onlineUnsub();
      if (persistTimer) clearTimeout(persistTimer);
    },
    async persistNow() {
      await persistGraphToStorage({ storage: opts.storage, key });
    },
    hydrate() {
      return hydrateGraphFromStorage({ storage: opts.storage, key });
    },
    getStatus() {
      return useGraphSyncStatusStore.getState().status;
    },
  };
}

function cloneGraphSnapshot() {
  const state = useGraphStore.getState();
  return {
    entities: structuredClone(state.entities),
    patches: structuredClone(state.patches),
    entityStates: structuredClone(state.entityStates),
    syncMetadata: structuredClone(state.syncMetadata),
    lists: structuredClone(state.lists),
  };
}

function getDefaultOnlineSource() {
  if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
    return {
      getIsOnline: () => window.navigator.onLine,
      subscribe: (listener: (online: boolean) => void) => {
        const onlineHandler = () => listener(true);
        const offlineHandler = () => listener(false);
        window.addEventListener("online", onlineHandler);
        window.addEventListener("offline", offlineHandler);
        return () => {
          window.removeEventListener("online", onlineHandler);
          window.removeEventListener("offline", offlineHandler);
        };
      },
    };
  }

  return {
    getIsOnline: () => true,
    subscribe: () => () => {},
  };
}
