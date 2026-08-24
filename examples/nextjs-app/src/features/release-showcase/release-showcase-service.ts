import {
  RealtimeManager,
  applyView,
  cascadeInvalidation,
  graphStore,
  toGraphQLVariables,
  toRestParams,
} from "@prometheus-ags/prometheus-entity-management";
import type {
  ChangeSet,
  EntityTransport,
  ListQuery,
  ListResult,
  RealtimeAdapter,
  ViewDescriptor,
} from "@prometheus-ags/prometheus-entity-management";
import { delay, useDemoBackendStore } from "@/features/demo-backend/demo-backend-store";
import { recordDemoRead } from "@/lib/fetch-metrics";
import { taskStore } from "@/features/tasks/task-store";
import type { Task } from "@/types";

export interface TransportProof {
  mode: "demo";
  rest: Record<string, string>;
  graphql: ReturnType<typeof toGraphQLVariables>;
  recordedAt: string;
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

/**
 * Deterministic demo transport for the local/remote/hybrid view scenario.
 * One mode only — live external services stay explicit opt-in in the Vite
 * showcase and are intentionally not duplicated here.
 */
export function createShowcaseTaskTransport(
  onProof: (proof: TransportProof) => void,
): EntityTransport<Task> {
  return {
    authoritative: false,
    identify: (task) => task.id,
    staleTime: 0,
    async list(query): Promise<ListResult<Task>> {
      recordDemoRead("ShowcaseTransport.list");
      const view = queryToView(query);
      onProof({
        mode: "demo",
        rest: toRestParams(view),
        graphql: toGraphQLVariables(view),
        recordedAt: new Date().toISOString(),
      });

      await delay(120);
      const rows = useDemoBackendStore.getState().listTasks();
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
