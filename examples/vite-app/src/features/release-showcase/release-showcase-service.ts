import { PGlite } from "@electric-sql/pglite";
import {
  RealtimeManager,
  TerminalError,
  applyView,
  cascadeInvalidation,
  createPGlitePersistenceAdapter,
  graphStore,
  startLocalFirstGraph,
  toGraphQLVariables,
  toRestParams,
} from "@prometheus-ags/prometheus-entity-management";
import type {
  ChangeSet,
  EntityTransport,
  ListQuery,
  ListResult,
  LocalFirstGraphRuntime,
  RealtimeAdapter,
  ViewDescriptor,
} from "@prometheus-ags/prometheus-entity-management";
import {
  createLoroLoopbackNetwork,
  createLoroProvider,
} from "@prometheus-ags/entity-graph-sync";
import { delay, useDemoBackendStore } from "@/features/demo-backend/demo-backend-store";
import { taskStore } from "@/features/tasks/task-store";
import type { Task } from "@/types";

export type ShowcaseTransportMode =
  | "demo-rest"
  | "demo-graphql"
  | "live-rest"
  | "live-graphql";

export interface TransportProof {
  mode: ShowcaseTransportMode;
  rest: Record<string, string>;
  graphql: ReturnType<typeof toGraphQLVariables>;
  recordedAt: string;
}

export interface PersistenceProof {
  phase: string;
  storageKey: string | null;
  lastPersistedAt: string | null;
  lastHydratedAt: string | null;
}

export interface ConvergenceProof {
  converged: boolean;
  deliveries: number;
  pendingBeforeReconnect: number;
  peerA: unknown;
  peerB: unknown;
}

export interface RealtimeProof {
  receivedChanges: number;
  graphWrites: number;
  finalStatus: Task["status"];
}

function queryToView(query: ListQuery): ViewDescriptor {
  return {
    filter: query.filter ?? undefined,
    sort: query.sort ?? undefined,
    search: query.search
      ? { query: query.search, fields: ["title", "description"] }
      : undefined,
  };
}

function projectRows(rows: Task[], query: ListQuery): Task[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const view = queryToView(query);
  const ids = applyView(
    rows.map((row) => row.id),
    (id) => byId.get(id) ?? null,
    view.filter,
    view.sort,
    view.search ?? null,
  );
  return ids.map((id) => byId.get(id)).filter((row): row is Task => row !== undefined);
}

function parseTaskRows(value: unknown, boundary: string): Task[] {
  if (!Array.isArray(value)) {
    throw new TerminalError(`${boundary} must return a task array`);
  }
  return value.map((row, index) => {
    if (!row || typeof row !== "object" || typeof (row as { id?: unknown }).id !== "string") {
      throw new TerminalError(`${boundary} returned an invalid task at index ${index}`);
    }
    return row as Task;
  });
}

async function fetchLiveRest(query: ListQuery, proof: TransportProof): Promise<Task[]> {
  const endpoint = import.meta.env.VITE_SHOWCASE_REST_URL;
  if (!endpoint) {
    throw new TerminalError(
      "Live REST mode requires VITE_SHOWCASE_REST_URL; deterministic demo mode remains available.",
    );
  }
  const url = new URL(endpoint);
  for (const [key, value] of Object.entries(proof.rest)) url.searchParams.set(key, value);
  const response = await fetch(url, { signal: query.signal });
  if (!response.ok) throw new TerminalError(`Live REST request failed with HTTP ${response.status}`);
  const payload = (await response.json()) as unknown;
  if (Array.isArray(payload)) return parseTaskRows(payload, "Live REST");
  if (payload && typeof payload === "object") {
    const record = payload as { items?: unknown; rows?: unknown };
    return parseTaskRows(record.items ?? record.rows, "Live REST");
  }
  throw new TerminalError("Live REST returned an invalid response envelope");
}

