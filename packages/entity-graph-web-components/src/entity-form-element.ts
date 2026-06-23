/**
 * <entity-form> — Lit 3 custom element built on EntityFormController.
 *
 * A form element that maintains an isolated edit buffer. Reads the entity from
 * the graph, exposes an `editBuffer` for two-way binding, and dispatches events
 * on save / delete. The consumer retains full control over persistence via the
 * `onSave` / `onDelete` callbacks passed to `configure()`.
 *
 * Attributes:
 *   entity-type    — required
 *   entity-id      — required for edit mode; omit for create mode
 *   loading-text   — optional
 *   saving-text    — optional (shown while save is in flight)
 *
 * Events dispatched:
 *   entity-form-saved    — CustomEvent<{ buffer: Partial<TEntity> }> on success
 *   entity-form-deleted  — CustomEvent<{}> on delete success
 *   entity-form-error    — CustomEvent<{ message: string }> on save/delete error
 *   entity-form-dirty    — CustomEvent<{ isDirty: boolean }> when isDirty changes
 *
 * Usage:
 *
 * ```html
 * <entity-form entity-type="Invoice" entity-id="inv-1" id="form"></entity-form>
 * <script type="module">
 *   const el = document.querySelector("#form");
 *   el.configure({
 *     fetch: (id) => fetch(`/api/invoices/${id}`).then(r => r.json()),
 *     normalize: (raw) => raw,
 *     onSave: async (buf) => {
 *       const saved = await fetch(`/api/invoices/${buf.id}`, {
 *         method: "PUT",
 *         body: JSON.stringify(buf),
 *       }).then(r => r.json());
 *       // caller is responsible for updating the graph
 *       import("@prometheus-ags/entity-graph-core").then(({ useGraphStore }) => {
 *         useGraphStore.getState().upsertEntity("Invoice", saved.id, saved);
 *       });
 *     },
 *   });
 * </script>
 * ```
 */

import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { EntityFormController } from "./entity-form-controller.js";
import type { EntityFormControllerOptions } from "./types.js";
import type { EntityType, EntityId } from "@prometheus-ags/entity-graph-core";

// ── <entity-form> ──────────────────────────────────────────────────────────

@customElement("entity-form")
export class EntityFormElement extends LitElement {
  static override styles = css`
    :host {
      display: block;
    }
    .entity-form__status {
      padding: 0.5rem;
      opacity: 0.7;
    }
    .entity-form__error {
      color: var(--entity-form-error-color, #c00);
    }
    .entity-form__saving {
      opacity: 0.6;
      pointer-events: none;
    }
  `;

  @property({ attribute: "entity-type" })
  entityType: EntityType = "";

  @property({ attribute: "entity-id" })
  entityId: EntityId = "";

  @property({ attribute: "loading-text" })
  loadingText = "Loading…";

  @property({ attribute: "saving-text" })
  savingText = "Saving…";

  @state()
  private _configured = false;

  #controller: EntityFormController<unknown, Record<string, unknown>> | null =
    null;

  // ── Attribute → controller bridge ──────────────────────────────────────

  override attributeChangedCallback(
    name: string,
    oldVal: string | null,
    newVal: string | null
  ): void {
    super.attributeChangedCallback(name, oldVal, newVal);
    if (name === "entity-id" && oldVal !== newVal && this.#controller) {
      this.#controller.setId(newVal ?? undefined);
      this.#controller.reset();
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────

  /**
   * Wire the form controller. Must be called once.
   */
  configure<TRaw, TEntity extends object>(
    opts: EntityFormControllerOptions<TRaw, TEntity> & {
      id?: EntityId | null;
    }
  ): void {
    if (this.#controller) {
      this.#controller.hostDisconnected();
    }
    this.#controller = new EntityFormController<TRaw, TEntity>(
      this,
      this.entityType,
      {
        ...opts,
        id: opts.id ?? this.entityId ?? undefined,
      }
    ) as EntityFormController<unknown, Record<string, unknown>>;
    this._configured = true;
  }

  /**
   * Update a single field in the edit buffer.
   */
  setField(key: string, value: unknown): void {
    this.#controller?.setField(
      key as keyof Record<string, unknown>,
      value as Record<string, unknown>[keyof Record<string, unknown>]
    );
  }

  /**
   * Persist the edit buffer via `onSave`.
   */
  async save(): Promise<void> {
    const ctrl = this.#controller;
    if (!ctrl) return;
    await ctrl.save();
    if (!ctrl.saveError) {
      this.dispatchEvent(
        new CustomEvent("entity-form-saved", {
          detail: { buffer: ctrl.editBuffer },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("entity-form-error", {
          detail: { message: ctrl.saveError },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Delete the entity via `onDelete`.
   */
  async deleteEntity(): Promise<void> {
    const ctrl = this.#controller;
    if (!ctrl) return;
    await ctrl.deleteEntity();
    if (!ctrl.saveError) {
      this.dispatchEvent(
        new CustomEvent("entity-form-deleted", {
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent("entity-form-error", {
          detail: { message: ctrl.saveError },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  /**
   * Discard edits and reset to the current graph entity.
   */
  reset(): void {
    const wasDirty = this.#controller?.isDirty ?? false;
    this.#controller?.reset();
    if (wasDirty) {
      this.dispatchEvent(
        new CustomEvent("entity-form-dirty", {
          detail: { isDirty: false },
          bubbles: true,
          composed: true,
        })
      );
    }
  }

  // ── Getters ────────────────────────────────────────────────────────────

  get editBuffer(): Record<string, unknown> {
    return (this.#controller?.editBuffer as Record<string, unknown>) ?? {};
  }

  get isDirty(): boolean {
    return this.#controller?.isDirty ?? false;
  }

  get isSaving(): boolean {
    return this.#controller?.isSaving ?? false;
  }

  get saveError(): string | null {
    return this.#controller?.saveError ?? null;
  }

  // ── Render ─────────────────────────────────────────────────────────────

  override render() {
    if (!this._configured || !this.#controller) {
      return nothing;
    }

    const { isLoading, entity, isSaving, saveError } = this.#controller;

    if (saveError) {
      // Render slot so consumers can show inline errors alongside the form.
    }

    if (isLoading && !entity) {
      return html`
        <div class="entity-form__status" aria-live="polite" aria-busy="true">
          ${this.loadingText}
        </div>
        <slot name="loading"></slot>
      `;
    }

    if (isSaving) {
      return html`
        <div class="entity-form__saving">
          <div class="entity-form__status" aria-live="polite" aria-busy="true">
            ${this.savingText}
          </div>
          <slot></slot>
        </div>
        ${saveError
          ? html`<div class="entity-form__error" role="alert">${saveError}</div>`
          : nothing}
      `;
    }

    return html`
      <slot></slot>
      ${saveError
        ? html`<div class="entity-form__error" role="alert">${saveError}</div>`
        : nothing}
      <slot name="actions"></slot>
    `;
  }

  override updated(changed: Map<string, unknown>) {
    super.updated(changed);
    const ctrl = this.#controller;
    if (!ctrl) return;
    // Notify consumers when dirty state changes.
    if (changed.has("_configured")) return;
    this.dispatchEvent(
      new CustomEvent("entity-form-dirty", {
        detail: { isDirty: ctrl.isDirty },
        bubbles: true,
        composed: true,
      })
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "entity-form": EntityFormElement;
  }
}
