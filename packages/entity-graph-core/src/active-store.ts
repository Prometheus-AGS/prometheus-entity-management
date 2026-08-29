/**
 * Active-graph resolution for imperative (non-hook) access.
 *
 * `GraphStoreProvider` scopes the React *hook* surface, but imperative callers —
 * Zustand store actions, module-level helpers, mutation callbacks — have no
 * React context to read. Before this module they had no way to reach a scoped
 * graph at all, so a mounted provider silently failed to isolate them.
 *
 * Two independent mechanisms, both opt-in, both falling back to the package
 * singleton so existing consumers are unaffected:
 *
 * 1. `setActiveGraphStore(store)` — a module-level active store. Correct in the
 *    browser, where there is exactly one application tree. `GraphStoreProvider`
 *    sets it on mount and restores the previous value on unmount.
 *
 * 2. `runWithGraphStore(store, fn)` — an `AsyncLocalStorage` scope. Required on
 *    the server, where concurrent requests interleave and a module-level value
 *    would leak across them.
 *
 * ALS takes precedence: if a request scope is active it always wins over the
 * module-level value, because a server render must never observe another
 * request's graph.
 *
 * ## Why `node:async_hooks` is loaded lazily
 *
 * This package is bundled for the browser as well as Node. A static
 * `import "node:async_hooks"` would break browser builds and pull a polyfill
 * into client bundles. The import is therefore attempted once, at first use of
 * `runWithGraphStore`, and failure degrades to the module-level mechanism
 * rather than throwing.
 */

import type { GraphStore } from "./graph";

/**
 * Declared locally rather than pulling in `@types/node`: this package targets
 * the browser too, and these are only touched behind the `typeof` guards below.
 * Mirrors how `entity-graph-react` declares `process` for its NODE_ENV check.
 */
declare const process: { versions?: { node?: string } } | undefined;
declare const module: { require?: (id: string) => unknown } | undefined;
declare const require: ((id: string) => unknown) | undefined;

/** Minimal shape we need; avoids a type dependency on `node:async_hooks`. */
interface AsyncStore<T> {
  getStore(): T | undefined;
  run<R>(store: T, fn: () => R): R;
}

let moduleActiveStore: GraphStore | null = null;
let asyncScope: AsyncStore<GraphStore> | null = null;
let asyncScopeAttempted = false;

/** True when the runtime looks like Node (and so may have `node:async_hooks`). */
function isNodeLike(): boolean {
  return (
    typeof process !== "undefined" &&
    typeof (process as { versions?: { node?: string } }).versions?.node === "string"
  );
}

/**
 * Load `AsyncLocalStorage` if this runtime has it.
 *
 * Returns `null` in the browser (and in any runtime without `node:async_hooks`),
 * which is the signal to fall back to the module-level store.
 */
function resolveAsyncScope(): AsyncStore<GraphStore> | null {
  if (asyncScopeAttempted) return asyncScope;
  asyncScopeAttempted = true;
  if (!isNodeLike()) return null;
  try {
    // Indirect require so bundlers do not statically resolve it into browser
    // builds. Present under CJS; absent under pure ESM, where `prepareGraphStoreScope()`
    // must be awaited once at startup instead.
    const req =
      typeof module !== "undefined" && typeof module.require === "function"
        ? module.require
        : typeof require === "function"
          ? require
          : null;
    if (!req) return null;
    const { AsyncLocalStorage } = req("node:async_hooks") as {
      AsyncLocalStorage: new () => AsyncStore<GraphStore>;
    };
    asyncScope = new AsyncLocalStorage();
  } catch {
    asyncScope = null;
  }
  return asyncScope;
}

/**
 * Initialise request scoping on runtimes without a synchronous `require`.
 *
 * Under **pure ESM** there is no `require`, so the synchronous path above cannot
 * load `node:async_hooks` and `runWithGraphStore` would silently degrade to the
 * module-level store — which does NOT isolate concurrent requests. An ESM server
 * must therefore `await prepareGraphStoreScope()` once during startup, before
 * serving traffic.
 *
 * Safe to call anywhere: it resolves to `false` in the browser and is idempotent.
 */
export async function prepareGraphStoreScope(): Promise<boolean> {
  if (asyncScope) return true;
  if (!isNodeLike()) {
    asyncScopeAttempted = true;
    return false;
  }
  if (resolveAsyncScope()) return true;
  try {
    // Specifier held in a variable so TS does not try to resolve @types/node,
    // and so bundlers cannot statically pull it into browser output.
    const specifier = "node:async_hooks";
    const mod = (await import(/* @vite-ignore */ specifier)) as unknown as {
      AsyncLocalStorage: new () => AsyncStore<GraphStore>;
    };
    asyncScope = new mod.AsyncLocalStorage();
    asyncScopeAttempted = true;
    return true;
  } catch {
    asyncScopeAttempted = true;
    return false;
  }
}

/**
 * Set the process/tab-wide active graph.
 *
 * Returns a restore function; callers MUST invoke it on teardown so a nested or
 * remounted provider does not strand a stale store. Passing `null` clears it.
 */
export function setActiveGraphStore(store: GraphStore | null): () => void {
  const previous = moduleActiveStore;
  moduleActiveStore = store;
  return () => {
    moduleActiveStore = previous;
  };
}

let warnedUnscopedFallback = false;

/**
 * Warn once when request scoping silently degrades.
 *
 * Without this, an ESM server that never called `prepareGraphStoreScope()` gets
 * module-level fallback — which looks like it works single-threaded and leaks
 * across concurrent requests under load. Exactly the class of silent failure
 * this whole module exists to remove.
 */
function warnUnscopedRequestFallback(): void {
  if (warnedUnscopedFallback || !isNodeLike()) return;
  warnedUnscopedFallback = true;
  console.warn(
    "[entity-graph-core] runWithGraphStore() could not load node:async_hooks, so it fell back to a module-level store. Concurrent requests will NOT be isolated. Await prepareGraphStoreScope() once during server startup.",
  );
}

/**
 * Run `fn` with `store` as the active graph for this async context.
 *
 * This is the server-side entry point: an SSR host wraps each request so that
 * concurrent renders never share entity state. When the runtime has no
 * `AsyncLocalStorage`, `fn` still runs — under the module-level store — rather
 * than failing, so isomorphic code does not need a branch.
 */
export function runWithGraphStore<R>(store: GraphStore, fn: () => R): R {
  const scope = resolveAsyncScope();
  if (!scope) {
    warnUnscopedRequestFallback();
    const restore = setActiveGraphStore(store);
    try {
      return fn();
    } finally {
      restore();
    }
  }
  return scope.run(store, fn);
}

/**
 * The graph imperative access should target right now.
 *
 * Precedence: request scope (ALS) → module-level active store → `fallback`.
 * `fallback` is the package singleton, supplied by the caller to avoid a
 * circular import with `graph.ts`.
 */
export function resolveActiveGraphStore(fallback: GraphStore): GraphStore {
  const scoped = resolveAsyncScope()?.getStore();
  if (scoped) return scoped;
  return moduleActiveStore ?? fallback;
}

/** Test seam: drop all active-store state. */
export function __resetActiveGraphStore(): void {
  moduleActiveStore = null;
  asyncScope = null;
  asyncScopeAttempted = false;
  warnedUnscopedFallback = false;
}
