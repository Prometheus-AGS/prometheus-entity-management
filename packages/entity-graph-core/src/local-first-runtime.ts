import { createStore } from "zustand/vanilla";
import { graphStore, type GraphStore } from "./graph";
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
    entities: ReturnType<typeof graphStore.getState>["entities"];
    patches: ReturnType<typeof graphStore.getState>["patches"];
    entityStates: ReturnType<typeof graphStore.getState>["entityStates"];
    syncMetadata: ReturnType<typeof graphStore.getState>["syncMetadata"];
    lists: ReturnType<typeof graphStore.getState>["lists"];
  };
  pendingActions: GraphActionRecord[];
}

export interface PersistGraphToStorageOptions {
  storage: GraphPersistenceAdapter;
  key: string;
  store?: GraphStore;
  pendingActions?: GraphActionRecord[];
  /**
   * The runtime whose status this write reports to. Omit for standalone calls,
   * which fall back to the process-wide status store.
   */
  scope?: RuntimeScope;
}

export interface HydrateGraphFromStorageOptions {
  storage: GraphPersistenceAdapter;
  key: string;
  store?: GraphStore;
  /**
   * The runtime that owns the pending-action set this hydrate populates.
   *
   * Without a scope, hydrate writes into the process-wide fallback set — which
   * is what made a second runtime's hydrate erase the first runtime's
   * un-settled actions. A runtime always passes its own scope.
   */
  scope?: RuntimeScope;
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
  store?: GraphStore;
  key?: string;
  replayPendingActions?: boolean;
  onlineSource?: {
    getIsOnline: () => boolean;
    subscribe: (listener: (online: boolean) => void) => () => void;
  };
  persistDebounceMs?: number;
  /** Retry-with-backoff policy for offline action replay. */
  retryPolicy?: ReplayRetryPolicy;
  /**
   * Pre-built scope for this runtime. Omit and one is created — the normal
   * case. Supply one only to share state deliberately (e.g. in a test).
   */
  scope?: RuntimeScope;
}

export interface LocalFirstGraphRuntime {
  ready: Promise<void>;
  dispose: () => void;
  persistNow: () => Promise<void>;
  hydrate: () => Promise<Awaited<ReturnType<typeof hydrateGraphFromStorage>>>;
  getStatus: () => GraphSyncStatus;
  /**
   * This runtime's own state. Read `scope.statusStore` for status isolated from
   * every other runtime in the process.
   */
  scope: RuntimeScope;
}

const DEFAULT_STORAGE_KEY = "prometheus:graph";

