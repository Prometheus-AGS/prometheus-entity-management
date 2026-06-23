/**
 * @prometheus-ags/entity-graph-solid
 *
 * SolidJS bindings for the normalized entity graph.
 *
 * Architecture:
 *   Component (SolidJS) → createEntity / createEntityList (this package, Layer 2)
 *     → core engine fetchEntity / fetchList (Layer 1)
 *       → useGraphStore (Layer 0 / Zustand)
 *
 * This package only contains the SolidJS reactive layer. All entity data
 * lives in @prometheus-ags/entity-graph-core — never re-implemented here.
 */

// ── Core SolidJS primitives ───────────────────────────────────────────────────
export { createEntity } from "./create-entity";
export { createEntityList } from "./create-entity-list";
export { createGraphStore } from "./create-graph-store";

// ── Application setup ─────────────────────────────────────────────────────────
export { setupGraphProvider } from "./graph-provider";
export type { GraphProviderOptions } from "./graph-provider";

// ── Option + return types (re-exported for consumer convenience) ──────────────
export type {
  CreateEntityOptions,
  CreateEntityReturn,
  CreateEntityListOptions,
  CreateEntityListReturn,
} from "./types";

// ── Re-export commonly needed core types so consumers need only one import ────
export type {
  EntityType,
  EntityId,
  EntityState,
  ListState,
  EntityError,
  FilterSpec,
  SortSpec,
  ViewDescriptor,
} from "@prometheus-ags/entity-graph-core";

export {
  TerminalError,
  TransientError,
  useGraphStore,
} from "@prometheus-ags/entity-graph-core";
