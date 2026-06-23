/**
 * <entity-detail> — Lit 3 custom element built on EntityDetailController.
 *
 * Displays a single entity fetched from the graph. Exposes loading / error
 * states via attributes and fires events; renders via the default slot so
 * consumers can project arbitrary markup.
 *
 * Attributes:
 *   entity-type  — required; e.g. "Invoice"
 *   entity-id    — required; primary key of the entity to display
 *   loading-text — optional (default "Loading…")
 *   not-found-text — optional (default "Not found.")
 *
 * Events dispatched:
 *   entity-loaded    — CustomEvent<{ entity: unknown }> when entity arrives
 *   entity-not-found — CustomEvent<{}> when entity is null after load
 *   entity-error     — CustomEvent<{ message: string }> on fetch error
 *
 * Usage:
 *
 * ```html
 * <entity-detail entity-type="Invoice" entity-id="inv-1" id="detail">
 *   <template><!-- projected markup goes here --></template>
 * </entity-detail>
 * <script type="module">
 *   document.querySelector("#detail").configure({
 *     fetch: (id) => fetch(`/api/invoices/${id}`).then(r => r.json()),
 *     normalize: (raw) => raw,
 *   });
 * </script>
 * ```
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { EntityDetailController } from "./entity-detail-controller.js";
import type { EntityDetailControllerOptions } from "./types.js";
import type { EntityType, EntityId } from "@prometheus-ags/entity-graph-core";

// ── <entity-detail> ────────────────────────────────────────────────────────

@customElement("entity-detail")
export class EntityDetailElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .entity-detail__status {
      padding: 0.5rem;
      opacity: 0.7;
    }
    .entity-detail__error {
      color: var(--entity-detail-error-color, #c00);
    }
  `;

  @property({ attribute: "entity-type" })
  entityType: EntityType = "";

  @property({ attribute: "entity-id" })
  entityId: EntityId = "";

  @property({ attribute: "loading-text" })
  loadingText = "Loading…";

  @property({ attribute: "not-found-text" })
  notFoundText = "Not found.";

  @state()
  private _configured = false;

  #controller: EntityDetailController<unknown, Record<string, unknown>> | null =
    null;

  // ── Attribute → controller bridge ───────────────────────────────────────

  override attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === "entity-id" && oldVal !== newVal && this.#controller) {
      this.#controller.setId(newVal ?? undefined);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Wire the detail controller. Must be called once.
   */
  configure<TRaw, TEntity extends object>(
    opts: EntityDetailControllerOptions<TRaw, TEntity> & {
      id?: EntityId | null;
    }
  ): void {
    if (this.#controller) {
      this.#controller.hostDisconnected();
    }
    this.#controller = new EntityDetailController<TRaw, TEntity>(this, this.entityType, {
      ...opts,
      id: opts.id ?? this.entityId ?? undefined,
    }) as EntityDetailController<unknown, Record<string, unknown>>;
    this._configured = true;
  }

  refetch(): void {
    this.#controller?.refetch();
  }

  // ── Getters ────────────────────────────────────────────────────────────

  get entity(): Record<string, unknown> | null {
    return this.#controller?.entity ?? null;
  }

  get isLoading(): boolean {
    return this.#controller?.isLoading ?? false;
  }

  // ── Render ─────────────────────────────────────────────────────────────

  override render() {
    if (!this._configured || !this.#controller) {
      return nothing;
    }

    const { isLoading, error, entity } = this.#controller;

    if (error) {
      return html`
        <div class="entity-detail__status entity-detail__error" role="alert">
          ${error}
        </div>
        <slot name="error"></slot>
      `;
    }

    if (isLoading && !entity) {
      return html`
        <div class="entity-detail__status" aria-live="polite" aria-busy="true">
          ${this.loadingText}
        </div>
        <slot name="loading"></slot>
      `;
    }

    if (!isLoading && !entity) {
      return html`
        <div class="entity-detail__status">${this.notFoundText}</div>
        <slot name="not-found"></slot>
      `;
    }

    return html`<slot></slot>`;
  }

  override updated() {
    const ctrl = this.#controller;
    if (!ctrl) return;

    if (ctrl.error) {
      this.dispatchEvent(
        new CustomEvent("entity-error", {
          detail: { message: ctrl.error },
          bubbles: true,
          composed: true,
        })
      );
    } else if (ctrl.entity) {
      this.dispatchEvent(
        new CustomEvent("entity-loaded", {
          detail: { entity: ctrl.entity },
          bubbles: true,
          composed: true,
        })
      );
    } else if (!ctrl.isLoading) {
      this.dispatchEvent(
        new CustomEvent("entity-not-found", {
          bubbles: true,
          composed: true,
        })
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-detail": EntityDetailElement;
  }
}
