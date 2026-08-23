/**
 * Per-request graph machinery (server-only).
 *
 * The React binding's hooks bind to a process-global Zustand store, which is
 * shared by every concurrent SSR request in a Node process. Request-scoped
 * data must therefore never touch that global store on the server. Instead:
 *
 * 1. `createRequestGraph()` mints a fresh graph store per request via the
 *    framework-neutral core's `createGraphStore()`.
 * 2. `buildRequestPayload()` produces a serializable `HydrationPayload`
 *    (entities + list slots keyed by `serializeKey(queryKey)`) from the pure
 *    per-request data source.
 * 3. Server components read from the request graph; the payload crosses the
 *    RSC boundary as props and is written to the client-owned global store
 *    only after hydration (see `RequestHydrationBoundary`).
 *
 * Import discipline: relative imports for app modules + the framework-neutral
 * core package only. Never import the React binding here.
 */

import { createGraphStore, serializeKey } from "@prometheus-ags/entity-graph-core";
import type { GraphStore } from "@prometheus-ags/entity-graph-core";
import type { HydrationPayload, InitialEntity } from "../hydration-payload";
import { getRequestSeed, simulateRequestLatency } from "./demo-data-source";
import type { RequestSeed } from "./demo-data-source";

export function createRequestGraph(): GraphStore {
  return createGraphStore();
}

function seedToEntities(seed: RequestSeed): InitialEntity[] {
  const entities: InitialEntity[] = [];
  for (const user of seed.users) {
    entities.push({ type: "User", id: user.id, data: { ...user } });
  }
  for (const project of seed.projects) {
    entities.push({ type: "Project", id: project.id, data: { ...project } });
  }
  for (const task of seed.tasks) {
    entities.push({ type: "Task", id: task.id, data: { ...task } });
  }
  return entities;
}

const byUpdatedAtDesc = (left: string, right: string) =>
  right.localeCompare(left);

function sortTasksDefault(seed: RequestSeed) {
  return [...seed.tasks].sort((left, right) =>
    byUpdatedAtDesc(left.updatedAt, right.updatedAt),
  );
}

/**
 * Builds the serializable hydration payload for one request. List slots use
 * the same serialized query keys as the app hooks (`["tasks"]`, `["projects"]`,
 * `["users"]`) so hydrated lists are fresh inside `staleTime` and the client
 * does not refetch what the server already prefetched.
 */
export async function buildRequestPayload(
  options: { tenant?: string; latencyMs?: number } = {},
): Promise<HydrationPayload & { requestId: string }> {
  await simulateRequestLatency(options.latencyMs);
  const seed = getRequestSeed(options.tenant);
  const entities = seedToEntities(seed);
  return {
    requestId: crypto.randomUUID(),
    entities,
    lists: [
      {
        key: serializeKey(["tasks"]),
        ids: sortTasksDefault(seed).map((task) => task.id),
        total: seed.tasks.length,
      },
      {
        key: serializeKey(["projects"]),
        ids: seed.projects.map((project) => project.id),
        total: seed.projects.length,
      },
      {
        key: serializeKey(["users"]),
        ids: seed.users.map((user) => user.id),
        total: seed.users.length,
      },
    ],
  };
}

/** Writes a payload into a request-owned graph, marking entities and lists fresh. */
export function hydrateRequestGraph(
  store: GraphStore,
  payload: HydrationPayload,
): void {
  const state = store.getState();
  for (const { type, id, data } of payload.entities) {
    state.upsertEntity(type, id, data);
    state.setEntityFetched(type, id);
  }
  for (const list of payload.lists) {
    state.setListResult(list.key, list.ids, { total: list.total });
  }
}

/** Dehydrates a request graph back into a serializable payload (round-trip proof). */
export function dehydrateRequestGraph(store: GraphStore): HydrationPayload {
  const state = store.getState();
  const entities: InitialEntity[] = [];
  for (const [type, bucket] of Object.entries(state.entities)) {
    for (const [id, data] of Object.entries(bucket)) {
      entities.push({ type, id, data: { ...(data as Record<string, unknown>) } });
    }
  }
  const lists = Object.entries(state.lists).map(([key, list]) => ({
    key,
    ids: [...list.ids],
    total: list.total,
  }));
  return { entities, lists };
}
