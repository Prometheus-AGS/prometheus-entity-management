/**
 * @prometheus-ags/entity-graph-web-components
 *
 * Lit 3 custom elements built on the Prometheus entity graph.
 *
 * Custom elements (auto-registered on import):
 *   <entity-list>    — reactive list with load-more; graph-subscribed via EntityListController
 *   <entity-detail>  — reactive single-entity view; graph-subscribed via EntityDetailController
 *   <entity-form>    — reactive create/edit form with isolated edit buffer; EntityFormController
 *
 * ReactiveControllers (low-level, for use inside your own Lit elements):
 *   EntityListController
 *   EntityDetailController
 *   EntityFormController
 *
 * All graph I/O is delegated to `@prometheus-ags/entity-graph-core`.
 * This package only wires Lit 3 reactivity on top of the core store.
 */

// ── ReactiveControllers ────────────────────────────────────────────────────
export { EntityListController } from "./entity-list-controller.js";
export { EntityDetailController } from "./entity-detail-controller.js";
export { EntityFormController } from "./entity-form-controller.js";

// ── Custom elements (side-effectful registration) ─────────────────────────
export { EntityListElement } from "./entity-list-element.js";
export { EntityDetailElement } from "./entity-detail-element.js";
export { EntityFormElement } from "./entity-form-element.js";

// ── Types ─────────────────────────────────────────────────────────────────
export type {
  EntityDetailControllerOptions,
  EntityListControllerOptions,
  EntityFormControllerOptions,
  EntityType,
  EntityId,
  ListState,
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
} from "./types.js";
