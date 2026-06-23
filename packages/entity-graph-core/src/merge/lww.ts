/**
 * merge/lww.ts — Last-write-wins default strategy.
 *
 * Semantics match the historical `upsertEntity` behavior exactly: shallow-merge
 * the incoming write over the previous value. This is the fallback when no
 * other strategy is registered, so registering nothing is a no-op change.
 */

import type { MergeStrategy } from "./types";

/**
 * Shallow-merge `next` over `prev` (incoming keys win). Returns a new object.
 * On first write (`prev` undefined) returns a shallow copy of `next`.
 */
export const lwwStrategy: MergeStrategy = (prev, next) => {
  return prev ? { ...prev, ...next } : { ...next };
};
