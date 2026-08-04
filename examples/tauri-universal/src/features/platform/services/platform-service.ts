import {
  createTauriSqlPersistenceAdapter,
  graphStore,
  startLocalFirstGraph,
  type GraphPersistenceAdapter,
  type LocalFirstGraphRuntime,
} from "@prometheus-ags/entity-graph-core";
import {
  createTauriGraphPlugin,
  type TauriGraphPlugin,
} from "@prometheus-ags/entity-graph-tauri";
import { SEED_PROJECTS, SEED_TASKS, SEED_USERS } from "@/features/tasks/seed";
import {
  ENTITY_TYPES,
  TASK_LIST_KEY,
  TASK_STATUSES,
  type TaskEntity,
  type TaskStatus,
} from "@/features/tasks/types";
import type {
  ConnectionMode,
  LifecycleSignal,
  PlatformService,
  PlatformServiceCallbacks,
  PlatformSnapshot,
  RuntimePlatform,
} from "../types";

const GRAPH_STORAGE_KEY = "prometheus:tauri-universal:graph:v1";
const QUEUE_STORAGE_KEY = "prometheus:tauri-universal:queue:v1";
const DEEP_LINK_TENANT = "prometheus-labs";

export function parseTaskDeepLink(
  sourceUrl: string,
  knownTaskIds: ReadonlySet<string>,
): string | null {
  try {
    const parsed = new URL(sourceUrl);
    const taskId = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    const isAllowed =
      parsed.protocol === "prometheus-entity:" &&
      parsed.hostname === "task" &&
      parsed.searchParams.get("tenant") === DEEP_LINK_TENANT &&
      knownTaskIds.has(taskId);
    return isAllowed ? taskId : null;
  } catch {
    return null;
  }
}

interface QueuedTaskMutation {
  id: string;
  taskId: string;
  status: TaskStatus;
  enqueuedAt: string;
}

interface OnlineSource {
  getIsOnline(): boolean;
  subscribe(listener: (online: boolean) => void): () => void;
  setMode(mode: ConnectionMode): void;
  dispose(): void;
}

function createOnlineSource(): OnlineSource {
  let forcedOffline = false;
  const listeners = new Set<(online: boolean) => void>();
  const getIsOnline = () => !forcedOffline && window.navigator.onLine;
  const publish = () => listeners.forEach((listener) => listener(getIsOnline()));
  const onOnline = () => publish();
  const onOffline = () => publish();
  window.addEventListener("online", onOnline);
  window.addEventListener("offline", onOffline);

  return {
    getIsOnline,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    setMode(mode) {
      forcedOffline = mode === "offline";
      publish();
    },
    dispose() {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      listeners.clear();
    },
  };
}

function createBrowserStorage(): GraphPersistenceAdapter {
  return {
    get: (key) => window.localStorage.getItem(key),
    set: (key, value) => window.localStorage.setItem(key, value),
    remove: (key) => window.localStorage.removeItem(key),
  };
}

function isQueuedTaskMutation(value: unknown): value is QueuedTaskMutation {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<QueuedTaskMutation>;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.taskId === "string" &&
    typeof candidate.enqueuedAt === "string" &&
    typeof candidate.status === "string" &&
    TASK_STATUSES.includes(candidate.status as TaskStatus)
  );
}

function parseQueue(raw: string | null): QueuedTaskMutation[] {
  if (!raw) return [];
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value) || !value.every(isQueuedTaskMutation)) {
    throw new Error("The persisted task queue does not match the universal example contract.");
  }
  return value;
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

class UniversalPlatformService implements PlatformService {
  private readonly callbacks: PlatformServiceCallbacks;
  private readonly onlineSource = createOnlineSource();
  private platform: RuntimePlatform = "browser-preview";
  private storageKind: PlatformSnapshot["storage"] = "browser-local-storage";
  private lifecycle: LifecycleSignal = "foreground";
  private deepLink: string | null = null;
  private storage: GraphPersistenceAdapter | null = null;
  private runtime: LocalFirstGraphRuntime | null = null;
  private plugin: TauriGraphPlugin | null = null;
  private queue: QueuedTaskMutation[] = [];
  private pendingDeepLinks: string[] = [];
  private disposers: Array<() => void> = [];

  constructor(callbacks: PlatformServiceCallbacks) {
    this.callbacks = callbacks;
  }

