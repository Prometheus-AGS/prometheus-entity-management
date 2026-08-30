# @prometheus-ags/entity-graph-solid

## 3.1.0

### Patch Changes

- @prometheus-ags/entity-graph-core@3.1.0

## 3.0.5

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.5

## 3.0.4

### Patch Changes

- @prometheus-ags/entity-graph-core@3.0.4

## 3.0.3

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.3

## 3.0.0

### Patch Changes

- 30fc348: Require applications to supply one compatible entity-graph core instance across every stable framework binding, and verify the installed singleton through packed consumers.
- Updated dependencies [30fc348]
- Updated dependencies [7b64d76]
  - @prometheus-ags/entity-graph-core@3.0.0

## 3.0.0-rc.1

### Patch Changes

- Require applications to supply one compatible entity-graph core instance across every stable framework binding, and verify the installed singleton through packed consumers.
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
