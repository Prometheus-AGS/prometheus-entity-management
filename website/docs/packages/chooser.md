---
title: Package chooser
sidebar_position: 1
---

# Choose the narrowest package set

Start with `@prometheus-ags/entity-graph-core`, then add exactly the binding and
integration packages your application uses. React applications add
`@prometheus-ags/prometheus-entity-management`; local-first peer sync adds
`@prometheus-ags/entity-graph-sync`; A2UI and A2A stay independent so agent
protocols cannot silently become graph authority.

This twelve-package inventory and the generated API manifest are checked
against the release contract.

| Package | Add it when you need | Runtime boundary |
| --- | --- | --- |
| `@prometheus-ags/entity-graph-core` | normalized entities, ID-only lists, views, CRUD, persistence, or realtime | framework-neutral; owns the graph |
| `@prometheus-ags/prometheus-entity-management` | React 19 hooks, providers, tables, detail/form sheets, and presets | React binding; application owns the core peer |
| `@prometheus-ags/entity-graph-sdl` | one schema contract for code generation and validation | build/runtime schema tools |
| `@prometheus-ags/entity-graph-sync` | PGlite, Loro, Yjs, or peer convergence | local-first transport and merge policy |
| `@prometheus-ags/entity-graph-svelte` | Svelte 5 reactive graph projections | binding only; no private graph copy |
| `@prometheus-ags/entity-graph-solid` | Solid signals over graph entities and lists | binding only; no private graph copy |
| `@prometheus-ags/entity-graph-web-components` | Lit-based custom elements for mixed-framework applications | browser custom elements |
| `@prometheus-ags/entity-graph-alpine` | Alpine data bindings backed by the same graph | lightweight browser binding |
| `@prometheus-ags/entity-graph-htmx` | server-rendered fragments and SSE graph changes | Node HTTP server adapter |
| `@prometheus-ags/entity-graph-a2a` | an auditable A2A reference server over graph tools | server boundary with explicit authentication and policy |
| `@prometheus-ags/a2ui-react` | policy-controlled A2UI surfaces and AG-UI event rendering | untrusted agent output remains behind an action policy |
| `@prometheus-ags/entity-graph-tauri` | Tauri 2 commands, events, persistence, and the bundled Rust plugin | desktop/mobile native boundary |

## Common compositions

| Application | Packages |
| --- | --- |
| React web | core + React binding |
| React with agent surfaces | core + React binding + A2UI React; add A2A only for a server |
| Svelte, Solid, Alpine, or Web Components | core + exactly one corresponding binding |
| HTMX/SSE server | core + SDL + HTMX |
| Local-first application | core + sync; add the UI binding separately |
| Tauri desktop/mobile | core + chosen web binding + Tauri |

## Install public releases

React 19 applications install the stable pair:

```bash
pnpm add @prometheus-ags/entity-graph-core \
  @prometheus-ags/prometheus-entity-management \
  react@19 react-dom@19
```

Add the A2UI renderer when the application accepts generated surfaces:

```bash
pnpm add @prometheus-ags/a2ui-react
```

Flutter applications install the public stable Dart package:

```bash
flutter pub add entity_graph_flutter:^3.0.1
```

All twelve npm packages, including the React and A2UI React bindings, are
public at stable `3.0.5`; Flutter is public at `3.0.1`. The exact registry state and
protected tags are recorded in the [release operations
guide](../operations/release.md).

For exact symbols, open the [packed TypeScript API reference](https://prometheus-ags.github.io/prometheus-entity-management/api/).
