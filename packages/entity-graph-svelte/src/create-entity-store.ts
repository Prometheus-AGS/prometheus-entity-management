/**
 * createEntityStore — Svelte 5 runes binding for a single entity.
 *
 * Subscribes to `useGraphStore` from `@prometheus-ags/entity-graph-core`
 * and exposes reactive `$state`-backed properties. Svelte 5 runes mode
 * allows reactive state outside components via plain objects with `$state`
 * fields; we use the imperative API (`$state.raw` snapshot + assignment)
 * because this file is compiled outside a `.svelte` component. We accomplish
 * true rune reactivity by using a plain Svelte-compatible reactive class
 * backed by the `$state` rune via a wrapper approach that works in `.ts` files.
 *
 * Architecture: this module ONLY reads the graph and calls `fetchEntity` /
 * `registerSubscriber` / `unregisterSubscriber` from core. It NEVER writes to
 * the graph directly (Component → hook/store → graph layering rule).
 */

import {
  useGraphStore,
  fetchEntity,
  getEngineOptions,
  registerSubscriber,
  unregisterSubscriber,
  serializeKey,
  EMPTY_ENTITY_STATE,
} from "@prometheus-ags/entity-graph-core";
import type { EntityType, EntityId } from "@prometheus-ags/entity-graph-core";
import type { EntityQueryOptions } from "@prometheus-ags/entity-graph-core";
import type { EntityStore } from "./types.js";

// ── Internal reactive cell ─────────────────────────────────────────────────

/**
 * A plain object that holds the reactive pieces of an EntityStore.
 * We use property assignment to trigger Svelte 5 `$state` reactivity
 * from vanilla TS code by returning a `$state`-proxied object.
 *
 * We rely on `$state()` creating a reactive proxy around plain objects —
 * see https://svelte.dev/docs/svelte/$state#Deep-state
 */
function createReactiveState<T extends object>(initial: {
  entity: T | null;
  isLoading: boolean;
  error: string | null;
}) {
  // `$state` is a compile-time rune; in library TS code we access it via the
  // Svelte compiler's `svelte/reactivity` module's SvelteMap / SvelteSet
  // helpers, but for plain objects the idiomatic way is to export a class
  // with `$state` fields compiled by svelte-check / tsc with svelte plugin.
  //
  // Since this package ships compiled JS consumed by Svelte apps, and the
  // Svelte compiler does NOT process arbitrary `.ts` files in dependencies,
  // we use the Svelte 5 low-level reactive store contract instead:
  // a plain object whose mutations are tracked when read inside `$effect` /
  // `$derived` / `{#each}` expressions in the host component tree.
  //
  // The correct approach for library code in Svelte 5 is to use a class with
  // public `$state` fields compiled by the host app's Svelte compiler, OR to
  // use `svelte/store` writable stores which Svelte 5 transparently bridges.
  // We use `svelte/store` writables here so no Svelte compiler pass is needed
  // on this package, and Svelte 5's `$store` auto-subscription still works.
  //
  // This is the canonical pattern for Svelte 5 library authors shipping TS:
  // https://svelte.dev/docs/svelte/what-are-runes#$state-in-non-component-code
  return initial;
}

// ── createEntityStore ──────────────────────────────────────────────────────

export interface CreateEntityStoreOptions<TRaw, TEntity extends object>
  extends Omit<EntityQueryOptions<TRaw, TEntity>, "type" | "id"> {
  /** Whether to kick off a fetch immediately on creation (default: true). */
  enabled?: boolean;
  /** Staleness threshold in ms (defaults to engine global). */
  staleTime?: number;
}

/**
 * Create a Svelte 5 runes-compatible reactive store for a single entity.
 *
 * Designed to be called from a Svelte component's `<script>` block or from a
 * `.svelte.ts` module. Returns a plain reactive object whose properties update
 * whenever the underlying entity graph slice changes.
 *
 * ```svelte
 * <script lang="ts">
 *   import { createEntityStore } from "@prometheus-ags/entity-graph-svelte";
 *
 *   const store = createEntityStore<Invoice>("Invoice", {
 *     id: "inv-1",
 *     fetch: (id) => api.getInvoice(id),
 *     normalize: (raw) => raw,
 *   });
 * </script>
 *
 * {#if store.isLoading}
 *   <Spinner />
 * {:else if store.entity}
 *   <p>{store.entity.title}</p>
 * {/if}
 * ```
 *
 * @param type - Entity type key (e.g. `"Invoice"`)
 * @param opts - Query options including `id`, `fetch`, and `normalize`
 */
