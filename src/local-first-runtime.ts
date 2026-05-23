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

/**
 * Retry-with-backoff policy for replaying pending offline actions.
 *
 * The replay loop tracks per-action attempt counts. After `maxAttempts`
 * failed attempts the action is considered "poisoned" — it is removed from
 * the in-memory pending queue (so it won't block other actions) and the
 * optional `poisonHandler` is invoked. Consumers typically log the action,
 * surface a UI prompt, or persist it to a dead-letter store.
 *
 * Defaults: 5 attempts, starting at 500ms, doubling up to 30s, with
 * "equal" jitter (random in `[delay/2, delay]`).
 */
export interface ReplayRetryPolicy {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffFactor?: number;
  jitter?: "full" | "equal" | "none";
  poisonHandler?: (action: GraphActionRecord, error: unknown) => void | Promise<void>;
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
  /** Retry-with-backoff policy for offline action replay. */
  retryPolicy?: ReplayRetryPolicy;
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
      const policy = resolveRetryPolicy(opts.retryPolicy);
      for (const action of Array.from(pendingActions.values())) {
        await replayActionWithRetry(action, policy);
        // Whether it succeeded or was poisoned, remove from pending — the
        // poison handler (if any) owns escalation from here.
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

interface ResolvedRetryPolicy {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffFactor: number;
  jitter: "full" | "equal" | "none";
  poisonHandler?: (action: GraphActionRecord, error: unknown) => void | Promise<void>;
}

function resolveRetryPolicy(policy?: ReplayRetryPolicy): ResolvedRetryPolicy {
  return {
    maxAttempts: policy?.maxAttempts ?? 5,
    initialDelayMs: policy?.initialDelayMs ?? 500,
    maxDelayMs: policy?.maxDelayMs ?? 30_000,
    backoffFactor: policy?.backoffFactor ?? 2,
    jitter: policy?.jitter ?? "equal",
    poisonHandler: policy?.poisonHandler,
  };
}

function computeDelay(policy: ResolvedRetryPolicy, attempt: number): number {
  const base = Math.min(
    policy.initialDelayMs * Math.pow(policy.backoffFactor, Math.max(0, attempt - 1)),
    policy.maxDelayMs,
  );
  switch (policy.jitter) {
    case "none":
      return base;
    case "full":
      return Math.random() * base;
    case "equal":
    default:
      return base / 2 + Math.random() * (base / 2);
  }
}

/** Internal — sleep helper that respects test environments. */
function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Attempt to replay an action up to `maxAttempts` times. On exhaustion the
 * action goes to "poison" — the optional handler is invoked and the function
 * resolves. Exposed for unit testing.
 */
export async function replayActionWithRetry(
  action: GraphActionRecord,
  policy: ResolvedRetryPolicy,
): Promise<{ ok: true } | { ok: false; poisoned: true; error: unknown }> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      await replayRegisteredGraphAction(action);
      return { ok: true };
    } catch (error) {
      lastError = error;
      if (attempt >= policy.maxAttempts) break;
      await sleep(computeDelay(policy, attempt));
    }
  }
  try {
    await policy.poisonHandler?.(action, lastError);
  } catch {
    /* swallow handler failures — they must not block the queue */
  }
  return { ok: false, poisoned: true, error: lastError };
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
