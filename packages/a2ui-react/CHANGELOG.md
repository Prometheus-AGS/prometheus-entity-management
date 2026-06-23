# @prometheus-ags/a2ui-react

## 3.0.0

### Major Changes

- v3.0.0 — Universal Platform Evolution

  Evolves the React-only entity graph into a cross-platform, multi-framework,
  AI-native, local-first ecosystem.
  - **Monorepo split (breaking, but consumer-safe):** the framework-agnostic core
    is extracted into `@prometheus-ags/entity-graph-core` (zero React). The
    published `@prometheus-ags/prometheus-entity-management` package is now a
    re-export shim over the React bindings + core — its runtime surface is
    byte-identical to 2.2.0 (197 exports unchanged), so existing consumers upgrade
    with no code changes.
  - **New framework bindings:** `entity-graph-svelte` (Svelte 5 runes),
    `entity-graph-solid`, `entity-graph-web-components` (Lit 3), `entity-graph-alpine`,
    `entity-graph-htmx` (Node SSE fragment server).
  - **Peer sync:** `entity-graph-sync` with a pluggable SyncProvider — Yjs (default)
    and Loro (reusing the 2.2.0 merge seam).
  - **AI-native:** `entity-graph-a2a` (Agent2Agent v1.0 server), `a2ui-react`
    (EntityChat/Copilot/Stream/Diff/Approval, reusing AG-UI ingestion + time-travel).
  - **Codegen contract:** `entity-graph-sdl` (schema → validated IR).
  - **Native (published outside npm):** `entity-graph-cli` + `entity-graph-mcp`
    (Rust, via crates.io), `entity-graph-tauri` (Tauri v2 plugin), and
    `entity_graph_flutter` (Riverpod 3, via pub.dev).

  All integrations ship as optional peer dependencies; the core bundle stays
  `zustand + immer`.

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.0
