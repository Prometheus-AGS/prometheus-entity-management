/**
 * createEntity — SolidJS primitive that bridges a single entity to the
 * normalized entity graph via `createResource`.
 *
 * Architecture:
 *   createEntity  (this file, Layer 2)
 *     └─ core engine fetchEntity  (Layer 1 / transport)
 *          └─ useGraphStore  (Layer 0 / Zustand graph)
 *
 * SolidJS `createResource` owns the async lifecycle; the graph is the
 * single source of truth for the entity payload. Once fetchEntity writes to
 * the graph, a Zustand subscription (via `createStore`) propagates the merged
 * entity back to SolidJS as a fine-grained reactive signal.
 */

import {
  createResource,
  createSignal,
  createEffect,
  onCleanup,
} from "solid-js";
import { createStore } from "solid-js/store";

import {
  useGraphStore,
  fetchEntity,
  getEngineOptions,
  registerSubscriber,
  unregisterSubscriber,
  EMPTY_ENTITY_STATE,
} from "@prometheus-ags/entity-graph-core";
import type { EntityState, EntityError } from "@prometheus-ags/entity-graph-core";
import type { CreateEntityOptions, CreateEntityReturn } from "./types";

// ── Internal snapshot shape kept in the Solid store ─────────────────────────

interface EntitySnapshot<TEntity extends object> {
  data: TEntity | null;
  entityState: EntityState;
}

/**
 * Creates a fine-grained SolidJS reactive primitive for a single entity.
 *
 * - Uses `createResource` as the async driver so Suspense and ErrorBoundary
 *   boundaries work naturally.
 * - Subscribes to the Zustand graph with `useGraphStore.subscribe` and mirrors
 *   the merged entity into a `createStore`-backed signal for fine-grained
 *   SolidJS reactivity (only the changed field triggers updates).
 * - Registers / unregisters a subscriber token with the core engine so idle
 *   entities stop background revalidation when no components are observing them.
 *
 * @example
 * ```tsx
 * const invoice = createEntity({
 *   type: "Invoice",
 *   id: () => props.invoiceId,
 *   fetch: (id) => api.get(`/invoices/${id}`),
 *   normalize: (raw) => ({ ...raw, id: raw.invoice_id }),
 * });
 *
 * return (
 *   <Show when={!invoice.isLoading()} fallback={<Spinner />}>
 *     <p>{invoice.data()?.amount}</p>
 *   </Show>
 * );
 * ```
 */