async function fetchLiveGraphql(query: ListQuery, proof: TransportProof): Promise<Task[]> {
  const endpoint = import.meta.env.VITE_SHOWCASE_GRAPHQL_URL;
  if (!endpoint) {
    throw new TerminalError(
      "Live GraphQL mode requires VITE_SHOWCASE_GRAPHQL_URL; deterministic demo mode remains available.",
    );
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    signal: query.signal,
    body: JSON.stringify({
      query: "query ShowcaseTasks($filter: TaskFilter, $sort: [TaskSort!]) { tasks(filter: $filter, sort: $sort) { items { id title description status priority projectId assigneeId reporterId estimatedHours loggedHours dueDate createdAt updatedAt tags storyPoints } } }",
      variables: proof.graphql,
    }),
  });
  if (!response.ok) throw new TerminalError(`Live GraphQL request failed with HTTP ${response.status}`);
  const payload = (await response.json()) as {
    data?: { tasks?: { items?: unknown; rows?: unknown } };
    errors?: unknown[];
  };
  if (payload.errors?.length) throw new TerminalError("Live GraphQL returned errors");
  return parseTaskRows(payload.data?.tasks?.items ?? payload.data?.tasks?.rows, "Live GraphQL");
}

export function createShowcaseTaskTransport(
  mode: ShowcaseTransportMode,
  onProof: (proof: TransportProof) => void,
): EntityTransport<Task> {
  return {
    authoritative: false,
    identify: (task) => task.id,
    staleTime: 0,
    async list(query): Promise<ListResult<Task>> {
      const view = queryToView(query);
      const proof: TransportProof = {
        mode,
        rest: toRestParams(view),
        graphql: toGraphQLVariables(view),
        recordedAt: new Date().toISOString(),
      };
      onProof(proof);

      let rows: Task[];
      if (mode === "live-rest") rows = await fetchLiveRest(query, proof);
      else if (mode === "live-graphql") rows = await fetchLiveGraphql(query, proof);
      else {
        await delay(120);
        rows = useDemoBackendStore.getState().listTasks();
      }

      const projected = projectRows(rows, query);
      const limit = query.limit ?? projected.length;
      const offset = typeof query.cursor === "number" ? query.cursor : 0;
      const page = projected.slice(offset, offset + limit);
      const nextOffset = offset + page.length;
      return {
        rows: page,
        total: projected.length,
        nextCursor: nextOffset < projected.length ? nextOffset : null,
      };
    },
    async get(id, signal) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      return taskStore.get(id);
    },
  };
}

let pglitePromise: Promise<PGlite> | null = null;
let localFirstRuntime: LocalFirstGraphRuntime | null = null;

async function getPGlite(): Promise<PGlite> {
  pglitePromise ??= PGlite.create("idb://prometheus-entity-showcase");
  return pglitePromise;
}

async function getLocalFirstRuntime(): Promise<LocalFirstGraphRuntime> {
  if (localFirstRuntime) return localFirstRuntime;
  const storage = await createPGlitePersistenceAdapter(await getPGlite(), {
    tableName: "showcase_graph_snapshot",
  });
  localFirstRuntime = startLocalFirstGraph({
    storage,
    key: "prometheus:v3-react-showcase",
    persistDebounceMs: 25,
  });
  await localFirstRuntime.ready;
  return localFirstRuntime;
}

function persistenceProof(runtime: LocalFirstGraphRuntime): PersistenceProof {
  const status = runtime.getStatus();
  return {
    phase: status.phase,
    storageKey: status.storageKey,
    lastPersistedAt: status.lastPersistedAt,
    lastHydratedAt: status.lastHydratedAt,
  };
}

export async function persistShowcaseGraph(): Promise<PersistenceProof> {
  const runtime = await getLocalFirstRuntime();
  await runtime.persistNow();
  return persistenceProof(runtime);
}

export async function hydrateShowcaseGraph(): Promise<PersistenceProof> {
  const runtime = await getLocalFirstRuntime();
  await runtime.hydrate();
  return persistenceProof(runtime);
}

