/**
 * EntityFormController — Lit 3 ReactiveController for create/edit forms.
 *
 * Extends `EntityDetailController` with an isolated edit buffer that is
 * React component state-equivalent: while editing, the original graph data
 * remains visible to other subscribers. Only after `save()` succeeds does
 * the graph update (via the caller-supplied `onSave` callback which should
 * call `upsertEntity` / `replaceEntity`).
 *
 * Architecture: controller → core engine functions; edit buffer is local state
 * NEVER written to the graph until `onSave` succeeds.
 */

import type { ReactiveControllerHost } from "lit";
import {
  useGraphStore,
} from "@prometheus-ags/entity-graph-core";
import type { EntityId } from "@prometheus-ags/entity-graph-core";
import { EntityDetailController } from "./entity-detail-controller.js";
import type { EntityFormControllerOptions } from "./types.js";

// ── EntityFormController ───────────────────────────────────────────────────

/**
 * Lit 3 ReactiveController for entity create/edit/delete forms.
 *
 * Provides:
 * - `editBuffer` — isolated local copy of the entity while editing
 * - `isDirty` — true when `editBuffer` differs from the graph entity
 * - `isSaving` — true while `save()` is in flight
 * - `saveError` — string from the last failed save
 * - `setField(key, value)` — update one field in the buffer
 * - `save()` — call `onSave(editBuffer)` then sync graph on success
 * - `reset()` — discard buffer and re-sync from graph
 * - `deleteEntity()` — call `onDelete(id)`
 *
 * ```ts
 * class InvoiceForm extends LitElement {
 *   readonly #form = new EntityFormController<RawInvoice, Invoice>(this, "Invoice", {
 *     id: "inv-1",
 *     fetch: (id) => api.getInvoice(id),
 *     normalize: (raw) => raw,
 *     onSave: async (buf) => {
 *       const updated = await api.updateInvoice(buf);
 *       useGraphStore.getState().upsertEntity("Invoice", updated.id, updated);
 *     },
 *     onDelete: async (id) => {
 *       await api.deleteInvoice(id);
 *       useGraphStore.getState().removeEntity("Invoice", id);
 *       useGraphStore.getState().removeIdFromAllLists("Invoice", id);
 *     },
 *   });
 *
 *   render() {
 *     const buf = this.#form.editBuffer;
 *     return html`
 *       <input value=${buf?.title ?? ""} @input=${(e) => this.#form.setField("title", e.target.value)} />
 *       <button @click=${() => this.#form.save()} ?disabled=${this.#form.isSaving}>Save</button>
 *     `;
 *   }
 * }
 * ```
 */
export class EntityFormController<TRaw, TEntity extends object>
  extends EntityDetailController<TRaw, TEntity>
{
  // ── Public reactive form state ────────────────────────────────────────────
  editBuffer: Partial<TEntity> = {};
  isDirty = false;
  isSaving = false;
  saveError: string | null = null;

  // ── Private ──────────────────────────────────────────────────────────────
  readonly #formOpts: EntityFormControllerOptions<TRaw, TEntity>;
  readonly #host: ReactiveControllerHost;

  constructor(
    host: ReactiveControllerHost,
    type: string,
    opts: EntityFormControllerOptions<TRaw, TEntity> & {
      id: EntityId | null | undefined;
    }
  ) {
    super(host, type, opts);
    this.#host = host;
    this.#formOpts = opts;
  }

  // ── Override: sync also resets the edit buffer when not dirty ─────────────

  /**
   * After the graph syncs (entity loads/updates), populate the edit buffer
   * only when the user has not started editing. This preserves in-flight edits
   * across background revalidations.
   */
  override hostConnected(): void {
    super.hostConnected();
    // Populate buffer from initial graph state once entity is available.
    if (this.entity && !this.isDirty) {
      this.editBuffer = { ...this.entity } as Partial<TEntity>;
    }
  }

  // ── Public API ────────────────────────────────────────────────────────────

  /**
   * Update a single field in the edit buffer.
   * Sets `isDirty = true` and requests a host re-render.
   */
  setField<K extends keyof TEntity>(key: K, value: TEntity[K]): void {
    this.editBuffer = { ...this.editBuffer, [key]: value };
    this.isDirty = true;
    this.#host.requestUpdate();
  }

  /**
   * Bulk-update the edit buffer (e.g. from a form reset or template apply).
   */
  setFields(partial: Partial<TEntity>): void {
    this.editBuffer = { ...this.editBuffer, ...partial };
    this.isDirty = true;
    this.#host.requestUpdate();
  }

  /**
   * Discard the edit buffer and repopulate from the current graph entity.
   */
  reset(): void {
    this.editBuffer = this.entity ? ({ ...this.entity } as Partial<TEntity>) : {};
    this.isDirty = false;
    this.saveError = null;
    this.#host.requestUpdate();
  }

  /**
   * Persist `editBuffer` via `onSave`. Sets `isSaving` during the call.
   * On success: clears `isDirty` / `saveError`. On failure: sets `saveError`.
   * Does NOT write to the graph itself — that is the responsibility of `onSave`.
   */
  async save(): Promise<void> {
    const { onSave } = this.#formOpts;
    if (!onSave) return;
    this.isSaving = true;
    this.saveError = null;
    this.#host.requestUpdate();
    try {
      await onSave(this.editBuffer);
      this.isDirty = false;
    } catch (err: unknown) {
      this.saveError =
        err instanceof Error ? err.message : String(err);
    } finally {
      this.isSaving = false;
      this.#host.requestUpdate();
    }
  }

  /**
   * Delete the entity via `onDelete`. No-op when no id or `onDelete` handler.
   */
  async deleteEntity(): Promise<void> {
    const { onDelete } = this.#formOpts;
    const id = this.entity
      ? (this.entity as Record<string, unknown>)["id"] as EntityId | undefined
      : undefined;
    if (!id || !onDelete) return;

    this.isSaving = true;
    this.saveError = null;
    this.#host.requestUpdate();
    try {
      await onDelete(id);
      this.isDirty = false;
    } catch (err: unknown) {
      this.saveError =
        err instanceof Error ? err.message : String(err);
    } finally {
      this.isSaving = false;
      this.#host.requestUpdate();
    }
  }

  /**
   * Initialize the edit buffer from the current entity (called after first load
   * completes). No-op if the user already started editing.
   */
  initBuffer(): void {
    if (!this.isDirty && this.entity) {
      this.editBuffer = { ...this.entity } as Partial<TEntity>;
      this.#host.requestUpdate();
    }
  }
}