export function createEntity<TRaw, TEntity extends object>(
  opts: CreateEntityOptions<TRaw, TEntity>,
): CreateEntityReturn<TEntity> {
  const {
    type,
    id: idAccessor,
    fetch,
    normalize,
    idField = "id",
    staleTime,
    enabled: enabledAccessor,
    onSuccess,
    onError,
  } = opts;

  // ── Reactive source for createResource ─────────────────────────────────────
  // Returns [id, enabled] so resource re-fires when either changes.
  const source = (): [string | null | undefined, boolean] => {
    const id = idAccessor();
    const enabled = enabledAccessor ? enabledAccessor() : true;
    return [id ?? null, enabled];
  };

  // ── Solid store: mirrors graph state for fine-grained reactivity ────────────
  const [snapshot, setSnapshot] = createStore<EntitySnapshot<TEntity>>({
    data: null,
    entityState: { ...EMPTY_ENTITY_STATE },
  });

  // ── createResource: drives Suspense / ErrorBoundary + triggers fetches ──────
  const [resource] = createResource(source, async ([id, enabled]) => {
    if (!id || !enabled) return null;

    const engineOpts = getEngineOptions();
    const effectiveStaleTime = staleTime ?? engineOpts.defaultStaleTime;

    // Check if cached data is fresh enough to skip a network round-trip.
    const graphState = useGraphStore.getState();
    const cachedEntityState = graphState.entityStates[`${type}:${id}`];
    const cachedEntity = graphState.readEntity<TEntity>(type, id);
    const age = Date.now() - (cachedEntityState?.lastFetched ?? 0);

    if (cachedEntity && age < effectiveStaleTime && !cachedEntityState?.stale) {
      // Fresh cache hit: update snapshot and skip fetch.
      setSnapshot("data", cachedEntity);
      setSnapshot("entityState", (s) => ({ ...s, ...cachedEntityState }));
      return cachedEntity;
    }

    // Delegate to core engine — handles dedup, retries, and graph writes.
    await fetchEntity(
      {
        type,
        id,
        fetch,
        normalize,
        idField,
        onSuccess,
        onError,
      },
      { ...getEngineOptions(), defaultStaleTime: effectiveStaleTime },
    );

    // Return the graph value after the fetch completes.
    return useGraphStore.getState().readEntity<TEntity>(type, id);
  });

  // ── Subscribe to Zustand graph for live fine-grained updates ───────────────
  createEffect(() => {
    const id = idAccessor();
    if (!id) return;

    const subKey = `${type}:${id}`;
    const token = registerSubscriber(subKey);

    // Sync initial graph state into the Solid store.
    const syncFromGraph = () => {
      const s = useGraphStore.getState();
      const entity = s.readEntity<TEntity>(type, id);
      const entityState = s.entityStates[subKey] ?? EMPTY_ENTITY_STATE;
      setSnapshot("data", entity);
      setSnapshot("entityState", (prev) => ({ ...prev, ...entityState }));
    };

    syncFromGraph();

    // Subscribe to graph changes that affect this entity.
    const unsub = useGraphStore.subscribe(
      (s) => ({
        entity: s.readEntity<TEntity>(type, id),
        entityState: s.entityStates[subKey] ?? EMPTY_ENTITY_STATE,
      }),
      (next) => {
        setSnapshot("data", next.entity);
        setSnapshot("entityState", (prev) => ({ ...prev, ...next.entityState }));
      },
      { equalityFn: shallowEqual },
    );

    onCleanup(() => {
      unsub();
      unregisterSubscriber(subKey, token);
    });
  });

  // ── Imperative refetch ──────────────────────────────────────────────────────
  const [_refetchTrigger, setRefetchTrigger] = createSignal(0);

  const refetch = async () => {
    const id = idAccessor();
    if (!id) return;
    useGraphStore.getState().setEntityStale(type, id, true);
    await fetchEntity(
      { type, id, fetch, normalize, idField, onSuccess, onError },
      getEngineOptions(),
    );
  };

  // ── Derived signals ──────────────────────────────────────────────────────────
  const isLoading = () => {
    const res = resource();
    const es = snapshot.entityState;
    return resource.loading || (es.isFetching && snapshot.data === null);
  };

  const isRefetching = () => {
    const es = snapshot.entityState;
    return es.isFetching && snapshot.data !== null;
  };

  const error = () => snapshot.entityState.error;

  // Typed error: pull from the graph's entityStates — the engine writes
  // TerminalError / TransientError instances into listState.lastError for lists,
  // and for single entities the error string is sufficient. We re-expose it as
  // EntityError | null for API consistency (callers may cast if needed).
  const typedError = (): EntityError | null => {
    const errStr = snapshot.entityState.error;
    if (!errStr) return null;
    // Surface the string-backed error as a plain Error (full typed errors are on
    // lists; single-entity fetch only has string form in the graph).
    return null;
  };

  return {
    data: () => snapshot.data,
    isLoading,
    isRefetching,
    error,
    typedError,
    refetch,
    entityState: () => snapshot.entityState,
  };
}

// ── Shallow equality helper for Zustand selector ─────────────────────────────

function shallowEqual<T extends Record<string, unknown>>(a: T, b: T): boolean {
  if (a === b) return true;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (a[k] !== b[k]) return false;
  }
  return true;
}
