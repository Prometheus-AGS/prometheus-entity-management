---
title: Package selection
description: Which 3.0 artifact to use for which stack — twelve npm packages, one Dart package, and two Rust crates, each with its evidence gate.
---

# Package selection

All twelve npm packages are public at stable `3.0.5` on the `latest` tag.
Every row names its evidence gate; run the gate before repeating the claim.

## npm packages (12 public)

| Package | Use it for | Evidence gate |
| ------- | ---------- | ------------- |
| `@prometheus-ags/entity-graph-core` | Framework-neutral graph, engine, view layer, realtime manager, adapters | `pnpm run verify:framework-neutral-core` |
| `@prometheus-ags/prometheus-entity-management@3.0.5` | React 19 bindings: hooks, CRUD, UI components, GraphQL, Prisma helpers | `pnpm run verify:vite-react19` |
| `@prometheus-ags/entity-graph-sync` | Local-first sync: Loro CRDT provider, PGlite persistence, convergence | `pnpm run verify:sync-persistence` |
| `@prometheus-ags/entity-graph-svelte` | Svelte stores over the graph | `pnpm run verify:binding-singletons` |
| `@prometheus-ags/entity-graph-solid` | Solid signals over the graph | `pnpm run verify:binding-singletons` |
| `@prometheus-ags/entity-graph-alpine` | Alpine.js plugin | `pnpm run verify:binding-singletons` |
| `@prometheus-ags/entity-graph-htmx` | HTMX + SSE server rendering | `pnpm run verify:binding-singletons` |
| `@prometheus-ags/entity-graph-web-components` | Framework-agnostic `<entity-list/detail/form>` elements | `pnpm run verify:binding-singletons` |
| `@prometheus-ags/a2ui-react@3.0.5` | A2UI v1.0-RC compatibility over the official v0.9.1 renderer + AG-UI 0.0.59 activity/chat entry points | `pnpm run verify:a2ui-bridge` |
| `@prometheus-ags/entity-graph-a2a` | A2A v1 JSON-RPC agent server with graph policy authority | `pnpm run verify:a2a-conformance` |
| `@prometheus-ags/entity-graph-tauri` | Tauri 2 plugin bindings, commands, snapshot lifecycle | `pnpm run verify:tauri-plugin` |
| `@prometheus-ags/entity-graph-sdl` | SDL JSON schema parsing/validation | `pnpm --filter @prometheus-ags/entity-graph-sdl test` |

## Dart / Flutter

| Package | Use it for | Evidence gate |
| ------- | ---------- | ------------- |
| `entity_graph_flutter@3.0.1` | Canonical Dart graph + Riverpod providers | `pnpm run verify:dart-graph-riverpod` |

## Rust crates

| Crate | Use it for | Evidence gate |
| ----- | ---------- | ------------- |
| `entity-graph-cli` | Scaffold `schema.json`, generate TypeScript types + transport stubs | `cargo test --manifest-path packages/entity-graph-cli/Cargo.toml` |
| `entity-graph-mcp` | Expose the graph as MCP resources/tools | `cargo test --manifest-path packages/entity-graph-mcp/Cargo.toml` |

## Install (pnpm only)

```bash
pnpm add @prometheus-ags/entity-graph-core
# React 19 bindings
pnpm add @prometheus-ags/prometheus-entity-management
```

## Rules

- **One graph per application.** Bindings are singleton facades over
  `entity-graph-core`.
- **Data flow is layered.** Components use hooks/controllers; hooks
  orchestrate store methods; stores/adapters own all I/O.
