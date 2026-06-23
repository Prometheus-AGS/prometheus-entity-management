/**
 * merge/ — Pluggable conflict-resolution seam for the entity graph.
 *
 * Public surface:
 * - `registerMergeStrategy(type, strategy)` / `setDefaultMergeStrategy(strategy)`
 * - `getMergeStrategy(type)` / `hasMergeStrategy(type)`
 * - `lwwStrategy` (built-in default)
 * - `createLoroMergeStrategy()` (optional CRDT, lazy `loro-crdt` import)
 */

export type { MergeStrategy, MergeContext } from "./types";
export { lwwStrategy } from "./lww";
export {
  registerMergeStrategy,
  setDefaultMergeStrategy,
  getMergeStrategy,
  hasMergeStrategy,
} from "./registry";
export { createLoroMergeStrategy } from "./loro";
