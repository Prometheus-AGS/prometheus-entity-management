/**
 * @prometheus-ags/entity-graph-svelte
 *
 * Svelte 5 runes bindings for the Prometheus entity graph.
 *
 * Public surface:
 * - `createEntityStore` — reactive single-entity store (CANARY for core API surface)
 * - `createEntityList`  — reactive list store with load-more support
 * - `initEntityGraph`   — bootstrap helper (engine config + global listeners)
 *
 * All graph I/O is delegated to `@prometheus-ags/entity-graph-core`. This
 * package only wires Svelte 5 reactivity on top of the core store.
 */

// ── Core bindings ──────────────────────────────────────────────────────────
export { createEntityStore } from "./create-entity-store.js";
export type { CreateEntityStoreOptions } from "./create-entity-store.js";

export { createEntityList } from "./create-entity-list.js";
export type { CreateEntityListOptions } from "./create-entity-list.js";

// ── Bootstrap ──────────────────────────────────────────────────────────────
export { initEntityGraph } from "./graph-config.js";
export type { InitEntityGraphOptions } from "./graph-config.js";

// ── Re-exported types from core (convenience — avoids double imports) ──────
export type {
  EntityStore,
  EntityList,
  EntityType,
  EntityId,
  EntityQueryOptions,
  ListQueryOptions,
  ListFetchParams,
  ListState,
} from "./types.js";
