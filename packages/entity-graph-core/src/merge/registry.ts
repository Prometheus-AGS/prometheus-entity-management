/**
 * merge/registry.ts — One MergeStrategy per entity type (+ optional global default).
 *
 * Lookup order at write time:
 *   1. strategy registered for the exact `type`
 *   2. global default strategy (if one was set)
 *   3. built-in LWW (`lwwStrategy`)
 *
 * Step 3 guarantees that with zero registrations the graph behaves exactly as
 * it did before this seam existed.
 */

import type { MergeStrategy } from "./types";
import { lwwStrategy } from "./lww";

const byType = new Map<string, MergeStrategy>();
let globalDefault: MergeStrategy | null = null;

/**
 * Register a {@link MergeStrategy} for one entity type. Overwrites any prior
 * registration for that type.
 */
export function registerMergeStrategy(type: string, strategy: MergeStrategy): void {
  byType.set(type, strategy);
}

/**
 * Set the fallback strategy used for any type without its own registration.
 * Pass `null` to clear it (reverting the fallback to built-in LWW).
 */
export function setDefaultMergeStrategy(strategy: MergeStrategy | null): void {
  globalDefault = strategy;
}

/**
 * Resolve the effective strategy for a type: per-type → global default → LWW.
 * Always returns a usable strategy (never null).
 */
export function getMergeStrategy(type: string): MergeStrategy {
  return byType.get(type) ?? globalDefault ?? lwwStrategy;
}

/** True if `type` (or a global default) has a non-LWW strategy registered. */
export function hasMergeStrategy(type: string): boolean {
  return byType.has(type) || globalDefault !== null;
}

/** @internal Test-only. NOT re-exported from index.ts. */
export function __resetMergeStrategies(): void {
  byType.clear();
  globalDefault = null;
}
