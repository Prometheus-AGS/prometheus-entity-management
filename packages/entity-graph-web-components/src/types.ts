/**
 * Shared types for `@prometheus-ags/entity-graph-web-components`.
 *
 * These are the public shapes consumed by (or emitted from) the three
 * custom elements: <entity-list>, <entity-detail>, <entity-form>.
 */

import type {
  EntityType,
  EntityId,
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
  ListState,
} from "@prometheus-ags/entity-graph-core";

// ── Controller option shapes ───────────────────────────────────────────────

/**
 * Options for `EntityDetailController` — mirrors `EntityQueryOptions` minus
 * the structural keys that the controller fills in from element attributes.
 */
export interface EntityDetailControllerOptions<TRaw, TEntity extends object>
  extends Omit<EntityQueryOptions<TRaw, TEntity>, "type" | "id"> {
  /** Whether to fire the initial fetch (default: true). */
  enabled?: boolean;
  /** Staleness threshold in ms (defaults to engine global). */
  staleTime?: number;
}

/**
 * Options for `EntityListController` — mirrors `ListQueryOptions` minus `type`.
 */
export interface EntityListControllerOptions<TRaw, TEntity extends object>
  extends Omit<ListQueryOptions<TRaw, TEntity>, "type"> {
  /** Whether to fire the initial fetch (default: true). */
  enabled?: boolean;
  /** Staleness threshold in ms (defaults to engine global). */
  staleTime?: number;
}

/**
 * Options for `EntityFormController` — wraps `EntityDetailControllerOptions`
 * with create/update/delete callbacks.
 */
export interface EntityFormControllerOptions<TRaw, TEntity extends object>
  extends EntityDetailControllerOptions<TRaw, TEntity> {
  /**
   * Called when the form submits with the edited buffer.
   * Responsible for persisting and calling `upsertEntity` / `replaceEntity`
   * on the graph after success.
   */
  onSave?: (entity: Partial<TEntity>) => Promise<void> | void;
  /**
   * Called when the element requests deletion.
   * Responsible for calling `removeEntity` and `removeIdFromAllLists` on success.
   */
  onDelete?: (id: EntityId) => Promise<void> | void;
}

// ── Public re-exports from core (convenience) ─────────────────────────────

export type {
  EntityType,
  EntityId,
  ListState,
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
};