  async initialize(): Promise<PlatformSnapshot> {
    const { isTauri } = await import("@tauri-apps/api/core");
    if (isTauri()) {
      await this.initializeNative();
    } else {
      this.storage = createBrowserStorage();
      this.attachWebLifecycle();
    }

    this.runtime = startLocalFirstGraph({
      storage: this.requireStorage(),
      key: GRAPH_STORAGE_KEY,
      onlineSource: this.onlineSource,
      replayPendingActions: false,
    });
    await this.runtime.ready;
    this.queue = parseQueue(await this.requireStorage().get(QUEUE_STORAGE_KEY));

    if (!graphStore.getState().lists[TASK_LIST_KEY]?.ids.length) {
      await this.seedGraph();
    } else {
      await this.mirrorGraphToNative();
    }
    this.pendingDeepLinks.splice(0).forEach((url) => this.acceptDeepLink(url));

    if (this.onlineSource.getIsOnline() && this.queue.length > 0) {
      await this.flushQueue();
    }
    await this.persist();
    return this.publishSnapshot();
  }

  async setConnection(mode: ConnectionMode): Promise<PlatformSnapshot> {
    this.onlineSource.setMode(mode);
    if (mode === "online") await this.flushQueue();
    return this.publishSnapshot();
  }

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<PlatformSnapshot> {
    const state = graphStore.getState();
    const canonical = state.entities[ENTITY_TYPES.task]?.[taskId] as unknown as TaskEntity | undefined;
    if (!canonical) throw new Error(`Task ${taskId} is not present in the normalized graph.`);

    state.patchEntity(ENTITY_TYPES.task, taskId, { status, pendingSync: true });
    state.setEntitySyncMetadata(ENTITY_TYPES.task, taskId, {
      synced: false,
      origin: "optimistic",
      updatedAt: Date.now(),
    });

    if (!this.onlineSource.getIsOnline()) {
      this.queue = [
        ...this.queue.filter((item) => item.taskId !== taskId),
        {
          id: `task-status:${taskId}`,
          taskId,
          status,
          enqueuedAt: new Date().toISOString(),
        },
      ];
      await this.persistQueue();
      await this.runtime?.persistNow();
      return this.publishSnapshot();
    }

    try {
      await this.commitTaskStatus(taskId, status);
    } catch (error) {
      state.clearPatch(ENTITY_TYPES.task, taskId);
      state.setEntitySyncMetadata(ENTITY_TYPES.task, taskId, {
        synced: true,
        origin: "server",
        updatedAt: Date.now(),
      });
      throw new Error(`Native task update failed and was rolled back: ${formatError(error)}`, {
        cause: error,
      });
    }

    await this.runtime?.persistNow();
    return this.publishSnapshot();
  }

  async persist(): Promise<PlatformSnapshot> {
    await this.persistQueue();
    await this.runtime?.persistNow();
    return this.publishSnapshot();
  }

  async restore(): Promise<PlatformSnapshot> {
    await this.runtime?.hydrate();
    this.queue = parseQueue(await this.requireStorage().get(QUEUE_STORAGE_KEY));
    await this.mirrorGraphToNative();
    if (this.onlineSource.getIsOnline()) await this.flushQueue();
    return this.publishSnapshot();
  }

  async proveDestructiveCommandDenied(): Promise<string> {
    if (!this.plugin) {
      return "Browser preview has no native IPC capability boundary to test.";
    }
    try {
      await this.plugin.commands.clearGraph();
    } catch (error) {
      return `Denied as configured: ${formatError(error)}`;
    }
    throw new Error("graph_clear unexpectedly succeeded; the capability is over-privileged.");
  }

  async dispose(): Promise<void> {
    if (this.storage && this.runtime) await this.persist();
    this.runtime?.dispose();
    await this.plugin?.dispose();
    this.onlineSource.dispose();
    this.disposers.splice(0).forEach((dispose) => dispose());
  }

  private async initializeNative(): Promise<void> {
    const [{ invoke }, { listen }, { default: Database }, deepLink, windowApi] = await Promise.all([
      import("@tauri-apps/api/core"),
      import("@tauri-apps/api/event"),
      import("@tauri-apps/plugin-sql"),
      import("@tauri-apps/plugin-deep-link"),
      import("@tauri-apps/api/window"),
    ]);
    this.plugin = await createTauriGraphPlugin({
      invoke,
      listen,
      options: { autoRestore: false },
    });
    const ping = await this.plugin.commands.platformPing();
    this.platform = ping.platform;
    this.storageKind = "native-sqlite";
    const database = await Database.load("sqlite:prometheus-entity-graph.db");
    this.storage = await createTauriSqlPersistenceAdapter(database);

    const currentUrls = await deepLink.getCurrent();
    if (currentUrls) this.pendingDeepLinks.push(...currentUrls);
    this.disposers.push(
      await deepLink.onOpenUrl((urls) => {
        if (this.runtime) {
          urls.forEach((url) => this.acceptDeepLink(url));
        } else {
          this.pendingDeepLinks.push(...urls);
        }
      }),
    );

    const currentWindow = windowApi.getCurrentWindow();
    this.disposers.push(
      await currentWindow.onFocusChanged(({ payload }) => {
        this.publishLifecycle(payload ? "focus" : "blur");
      }),
    );
    this.disposers.push(
      await currentWindow.onCloseRequested(() => {
        this.publishLifecycle("close-requested");
        void this.persist();
      }),
    );
    this.attachWebLifecycle();
  }

