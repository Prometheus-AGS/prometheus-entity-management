/**
 * Svelte app bootstrap helpers.
 *
 * Call `initEntityGraph()` once at the root of your Svelte app (e.g. in
 * `+layout.svelte` or `App.svelte`) to configure the engine and attach
 * global focus/reconnect listeners that trigger SWR revalidation.
 *
 * This is a thin facade over the core engine's public API — no logic is
 * reimplemented here.
 */

import {
  configureEngine,
  attachGlobalListeners,
} from "@prometheus-ags/entity-graph-core";
import type { EngineOptions } from "@prometheus-ags/entity-graph-core";

export interface InitEntityGraphOptions extends EngineOptions {
  /** Attach window focus/reconnect listeners for SWR revalidation (default: true). */
  globalListeners?: boolean;
}

/**
 * Bootstrap the entity graph engine for a Svelte application.
 *
 * ```ts
 * // +layout.svelte or App.svelte
 * import { initEntityGraph } from "@prometheus-ags/entity-graph-svelte";
 *
 * initEntityGraph({ defaultStaleTime: 60_000, globalListeners: true });
 * ```
 */
export function initEntityGraph(opts: InitEntityGraphOptions = {}): void {
  const { globalListeners = true, ...engineOpts } = opts;
  if (Object.keys(engineOpts).length > 0) {
    configureEngine(engineOpts);
  }
  if (globalListeners) {
    attachGlobalListeners();
  }
}