export const graphSyncStatusStore = createStore<{ status: GraphSyncStatus; setStatus: (status: Partial<GraphSyncStatus>) => void }>()((set) => ({
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

/**
 * Per-runtime state: the pending-action set and the status store that runtime
 * publishes to.
 *
 * Both were previously module-level singletons shared by every runtime in the
 * process. That was not merely shared state — `hydrateGraphFromStorage` clears
 * the pending set before repopulating it, so a second runtime hydrating erased
 * the first runtime's un-settled actions. On an account or practice switch that
 * is silent write loss, which is why this is scoped per runtime (ADR-009 G1).
 */
export interface RuntimeScope {
  pendingActions: Map<string, GraphActionRecord>;
  statusStore: GraphSyncStatusStore;
}

export type GraphSyncStatusStore = ReturnType<typeof createGraphSyncStatusStore>;

/** Create an independent sync-status store. Each runtime owns one. */
export function createGraphSyncStatusStore() {
  return createStore<{
    status: GraphSyncStatus;
    setStatus: (status: Partial<GraphSyncStatus>) => void;
  }>()((set) => ({
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
      set((state) => ({ status: { ...state.status, ...status } })),
  }));
}

/** Create an isolated runtime scope. */
export function createRuntimeScope(): RuntimeScope {
  return {
    pendingActions: new Map<string, GraphActionRecord>(),
    statusStore: createGraphSyncStatusStore(),
  };
}

/**
 * Process-wide fallback scope, used only by standalone calls to the exported
 * `persistGraphToStorage` / `hydrateGraphFromStorage` helpers that pass no
 * `scope`. Runtimes never use it. It also backs the legacy
 * `graphSyncStatusStore` export so existing consumers keep working.
 */
const fallbackScope: RuntimeScope = {
  pendingActions: new Map<string, GraphActionRecord>(),
  statusStore: graphSyncStatusStore,
};

/** Resolve the scope for an operation, defaulting to the process-wide one. */
function resolveScope(scope?: RuntimeScope): RuntimeScope {
  return scope ?? fallbackScope;
}

export function getGraphSyncStatus() {
  return graphSyncStatusStore.getState().status;
}

export async function persistGraphToStorage(opts: PersistGraphToStorageOptions) {
  const storeApi = opts.store ?? graphStore;
  const scope = resolveScope(opts.scope);
  const payload: GraphSnapshotPayload = {
    version: 1,
    snapshot: cloneGraphSnapshot(storeApi),
    pendingActions: opts.pendingActions ?? Array.from(scope.pendingActions.values()),
  };
  const json = JSON.stringify(payload);
  await opts.storage.set(opts.key, json);
  const persistedAt = new Date().toISOString();
  scope.statusStore.getState().setStatus({
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
  const storeApi = opts.store ?? graphStore;
  const scope = resolveScope(opts.scope);
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
    storeApi.setState(parsed.snapshot as Partial<ReturnType<typeof graphStore.getState>>);
    // Scoped: this clears only THIS runtime's pending set. Before scoping, a
    // second runtime hydrating wiped the first runtime's un-settled actions.
    scope.pendingActions.clear();
    for (const action of parsed.pendingActions ?? []) scope.pendingActions.set(action.id, action);
    const hydratedAt = new Date().toISOString();
    scope.statusStore.getState().setStatus({
      lastHydratedAt: hydratedAt,
      storageKey: opts.key,
      pendingActions: scope.pendingActions.size,
      error: null,
    });
    return {
      ok: true as const,
      key: opts.key,
      hydratedAt,
      entityCounts: Object.fromEntries(
        Object.entries(parsed.snapshot.entities).map(([type, entities]) => [type, Object.keys(entities).length]),
      ),
      pendingActions: Array.from(scope.pendingActions.values()),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    scope.statusStore.getState().setStatus({
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
  const storeApi = opts.store ?? graphStore;
  const key = opts.key ?? DEFAULT_STORAGE_KEY;
  const persistDebounceMs = opts.persistDebounceMs ?? 50;
  // This runtime's own state. Two runtimes in one process no longer share a
  // pending set, so neither can erase the other's un-settled actions (G1).
  const scope = opts.scope ?? createRuntimeScope();
  const { pendingActions } = scope;
  // Mirror status to the legacy process-wide store as well, so existing
  // consumers of `graphSyncStatusStore` / `useGraphSyncStatus` keep observing
  // a runtime's status when only one runtime exists. With several runtimes the
  // last writer wins there, which is why per-runtime status is read through
  // `runtime.getStatus()` or the scope's own store.
  const setStatus = (status: Partial<GraphSyncStatus>) => {
    scope.statusStore.getState().setStatus(status);
    if (scope.statusStore !== graphSyncStatusStore) {
      graphSyncStatusStore.getState().setStatus(status);
    }
  };
  setStatus({
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
      void persistGraphToStorage({ storage: opts.storage, key, store: storeApi, scope });
    }, persistDebounceMs);
  };

  const graphUnsub = storeApi.subscribe(() => {
    schedulePersist();
  });

  const actionUnsub = subscribeGraphActionEvents((event) => {
    if (event.type === "enqueued") pendingActions.set(event.record.id, event.record);
    if (event.type === "settled") pendingActions.delete(event.record.id);
    setStatus({
      pendingActions: pendingActions.size,
      isSynced: pendingActions.size === 0,
    });
    schedulePersist();
  });

  const onlineSource = opts.onlineSource ?? getDefaultOnlineSource();
  const onlineUnsub = onlineSource.subscribe((online) => {
    setStatus({
      isOnline: online,
      phase: online ? "ready" : "offline",
    });
  });

  const ready = (async () => {
    const hydrated = await hydrateGraphFromStorage({ storage: opts.storage, key, store: storeApi, scope });
    if (opts.replayPendingActions && hydrated.ok && pendingActions.size > 0) {
      setStatus({
        phase: "syncing",
        isSynced: false,
      });
      const policy = resolveRetryPolicy(opts.retryPolicy);
      for (const action of Array.from(pendingActions.values())) {
        await replayActionWithRetry(action, policy, storeApi);
        // Whether it succeeded or was poisoned, remove from pending — the
        // poison handler (if any) owns escalation from here.
        pendingActions.delete(action.id);
      }
      await persistGraphToStorage({ storage: opts.storage, key, store: storeApi, scope });
    }

    const online = onlineSource.getIsOnline();
    setStatus({
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
      await persistGraphToStorage({ storage: opts.storage, key, store: storeApi, scope });
    },
    hydrate() {
      return hydrateGraphFromStorage({ storage: opts.storage, key, store: storeApi, scope });
    },
    getStatus() {
      // This runtime's own status, not whichever runtime wrote last.
      return scope.statusStore.getState().status;
    },
    scope,
  };
}

function cloneGraphSnapshot(storeApi: GraphStore) {
  const state = storeApi.getState();
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
  storeApi: GraphStore = graphStore,
): Promise<{ ok: true } | { ok: false; poisoned: true; error: unknown }> {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= policy.maxAttempts; attempt++) {
    try {
      await replayRegisteredGraphAction(action, storeApi);
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
