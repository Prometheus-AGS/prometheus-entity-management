# @prometheus-ags/entity-graph-core

## 3.1.0

## 3.0.5

### Patch Changes

- Resolve imperative graph access against the active graph instead of the package
  singleton, so `GraphStoreProvider` scopes `useGraphStore.getState()`,
  `.setState()`, `.subscribe()` and `.getInitialState()` (issue #42).

  3.0.4 replaced the copied StoreApi with delegates that warned but still targeted
  the singleton, which left consumers using the documented imperative API with no
  isolation. The React binding now proxies those methods, resolving per call.

  New in `entity-graph-core`:
  - `runWithGraphStore(store, fn)` — an `AsyncLocalStorage` request scope, so
    concurrent server renders never share entity state.
  - `prepareGraphStoreScope()` — awaited once during startup on **pure-ESM**
    servers, where there is no synchronous `require` to load `node:async_hooks`.
    Without it request scoping degrades to a module-level store and warns.
  - `setActiveGraphStore(store)` — the module-level active store, set by
    `GraphStoreProvider` on mount and restored on unmount.
  - `resolveActiveGraphStore(fallback)` — request scope → module-level store →
    fallback.

  `node:async_hooks` is loaded lazily and never statically imported, so browser
  bundles are unaffected. With no provider and no request scope, behaviour is
  unchanged from 3.0.4, and the deprecation warning is gone because the methods
  now do what callers expected.

## 3.0.4

## 3.0.3

### Patch Changes

- Ingest fetched entity lists, lifecycle metadata, and list projections in one
  atomic graph publication. Core and React list paths no longer publish once per
  returned row.

## 3.0.0

### Patch Changes

- 30fc348: Certify the React 19 and Vite 8 release showcase with normalized cross-view
  updates, local/remote/hybrid queries, optimistic confirmation and rollback,
  relationship invalidation, realtime coalescing, PGlite persistence, Loro
  convergence, Suspense and error-boundary lifecycle behavior, DevTools, and
  browser accessibility evidence.
- 7b64d76: Scope engine dedupe, subscribers, fetches, React hooks, mutations, and realtime
  writes to an application-owned graph so concurrent Next.js requests can
  dehydrate and hydrate without sharing process-global entity state.

## 3.0.0-rc.1

### Patch Changes

- Preserve coalesced realtime update operations while merging repeated patches, so a burst does not degrade into a data-less upsert that the graph discards.
- Accept a public `LoroModuleLoader` callback in `createLoroMergeStrategy` so browser bundlers can include the optional `loro-crdt` peer without making it a core dependency.

## 3.0.0

### Major Changes

- v3.0.0 — Universal Platform Evolution

  Evolves the React-only entity graph into a cross-platform, multi-framework,
  AI-native, local-first ecosystem.
  - **Monorepo split (breaking, but consumer-safe):** the framework-agnostic core
    is extracted into `@prometheus-ags/entity-graph-core` (zero React). The
    published `@prometheus-ags/prometheus-entity-management` package is the React
    binding over the vanilla core. Existing React hook names remain available,
    while core-only imperative consumers migrate from `useGraphStore.getState()`
    to `graphStore.getState()`; the deprecated core alias remains through the
    next-major removal window.
  - **New framework bindings:** `entity-graph-svelte` (Svelte 5 runes),
    `entity-graph-solid`, `entity-graph-web-components` (Lit 3), `entity-graph-alpine`,
    `entity-graph-htmx` (Node SSE fragment server).
  - **Peer sync:** `entity-graph-sync` with a pluggable SyncProvider — Yjs (default)
    and Loro (reusing the 2.2.0 merge seam).
  - **AI-native:** `entity-graph-a2a` plus `a2ui-react` with official A2UI
    v0.9.1 rendering and default-deny graph actions; legacy
    EntityChat/Copilot/Stream/Diff/Approval APIs live under `./ag-ui`.
  - **Codegen contract:** `entity-graph-sdl` (schema → validated IR).
  - **Native (published outside npm):** `entity-graph-cli` + `entity-graph-mcp`
    (Rust, via crates.io), `entity-graph-tauri` (Tauri v2 plugin), and
    `entity_graph_flutter` (Riverpod 3, via pub.dev).

  All integrations ship as optional peer dependencies; the core bundle stays
  `zustand + immer`.