  private attachWebLifecycle(): void {
    const onVisibility = () => {
      this.publishLifecycle(document.visibilityState === "visible" ? "foreground" : "background");
    };
    document.addEventListener("visibilitychange", onVisibility);
    this.disposers.push(() => document.removeEventListener("visibilitychange", onVisibility));
    const onPageHide = () => {
      void this.persist();
    };
    window.addEventListener("pagehide", onPageHide);
    this.disposers.push(() => window.removeEventListener("pagehide", onPageHide));
  }

  private publishLifecycle(signal: LifecycleSignal): void {
    this.lifecycle = signal;
    this.publishSnapshot();
  }

  private acceptDeepLink(sourceUrl: string): void {
    const taskId = parseTaskDeepLink(
      sourceUrl,
      new Set(Object.keys(graphStore.getState().entities[ENTITY_TYPES.task] ?? {})),
    );
    if (!taskId) return;
    this.deepLink = sourceUrl;
    this.callbacks.onDeepLinkTask(taskId, sourceUrl);
    this.publishSnapshot();
  }

  private async seedGraph(): Promise<void> {
    for (const project of SEED_PROJECTS) await this.writeEntity(ENTITY_TYPES.project, project.id, { ...project });
    for (const user of SEED_USERS) await this.writeEntity(ENTITY_TYPES.user, user.id, { ...user });
    for (const task of SEED_TASKS) await this.writeEntity(ENTITY_TYPES.task, task.id, { ...task });
    await this.writeList(TASK_LIST_KEY, SEED_TASKS.map((task) => task.id));
  }

  private async mirrorGraphToNative(): Promise<void> {
    if (!this.plugin) return;
    const state = graphStore.getState();
    for (const [entityType, rows] of Object.entries(state.entities)) {
      for (const [entityId, data] of Object.entries(rows)) {
        await this.plugin.commands.upsertEntity({ entityType, entityId, data });
      }
    }
    for (const [queryKey, list] of Object.entries(state.lists)) {
      await this.plugin.commands.setList({ queryKey, ids: list.ids, total: list.total });
    }
  }

  private async writeEntity(entityType: string, entityId: string, data: Record<string, unknown>): Promise<void> {
    if (this.plugin) {
      await this.plugin.commands.upsertEntity({ entityType, entityId, data });
    } else {
      graphStore.getState().upsertEntity(entityType, entityId, data);
    }
  }

  private async writeList(queryKey: string, ids: string[]): Promise<void> {
    if (this.plugin) {
      await this.plugin.commands.setList({ queryKey, ids, total: ids.length });
    } else {
      graphStore.getState().setListResult(queryKey, ids, { total: ids.length });
    }
  }

  private async commitTaskStatus(taskId: string, status: TaskStatus): Promise<void> {
    const state = graphStore.getState();
    const current = state.entities[ENTITY_TYPES.task]?.[taskId];
    if (!current) throw new Error(`Task ${taskId} disappeared before commit.`);
    const next = { ...current, status, updatedAt: new Date().toISOString() };
    await this.writeEntity(ENTITY_TYPES.task, taskId, next);
    state.clearPatch(ENTITY_TYPES.task, taskId);
    state.setEntitySyncMetadata(ENTITY_TYPES.task, taskId, {
      synced: true,
      origin: "server",
      updatedAt: Date.now(),
    });
  }

  private async flushQueue(): Promise<void> {
    for (const mutation of [...this.queue]) {
      await this.commitTaskStatus(mutation.taskId, mutation.status);
      this.queue = this.queue.filter((item) => item.id !== mutation.id);
      await this.persistQueue();
    }
    await this.runtime?.persistNow();
    this.publishSnapshot();
  }

  private async persistQueue(): Promise<void> {
    await this.requireStorage().set(QUEUE_STORAGE_KEY, JSON.stringify(this.queue));
  }

  private requireStorage(): GraphPersistenceAdapter {
    if (!this.storage) throw new Error("Platform persistence is not initialized.");
    return this.storage;
  }

  private publishSnapshot(): PlatformSnapshot {
    const runtimeStatus = this.runtime?.getStatus();
    const snapshot: PlatformSnapshot = {
      platform: this.platform,
      connection: this.onlineSource.getIsOnline() ? "online" : "offline",
      storage: this.storageKind,
      pendingMutations: this.queue.length,
      lastPersistedAt: runtimeStatus?.lastPersistedAt ?? null,
      lifecycle: this.lifecycle,
      deepLink: this.deepLink,
    };
    this.callbacks.onSnapshot(snapshot);
    return snapshot;
  }
}

export function createPlatformService(callbacks: PlatformServiceCallbacks): PlatformService {
  return new UniversalPlatformService(callbacks);
}
