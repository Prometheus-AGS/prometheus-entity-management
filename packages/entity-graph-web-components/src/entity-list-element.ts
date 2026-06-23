/**
 * <entity-list> — Lit 3 custom element built on EntityListController.
 *
 * A headless, slotted list element that manages its own graph subscription.
 * Consumers wire data via the `configure()` method and render items via a
 * slot or the `renderItem` callback.
 *
 * Attributes:
 *   entity-type  — required; e.g. "Invoice"
 *   loading-text — optional; shown while `isLoading` (default "Loading…")
 *   empty-text   — optional; shown when list is empty (default "No items.")
 *
 * Events dispatched:
 *   entity-list-loaded  — CustomEvent<{ items: unknown[] }> after first load
 *   entity-list-error   — CustomEvent<{ message: string }> on fetch error
 *
 * Usage (imperative configuration):
 *
 * ```html
 * <entity-list id="invoices"></entity-list>
 * <script type="module">
 *   const el = document.querySelector("#invoices");
 *   el.configure({
 *     queryKey: ["invoices"],
 *     fetch: (p) => fetch("/api/invoices").then(r => r.json()),
 *     normalize: (raw) => ({ id: raw.id, data: raw }),
 *   });
 * </script>
 * ```
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { EntityListController } from "./entity-list-controller.js";
import type { EntityListControllerOptions } from "./types.js";
import type { EntityType } from "@prometheus-ags/entity-graph-core";

// ── <entity-list> ──────────────────────────────────────────────────────────

@customElement("entity-list")
export class EntityListElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .entity-list__status {
      padding: 0.5rem;
      color: inherit;
      opacity: 0.7;
    }
    .entity-list__error {
      color: var(--entity-list-error-color, #c00);
    }
  `;

  @property({ attribute: "entity-type" })
  entityType: EntityType = "";

  @property({ attribute: "loading-text" })
  loadingText = "Loading…";

  @property({ attribute: "empty-text" })
  emptyText = "No items.";

  @state()
  private _configured = false;

  #controller: EntityListController<unknown, Record<string, unknown>> | null =
    null;

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Wire the list controller. Must be called once after element is connected.
   * Safe to call before connection — the controller will be initialised on
   * `hostConnected`.
   */
  configure<TRaw, TEntity extends object>(
    opts: EntityListControllerOptions<TRaw, TEntity>
  ): void {
    if (this.#controller) {
      // Tear down previous controller (unsubscribes from graph).
      this.#controller.hostDisconnected();
    }
    this.#controller = new EntityListController<TRaw, TEntity>(
      this,
      this.entityType,
      opts
    ) as EntityListController<unknown, Record<string, unknown>>;
    this._configured = true;
  }

  /**
   * Trigger a full refetch.
   */
  refetch(): void {
    this.#controller?.refetch();
  }

  /**
   * Fetch the next page.
   */
  loadMore(): void {
    this.#controller?.loadMore();
  }

  // ── Getters ────────────────────────────────────────────────────────────

  get items(): Record<string, unknown>[] {
    return this.#controller?.items ?? [];
  }

  get isLoading(): boolean {
    return this.#controller?.isLoading ?? false;
  }

  get hasNextPage(): boolean {
    return this.#controller?.hasNextPage ?? false;
  }

  get total(): number | null {
    return this.#controller?.total ?? null;
  }

  // ── Render ─────────────────────────────────────────────────────────────

  override render() {
    if (!this._configured || !this.#controller) {
      return nothing;
    }

    const { isLoading, error, items, hasNextPage } = this.#controller;

    if (error) {
      return html`
        <div class="entity-list__status entity-list__error" role="alert">
          ${error}
        </div>
        <slot name="error"></slot>
      `;
    }

    if (isLoading && items.length === 0) {
      return html`
        <div class="entity-list__status" aria-live="polite" aria-busy="true">
          ${this.loadingText}
        </div>
        <slot name="loading"></slot>
      `;
    }

    if (!isLoading && items.length === 0) {
      return html`
        <div class="entity-list__status">${this.emptyText}</div>
        <slot name="empty"></slot>
      `;
    }

    // Dispatch loaded event on first successful render.
    this.dispatchEvent(
      new CustomEvent("entity-list-loaded", {
        detail: { items },
        bubbles: true,
        composed: true,
      })
    );

    return html`
      <slot></slot>
      ${hasNextPage
        ? html`<slot name="load-more"></slot>`
        : nothing}
    `;
  }

  override updated() {
    const ctrl = this.#controller;
    if (ctrl?.error) {
      this.dispatchEvent(
        new CustomEvent("entity-list-error", {
          detail: { message: ctrl.error },
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-list": EntityListElement;
  }
}
