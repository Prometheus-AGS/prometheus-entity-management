# @prometheus-ags/prometheus-entity-management

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
