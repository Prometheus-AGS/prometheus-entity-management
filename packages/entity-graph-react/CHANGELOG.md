# @prometheus-ags/prometheus-entity-management

## 3.2.0

### Minor Changes

- Release the complete DevTools distribution with the synchronized 3.2.0 workspace, including bounded core event metadata and responsive React inspector search during continuous graph updates.

## 3.1.0

### Minor Changes

- 7ff2fe2: Add the optional `./devtools` inspector surface and development-only
  `./devtools/auto` bootstrap with Graph Pulse causality, original/patch/live
  dirty inspection, registered rendered-view membership, entity history, and
  controller-owned time travel. The normal package root remains inspector-free.

### Patch Changes

- @prometheus-ags/entity-graph-core@3.1.0

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

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.5

## 3.0.4

### Patch Changes

- Make provider-scoped imperative graph access explicit, correct Next.js
  hydration writes, add A2UI 1.0-RC compatibility for React and Flutter, and
  accept AG-UI 0.0.59 A2UI activity snapshots.
  - @prometheus-ags/entity-graph-core@3.0.4

## 3.0.3

### Patch Changes

- Ingest fetched entity lists, lifecycle metadata, and list projections in one
  atomic graph publication. Core and React list paths no longer publish once per
  returned row.
- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.3

## 3.0.0

### Patch Changes

- 30fc348: Certify the React 19 and Vite 8 release showcase with normalized cross-view
  updates, local/remote/hybrid queries, optimistic confirmation and rollback,
  relationship invalidation, realtime coalescing, PGlite persistence, Loro
  convergence, Suspense and error-boundary lifecycle behavior, DevTools, and
  browser accessibility evidence.
- 30fc348: Require applications to supply one compatible entity-graph core instance across every stable framework binding, and verify the installed singleton through packed consumers.
- df8f13d: Keep `useEntityView` and `useEntityQuery` item projections reactive when an
  existing normalized entity changes without changing the view's ID list.
- 7b64d76: Scope engine dedupe, subscribers, fetches, React hooks, mutations, and realtime
  writes to an application-owned graph so concurrent Next.js requests can
  dehydrate and hydrate without sharing process-global entity state.
- Updated dependencies [30fc348]
- Updated dependencies [7b64d76]
  - @prometheus-ags/entity-graph-core@3.0.0

## 3.0.0-rc.1

### Patch Changes

- Require applications to supply one compatible entity-graph core instance across every stable framework binding, and verify the installed singleton through packed consumers.
- Certify the React 19/Vite 8 source-workspace showcase across normalized identity, optimistic mutation, relationships, local/remote/hybrid views, transport seams, realtime, PGlite/Loro, Suspense/error containment, DevTools, and accessibility.
- Add `GraphStoreProvider` and `useGraphStoreApi` so Next.js and other SSR hosts can scope every React hook, fetch, mutation, and realtime write to one application-owned graph instead of sharing request data through the process singleton.
- Seed the canonical base list when a remote entity query resolves so later local and hybrid projections share the same graph source.
- Start cache-miss entity fetches before throwing the Suspense promise, allowing initial Suspense reads to resolve instead of failing as missing entities.
- Install TanStack Table as a runtime dependency so clean consumers can import the root React package without manually adding an allegedly optional peer.
  - @prometheus-ags/entity-graph-core@3.0.0-rc.1

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

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.0