export async function runLoroConvergence(): Promise<ConvergenceProof> {
  const network = createLoroLoopbackNetwork({ autoFlush: false });
  const channelA = network.createChannel("browser-a");
  const channelB = network.createChannel("browser-b");
  const loadLoro = () => import("loro-crdt");
  const peerA = createLoroProvider({ channel: channelA, peerId: 101, loadLoro });
  const peerB = createLoroProvider({ channel: channelB, peerId: 202, loadLoro });

  await Promise.all([
    peerA.start(["Task"], () => undefined),
    peerB.start(["Task"], () => undefined),
  ]);
  channelB.disconnect?.();
  peerA.pushLocalChange("Task", "offline-demo", {
    id: "offline-demo",
    title: "Peer A offline edit",
    status: "in-progress",
  });
  peerB.pushLocalChange("Task", "offline-demo", {
    id: "offline-demo",
    title: "Peer B offline edit",
    status: "done",
  });
  const pendingBeforeReconnect = network.getPendingCount();
  await channelB.connect?.();
  const deliveries = network.flush("reverse");
  const docA = peerA.getDoc?.("Task", "offline-demo") as { toJSON?: () => unknown } | undefined;
  const docB = peerB.getDoc?.("Task", "offline-demo") as { toJSON?: () => unknown } | undefined;
  const snapshotA = docA?.toJSON?.() ?? null;
  const snapshotB = docB?.toJSON?.() ?? null;
  peerA.stop();
  peerB.stop();
  return {
    converged: JSON.stringify(snapshotA) === JSON.stringify(snapshotB),
    deliveries,
    pendingBeforeReconnect,
    peerA: snapshotA,
    peerB: snapshotB,
  };
}

export async function reassignTaskWithCascade(
  id: string,
  projectId: string,
): Promise<Task> {
  const previous =
    graphStore.getState().readEntitySnapshot<Task>("Task", id) ?? (await taskStore.get(id));
  const next = await taskStore.update(id, { projectId });
  const store = graphStore.getState();
  store.upsertEntity("Task", id, next);
  store.setEntityFetched("Task", id);
  cascadeInvalidation({
    type: "Task",
    id,
    previous,
    next,
    op: "update",
  });
  return next;
}

export async function updateTaskStatus(
  id: string,
  status: Task["status"],
  reject: boolean,
): Promise<Task> {
  await delay(120);
  if (reject) throw new Error("Deterministic mutation rejection for rollback evidence");
  const next = await taskStore.update(id, { status });
  const store = graphStore.getState();
  store.upsertEntity("Task", id, next);
  store.setEntityFetched("Task", id);
  return next;
}

export function runRealtimeBurst(): RealtimeProof {
  let emit: (changeset: ChangeSet) => void = () => undefined;
  let receivedChanges = 0;
  let graphWrites = 0;
  const adapter: RealtimeAdapter = {
    name: "showcase-burst",
    subscribe(_config, next) {
      emit = next;
      return () => {
        emit = () => undefined;
      };
    },
  };
  const manager = new RealtimeManager({
    flushInterval: 16,
    onChangeReceived: () => {
      receivedChanges += 1;
    },
  });
  const unsubscribeGraph = graphStore.subscribe(() => {
    graphWrites += 1;
  });
  const unregister = manager.register(adapter, [{ type: "Task" }]);
  emit({
    changes: [
      { op: "update", type: "Task", id: "t1", patch: { status: "todo" } },
      { op: "update", type: "Task", id: "t1", patch: { status: "in-progress" } },
      { op: "update", type: "Task", id: "t1", patch: { status: "review" } },
    ],
  });
  manager.forceFlush();
  unregister();
  unsubscribeGraph();
  const task = graphStore.getState().readEntitySnapshot<Task>("Task", "t1");
  return {
    receivedChanges,
    graphWrites,
    finalStatus: task?.status ?? "review",
  };
}
