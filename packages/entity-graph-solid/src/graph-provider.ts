/**
 * GraphProvider utilities for SolidJS.
 *
 * Provides boot-time setup helpers for attaching global focus/reconnect
 * listeners and configuring the engine from within a SolidJS application root.
 *
 * Usage in the application root (e.g. `src/index.tsx`):
 *
 * ```ts
 * import { setupGraphProvider } from "@prometheus-ags/entity-graph-solid";
 * import { configureEngine, attachGlobalListeners } from "@prometheus-ags/entity-graph-core";
 *
 * setupGraphProvider({
 *   staleTime: 60_000,
 *   revalidateOnFocus: true,
 * });
 * ```
 */

import {
  configureEngine,
  attachGlobalListeners,
  startGarbageCollector,
} from "@prometheus-ags/entity-graph-core";
import type { EngineOptions } from "@prometheus-ags/entity-graph-core";

export interface GraphProviderOptions extends EngineOptions {
  /**
   * Whether to attach window focus/online listeners for stale-while-revalidate.
   * Defaults to `true` in browser environments.
   */
  attachListeners?: boolean;
  /**
   * Whether to start the periodic garbage collector.
   * Defaults to `true`.
   */
  startGc?: boolean;
}

/**
 * Configures the entity-graph engine and wires browser-level listeners.
 * Call this once at application startup before mounting the root component.
 *
 * Returns a cleanup function that stops the GC interval (useful for tests).
 */
export function setupGraphProvider(opts: GraphProviderOptions = {}): () => void {
  const { attachListeners = true, startGc = true, ...engineOpts } = opts;

  if (Object.keys(engineOpts).length > 0) {
    configureEngine(engineOpts);
  }

  if (attachListeners && typeof window !== "undefined") {
    attachGlobalListeners();
  }

  let stopGc: (() => void) | undefined;
  if (startGc && typeof window !== "undefined") {
    stopGc = startGarbageCollector();
  }

  return () => stopGc?.();
}
