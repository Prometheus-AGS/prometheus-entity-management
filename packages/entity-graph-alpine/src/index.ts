/**
 * @prometheus-ags/entity-graph-alpine
 *
 * Alpine.js plugin for the Prometheus normalized entity graph.
 *
 * Public surface:
 * - `EntityGraphAlpinePlugin`  — pass directly to `Alpine.plugin()`
 * - `createEntityGraphPlugin`  — factory that accepts options before registration
 *
 * Internal binding factories (exported for advanced / testing use):
 * - `createEntityBinding`      — creates a single-entity reactive snapshot
 * - `createListBinding`        — creates a list reactive snapshot
 *
 * Types (for TypeScript consumers):
 * - `AlpineEntitySnapshot<T>`  — return type of `$entity(type, id)`
 * - `AlpineEntityList<T>`      — return type of `$entityList(type, query)`
 * - `AlpineListQuery`          — query options for `$entityList`
 * - `EntityGraphAlpinePluginOptions` — options for `createEntityGraphPlugin`
 */

// ── Plugin ────────────────────────────────────────────────────────────────────
export { EntityGraphAlpinePlugin, createEntityGraphPlugin } from "./plugin.js";

// ── Binding factories (advanced / testing) ────────────────────────────────────
export { createEntityBinding } from "./entity-binding.js";
export type { EntityBindingOptions } from "./entity-binding.js";

export { createListBinding } from "./list-binding.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  AlpineEntitySnapshot,
  AlpineEntityList,
  AlpineListQuery,
  EntityGraphAlpinePluginOptions,
  EntityType,
  EntityId,
} from "./types.js";
