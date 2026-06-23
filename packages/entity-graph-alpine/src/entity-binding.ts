/**
 * entity-binding.ts — $entity(type, id) magic implementation.
 *
 * Creates a reactive cell over the entity graph that Alpine.effect() can
 * observe. When the graph slice for (type, id) changes, the cell properties
 * update and Alpine schedules a re-render of any `x-text` / `:bind` / `x-show`
 * expressions that read them.
 *
 * Architecture (strictly layered — never touches graph directly):
 *   Alpine template expression
 *     → $entity magic (this file)
 *       → useGraphStore.subscribe  (core Layer 1 read)
 *       → fetchEntity              (core engine, handles dedup + retry)
 *       → useGraphStore.getState() (synchronous graph reads only)
 */

import {
  useGraphStore,
  fetchEntity,
  getEngineOptions,
  registerSubscriber,
  unregisterSubscriber,
  EMPTY_ENTITY_STATE,
  getEntityTransport,
} from "@prometheus-ags/entity-graph-core";
import type { EntityType, EntityId, EntityTransport } from "@prometheus-ags/entity-graph-core";
import type { AlpineEntitySnapshot } from "./types.js";

// ── Internal mutable cell ─────────────────────────────────────────────────────

interface EntityCell<T extends Record<string, unknown>> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

// ── Safe transport lookup ─────────────────────────────────────────────────────

function tryGetTransport<T extends object>(type: EntityType): EntityTransport<T> | null {
  try {
    return getEntityTransport<T>(type);
  } catch {
    return null;
  }
}

// ── createEntityBinding ───────────────────────────────────────────────────────

/**
 * Options accepted by `createEntityBinding`.
 */
export interface EntityBindingOptions {
  /** Staleness threshold in ms (overrides engine default). */
  staleTime?: number;
  /** Whether to fire an initial fetch (default `true`). */
  enabled?: boolean;
}

/**
 * Create a reactive Alpine entity snapshot for (type, id).
 *
 * The returned object delegates property reads to an Alpine-reactive cell.
 * Reading any property inside an Alpine `x-effect` / `x-text` / `:bind`
 * expression causes Alpine to track the dependency. Mutations to the cell
 * trigger Alpine's reactivity queue.
 *
 * Lifecycle:
 * 1. Register a subscriber token with the core engine (prevents GC).
 * 2. Sync the current graph state into the cell.
 * 3. Subscribe to future graph changes; sync on each notification.
 * 4. Kick off an initial fetch if data is stale or absent.
 * 5. `destroy()` unsubscribes from the graph and releases the engine token.
 *
 * @internal Called by the `$entity` magic factory.
 */
export function createEntityBinding<T extends Record<string, unknown>>(
  alpineReactive: <U extends object>(obj: U) => U,
  type: EntityType,
  id: EntityId | null | undefined,
  opts: EntityBindingOptions = {},
): AlpineEntitySnapshot<T> {
  const { staleTime, enabled = true } = opts;

  const engineOpts = getEngineOptions();
  const effectiveStaleTime = staleTime ?? engineOpts.defaultStaleTime;
  const subscriberKey = id ? `${type}:${id}` : null;

  // ── Register subscriber so engine keeps this entity alive ──────────────────
  let subscriberToken: symbol | null = subscriberKey
    ? registerSubscriber(subscriberKey)
    : null;

  // ── Alpine-reactive cell: mutations here trigger reactive updates ───────────
  // `alpineReactive` is Alpine.reactive() — wraps the object in an Alpine proxy
  // so property assignments schedule UI updates.
  const cell = alpineReactive<EntityCell<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  // ── Sync from graph into the reactive cell ─────────────────────────────────
  function syncFromGraph(): void {
    if (!id) {
      cell.data = null;
      cell.isLoading = false;
      cell.error = null;
      return;
    }
    const s = useGraphStore.getState();
    const key = `${type}:${id}`;
    const entityState = s.entityStates[key] ?? EMPTY_ENTITY_STATE;

    cell.data = s.readEntity<T>(type, id);
    cell.isLoading = entityState.isFetching;
    cell.error = entityState.error;
  }

  // ── Subscribe to Zustand graph ─────────────────────────────────────────────
  const unsubscribe = useGraphStore.subscribe(
    (s) => ({
      data: id ? s.entities[type]?.[id] : null,
      patch: id ? s.patches[type]?.[id] : null,
      entityState: id
        ? (s.entityStates[`${type}:${id}`] ?? EMPTY_ENTITY_STATE)
        : EMPTY_ENTITY_STATE,
    }),
    () => {
      syncFromGraph();
    },
  );

  // ── Initial fetch ──────────────────────────────────────────────────────────
  function doFetch(): void {
    if (!id || !enabled) return;

    const s = useGraphStore.getState();
    const key = `${type}:${id}`;
    const entityState = s.entityStates[key];
    const lastFetched = entityState?.lastFetched ?? 0;
    const isStale = Date.now() - lastFetched > effectiveStaleTime;
    const alreadyFetching = entityState?.isFetching === true;

    if (!isStale && cell.data !== null) return;
    if (alreadyFetching) return;

    // Delegate to core engine — handles in-flight dedup, retry, graph writes.
    // Requires a transport with a `get` method registered for this entity type.
    const transport = tryGetTransport<T>(type);
    if (!transport?.get) return;

    const transportGet = transport.get.bind(transport);

    fetchEntity<T, T>(
      {
        type,
        id,
        fetch: (eid) => transportGet(eid) as Promise<T>,
        normalize: (raw) => raw as T,
        idField: "id",
      },
      { ...engineOpts, defaultStaleTime: effectiveStaleTime },
    ).then(() => {
      syncFromGraph();
    });
  }

  // ── Imperative refetch ─────────────────────────────────────────────────────
  function refetch(): void {
    if (!id) return;
    useGraphStore.getState().setEntityStale(type, id, true);
    doFetch();
  }

  // ── Cleanup ───────────────────────────────────────────────────────────────
  function destroy(): void {
    unsubscribe();
    if (subscriberToken && subscriberKey) {
      unregisterSubscriber(subscriberKey, subscriberToken);
      subscriberToken = null;
    }
  }

  // Bootstrap: pull current state then kick off fetch if needed.
  syncFromGraph();
  doFetch();

  // ── Return reactive snapshot ───────────────────────────────────────────────
  // The snapshot delegates to the reactive cell for `data`, `isLoading`, `error`,
  // while `isReady` is a derived getter and `refetch`/`destroy` are stable refs.
  return {
    get data() { return cell.data; },
    get isLoading() { return cell.isLoading; },
    get error() { return cell.error; },
    get isReady() { return cell.data !== null && !cell.isLoading; },
    refetch,
    destroy,
  };
}
