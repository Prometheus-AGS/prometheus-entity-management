/**
 * EntityDetailController — Lit 3 ReactiveController for a single entity.
 *
 * Subscribes to `useGraphStore` from `@prometheus-ags/entity-graph-core` and
 * calls `requestUpdate()` on the host Lit element whenever the relevant entity
 * or its entityState changes. The controller also invokes `fetchEntity` /
 * `registerSubscriber` / `unregisterSubscriber` so the engine's GC and
 * deduplication machinery works correctly.
 *
 * Architecture: this controller ONLY reads the graph and delegates all I/O to
 * core engine functions. It NEVER writes to the graph directly.
 * Component → controller → store layering is respected throughout.
 */

import type { ReactiveController, ReactiveControllerHost } from "lit";
import {
  useGraphStore,
  fetchEntity,
  getEngineOptions,
  registerSubscriber,
  unregisterSubscriber,
  EMPTY_ENTITY_STATE,
} from "@prometheus-ags/entity-graph-core";
import type {
  EntityType,
  EntityId,
  EntityQueryOptions,
} from "@prometheus-ags/entity-graph-core";
import type { EntityDetailControllerOptions } from "./types.js";

// ── EntityDetailController ─────────────────────────────────────────────────

/**
 * Lit 3 ReactiveController that subscribes to a single entity in the graph.
 *
 * Usage inside a Lit element:
 *
 * ```ts
 * import { EntityDetailController } from "@prometheus-ags/entity-graph-web-components";
 *
 * class InvoiceDetail extends LitElement {
 *   readonly #detail = new EntityDetailController<RawInvoice, Invoice>(this, "Invoice", {
 *     id: "inv-1",
 *     fetch: (id) => api.getInvoice(id),
 *     normalize: (raw) => raw,
 *   });
 *
 *   render() {
 *     if (this.#detail.isLoading) return html`<span>Loading…</span>`;
 *     if (!this.#detail.entity) return html`<span>Not found</span>`;
 *     return html`<p>${this.#detail.entity.title}</p>`;
 *   }
 * }
 * ```
 */
export class EntityDetailController<TRaw, TEntity extends object>
  implements ReactiveController
{
  // ── Public reactive state ────────────────────────────────────────────────
  entity: TEntity | null = null;
  isLoading = false;
  error: string | null = null;

  get isReady(): boolean {
    return this.entity !== null && !this.isLoading;
  }

  // ── Private ──────────────────────────────────────────────────────────────
  readonly #host: ReactiveControllerHost;
  readonly #type: EntityType;
  #id: EntityId | null | undefined;
  readonly #opts: EntityDetailControllerOptions<TRaw, TEntity>;
  #unsubscribe: (() => void) | null = null;
  #subscriberToken: symbol | null = null;
  #subscriberKey: string | null = null;

  constructor(
    host: ReactiveControllerHost,
    type: EntityType,
    opts: EntityDetailControllerOptions<TRaw, TEntity> & {
      id: EntityId | null | undefined;
    }
  ) {
    this.#host = host;
    this.#type = type;
    this.#id = opts.id;
    this.#opts = opts;
    host.addController(this);
  }

  // ── ReactiveController lifecycle ─────────────────────────────────────────

  hostConnected(): void {
    this.#registerSubscriber();
    this.#subscribeToGraph();
    this.#syncFromGraph();
    this.#doFetch();
  }

  hostDisconnected(): void {
    this.#cleanup();
  }

  // ── Public API ───────────────────────────────────────────────────────────

  /**
   * Update the entity id and re-subscribe. Call this when the element's
   * attribute changes (e.g. from `attributeChangedCallback`).
   */
  setId(id: EntityId | null | undefined): void {
    if (id === this.#id) return;
    // Release previous subscription tokens before switching ids.
    this.#cleanup();
    this.#id = id;
    this.#registerSubscriber();
    this.#subscribeToGraph();
    this.#syncFromGraph();
    this.#doFetch();
  }

  /**
   * Trigger a fresh fetch regardless of staleness (pull-to-refresh, post-save).
   */
  refetch(): void {
    const id = this.#id;
    const { fetch: fetchFn } = this.#opts;
    if (!id || !fetchFn) return;
    useGraphStore.getState().setEntityStale(this.#type, id, true);
    this.#doFetch(true);
  }

  // ── Internal helpers ─────────────────────────────────────────────────────

  #registerSubscriber(): void {
    const id = this.#id;
    if (!id) return;
    this.#subscriberKey = `${this.#type}:${id}`;
    this.#subscriberToken = registerSubscriber(this.#subscriberKey);
  }

  #unregisterSubscriber(): void {
    if (this.#subscriberToken && this.#subscriberKey) {
      unregisterSubscriber(this.#subscriberKey, this.#subscriberToken);
      this.#subscriberToken = null;
      this.#subscriberKey = null;
    }
  }

  #subscribeToGraph(): void {
    // Unsubscribe from any previous graph subscription before re-subscribing.
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }

    const type = this.#type;
    const id = this.#id;

    this.#unsubscribe = useGraphStore.subscribe(
      (state) => ({
        entity: id ? state.entities[type]?.[id] : null,
        patch: id ? state.patches[type]?.[id] : null,
        entityState: id
          ? (state.entityStates[`${type}:${id}`] ?? EMPTY_ENTITY_STATE)
          : EMPTY_ENTITY_STATE,
      }),
      () => {
        this.#syncFromGraph();
        this.#host.requestUpdate();
      }
    );
  }

  #syncFromGraph(): void {
    const id = this.#id;
    if (!id) {
      this.entity = null;
      this.isLoading = false;
      this.error = null;
      return;
    }

    const state = useGraphStore.getState();
    const eKey = `${this.#type}:${id}`;
    const eState = state.entityStates[eKey] ?? EMPTY_ENTITY_STATE;

    this.entity = state.readEntity<TEntity>(this.#type, id);
    this.isLoading = eState.isFetching;
    this.error = eState.error;
  }

  #doFetch(force = false): void {
    const id = this.#id;
    const { fetch: fetchFn, normalize, enabled = true, staleTime, idField, sideEffects, onSuccess, onError } =
      this.#opts;

    if (!id || !enabled || !fetchFn) return;

    const engineOpts = getEngineOptions();
    const effectiveStaleTime = staleTime ?? engineOpts.defaultStaleTime;
    const state = useGraphStore.getState();
    const eKey = `${this.#type}:${id}`;
    const eState = state.entityStates[eKey];
    const lastFetched = eState?.lastFetched ?? 0;
    const isStale = force || Date.now() - lastFetched > effectiveStaleTime;
    const alreadyFetching = eState?.isFetching === true;

    if (!isStale && this.entity !== null) return;
    if (alreadyFetching) return;

    const queryOpts: EntityQueryOptions<TRaw, TEntity> = {
      type: this.#type,
      id,
      fetch: fetchFn,
      normalize,
      idField,
      sideEffects,
      onSuccess,
      onError,
    };

    fetchEntity<TRaw, TEntity>(queryOpts, engineOpts).then(() => {
      this.#syncFromGraph();
      this.#host.requestUpdate();
    });
  }

  #cleanup(): void {
    if (this.#unsubscribe) {
      this.#unsubscribe();
      this.#unsubscribe = null;
    }
    this.#unregisterSubscriber();
  }
}