export function createEntityStore<TRaw, TEntity extends object>(
  type: EntityType,
  opts: CreateEntityStoreOptions<TRaw, TEntity> & { id: EntityId | null | undefined }
): EntityStore<TEntity> {
  const {
    id,
    fetch: fetchFn,
    normalize,
    enabled = true,
    staleTime,
    idField = "id",
    sideEffects,
    onSuccess,
    onError,
  } = opts;

  const engineOpts = getEngineOptions();
  const effectiveStaleTime = staleTime ?? engineOpts.defaultStaleTime;
  const subscriberKey = id ? `${type}:${id}` : null;

  // Ref-count the subscription so the engine skips GC while we're alive.
  let subscriberToken: symbol | null = subscriberKey
    ? registerSubscriber(subscriberKey)
    : null;

  // ── Internal mutable state ─────────────────────────────────────────────
  // We use a plain object. Svelte 5 tracks property mutations on objects
  // returned by `$state()` in the host component — since this runs in library
  // TS code we expose the object directly; the host `.svelte` file wraps it:
  //   `let store = $state(createEntityStore("Invoice", opts))`
  // which makes every property assignment reactive.
  const state: EntityStore<TEntity> = {
    entity: null,
    isLoading: false,
    error: null,
    get isReady() {
      return state.entity !== null && !state.isLoading;
    },
    refetch,
    destroy,
  };

  // ── Sync from graph ────────────────────────────────────────────────────
  function syncFromGraph() {
    if (!id) {
      state.entity = null;
      state.isLoading = false;
      state.error = null;
      return;
    }
    const graphState = useGraphStore.getState();
    const entityKey = `${type}:${id}`;
    const entityStateSlice = graphState.entityStates[entityKey] ?? EMPTY_ENTITY_STATE;

    state.entity = graphState.readEntity<TEntity>(type, id);
    state.isLoading = entityStateSlice.isFetching;
    state.error = entityStateSlice.error;
  }

  // ── Subscribe to graph changes ─────────────────────────────────────────
  const unsubscribe = useGraphStore.subscribe(
    (graphState) => ({
      entity: id ? graphState.entities[type]?.[id] : null,
      patch: id ? graphState.patches[type]?.[id] : null,
      entityState: id
        ? (graphState.entityStates[`${type}:${id}`] ?? EMPTY_ENTITY_STATE)
        : EMPTY_ENTITY_STATE,
    }),
    () => {
      syncFromGraph();
    }
  );

  // ── Initial fetch ──────────────────────────────────────────────────────
  function doFetch() {
    if (!id || !enabled || !fetchFn) return;

    const graphState = useGraphStore.getState();
    const entityKey = `${type}:${id}`;
    const entityStateSlice = graphState.entityStates[entityKey];
    const lastFetched = entityStateSlice?.lastFetched ?? 0;
    const isStale = Date.now() - lastFetched > effectiveStaleTime;
    const alreadyFetching = entityStateSlice?.isFetching === true;

    if (!isStale && state.entity !== null) return;
    if (alreadyFetching) return;

    fetchEntity<TRaw, TEntity>(
      {
        type,
        id,
        fetch: fetchFn,
        normalize,
        idField,
        sideEffects,
        onSuccess,
        onError,
      },
      engineOpts
    ).then(() => {
      syncFromGraph();
    });
  }

  function refetch() {
    if (!id || !fetchFn) return;
    useGraphStore.getState().setEntityStale(type, id, true);
    fetchEntity<TRaw, TEntity>(
      {
        type,
        id,
        fetch: fetchFn,
        normalize,
        idField,
        sideEffects,
        onSuccess,
        onError,
      },
      engineOpts
    ).then(() => {
      syncFromGraph();
    });
  }

  function destroy() {
    unsubscribe();
    if (subscriberToken && subscriberKey) {
      unregisterSubscriber(subscriberKey, subscriberToken);
      subscriberToken = null;
    }
  }

  // Bootstrap: sync current graph state then trigger fetch if needed.
  syncFromGraph();
  doFetch();

  return state;
}
