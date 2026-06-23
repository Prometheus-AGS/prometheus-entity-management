/**
 * EntityListController — Lit 3 ReactiveController for a list query.
 *
 * Subscribes to `useGraphStore` and calls `requestUpdate()` on the host
 * whenever the list ids, entity payloads, or list metadata change.
 * `items` is resolved by joining list ids against the entity graph on every
 * read, providing the same cross-view reactivity guarantee as the React binding.
 *
 * Architecture: controller → core engine functions; never reimplements graph.
 */

import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
  useGraphStore,
  fetchList,
  getEngineOptions,
  serializeKey,
  EMPTY_LIST_STATE,
} from "@prometheus-ags/entity-graph-core";
import type {
  EntityType,
  EntityId,
  ListQueryOptions,
  ListFetchParams,
} from "@prometheus-ags/entity-graph-core";
import type { EntityListControllerOptions } from "./types.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function resolveItems<TEntity extends object>(
  type: EntityType,
  ids: EntityId[]
): TEntity[] {
  const state = useGraphStore.getState();
  const bucket = state.entities[type] ?? {};
  const patchBucket = state.patches[type] ?? {};
  const items: TEntity[] = [];
  for (const id of ids) {
    const base = bucket[id];
    if (!base) continue;
    const patch = patchBucket[id];
    items.push((patch ? { ...base, ...patch } : base) as TEntity);
  }
  return items;
}

// ── EntityListController ───────────────────────────────────────────────────

/**
 * Lit 3 ReactiveController that subscribes to an entity list in the graph.
 *
 * ```ts
 * class InvoiceList extends LitElement {
 *   readonly #list = new EntityListController<RawInvoice, Invoice>(this, "Invoice", {
 *     queryKey: ["invoices", { status: "open" }],
 *     fetch: (params) => api.listInvoices(params),
 *     normalize: (raw) => ({ id: raw.id, data: raw }),
 *   });
 *
 *   render() {
 *     return html`
 *       ${this.#list.items.map((inv) => html`<li>${inv.title}</li>`)}
 *       ${this.#list.hasNextPage
 *         ? html`<button @click=${() => this.#list.loadMore()}>Load more</button>`
 *         : nothing}
 *     `;
 *   }
 * }
 * ```
 */
export class EntityListController<TRaw, TEntity extends object>
  implements ReactiveController
{
  // ── Public reactive state ────────────────────────────────────────────────
  items: TEntity[] = [];
  isLoading = false;
  isLoadingMore = false;
  error: string | null = null;
  hasNextPage = false;
  total: number | null = null;

  // ── Private ──────────────────────────────────────────────────────────────
  readonly #host: ReactiveControllerHost;
  readonly #type: EntityType;
  readonly #opts: EntityListControllerOptions<TRaw, TEntity>;
  readonly #listKey: string;
  #unsubscribe: (() => void) | null = null;
  #currentCursor: string | undefined;

  constructor(
    host: ReactiveControllerHost,
    type: EntityType,
    opts: EntityListControllerOptions<TRaw, TEntity>
  ) {
    this.#host = host;
    this.#type = type;
    this.#opts = opts;
    this.#listKey = serializeKey(opts.queryKey);
    host.addController(this);
  }

  // ── ReactiveController lifecycle ─────────────────────────────────────────

  hostConnected(): void {
    this.#subscribeToGraph();
    this.#syncFromGraph();
    this.#doFetch();
  }

  hostDisconnected(): void {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Force a full refetch (replaces ids from page 1).
   */
  refetch(): void {
    const { fetch: fetchFn, normalize } = this.#opts;
    if (!fetchFn || !normalize) return;
    useGraphStore.getState().invalidateLists(this.#listKey);
    this.#doFetch(true);
  }

  /**
   * Append the next page. No-op when `hasNextPage` is false or a fetch is
   * already in progress.
   */
  loadMore(): void {
    const { fetch: fetchFn, normalize, sideEffects, onSuccess, onError } =
      this.#opts;
    if (!fetchFn || !normalize) return;

    const graphState = useGraphStore.getState();
    const listState = graphState.lists[this.#listKey] ?? EMPTY_LIST_STATE;
    if (!listState.hasNextPage) return;
    if (listState.isFetching || listState.isFetchingMore) return;

    const params: ListFetchParams = { cursor: this.#currentCursor };
    fetchList<TRaw, TEntity>(
      {
        type: this.#type,
        queryKey: this.#opts.queryKey,
        fetch: fetchFn,
        normalize,
        mode: "append",
        sideEffects,
        onSuccess,
        onError,
      },
      params,
      getEngineOptions(),
      true
    ).then(() => {
      this.#syncFromGraph();
      this.#host.requestUpdate();
    });
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  #subscribeToGraph(): void {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }

    const type = this.#type;
    const listKey = this.#listKey;

    this.#unsubscribe = useGraphStore.subscribe(
      (state) => ({
        listSlice: state.lists[listKey] ?? EMPTY_LIST_STATE,
        entities: state.entities[type],
        patches: state.patches[type],
      }),
      () => {
        this.#syncFromGraph();
        this.#host.requestUpdate();
      }
    );
  }

  #syncFromGraph(): void {
    const state = useGraphStore.getState();
    const listState = state.lists[this.#listKey] ?? EMPTY_LIST_STATE;

    this.items = resolveItems<TEntity>(this.#type, listState.ids);
    this.isLoading = listState.isFetching;
    this.isLoadingMore = listState.isFetchingMore;
    this.error = listState.error;
    this.hasNextPage = listState.hasNextPage;
    this.total = listState.total;
    this.#currentCursor = listState.nextCursor ?? undefined;
  }

  #doFetch(force = false): void {
    const {
      fetch: fetchFn,
      normalize,
      enabled = true,
      staleTime,
      mode = "replace",
      sideEffects,
      onSuccess,
      onError,
    } = this.#opts;

    if (!enabled || !fetchFn || !normalize) return;

    const engineOpts = getEngineOptions();
    const effectiveStaleTime = staleTime ?? engineOpts.defaultStaleTime;
    const graphState = useGraphStore.getState();
    const listState = graphState.lists[this.#listKey];
    const lastFetched = listState?.lastFetched ?? 0;
    const isStale = force || Date.now() - lastFetched > effectiveStaleTime;
    const alreadyFetching = listState?.isFetching === true;

    if (!isStale && listState && listState.ids.length > 0) return;
    if (alreadyFetching) return;

    const queryOpts: ListQueryOptions<TRaw, TEntity> = {
      type: this.#type,
      queryKey: this.#opts.queryKey,
      fetch: fetchFn,
      normalize,
      mode,
      sideEffects,
      onSuccess,
      onError,
    };

    fetchList<TRaw, TEntity>(queryOpts, {}, engineOpts, false).then(() => {
      this.#syncFromGraph();
      this.#host.requestUpdate();
    });
  }
}
