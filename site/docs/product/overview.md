---
title: Overview
description: What Prometheus Entity Management 3.0 is, the problem it solves, and how the certified package family fits together.
---

# Prometheus Entity Management 3.0

Prometheus Entity Management is a **normalized, globally reactive entity graph
store**. It replaces query-owns-data silos with a single application-wide entity
graph: updating one entity in one place immediately updates every view that
reads that entity.

## The core philosophy

- **Queries are instructions to populate the graph.** They describe what to
  fetch and how to normalize it; they never own the resulting data.
- **The graph is the single source of truth.** Entities live exactly once.
- **Lists store ordered arrays of entity IDs, never copies of entity data.**
  Lists join IDs against the graph at render time — that is what makes
  cross-view reactivity possible.

## What ships in 3.0

| Surface | Artifacts | Binding |
| ------- | --------- | ------- |
| Framework-neutral core | `@prometheus-ags/entity-graph-core` | Any JS runtime |
| React 19 | `@prometheus-ags/prometheus-entity-management@3.2.0` | Hooks, CRUD, UI, GraphQL |
| Local-first sync | `@prometheus-ags/entity-graph-sync` | Loro CRDT + PGlite |
| Svelte / Solid / Alpine / HTMX / Web Components | 5 binding packages | Stores, signals, plugins, SSE, elements |
| Agentic surfaces | `@prometheus-ags/a2ui-react@3.2.0`, `@prometheus-ags/entity-graph-a2a@3.2.0` | A2UI v1.0-RC compatibility, AG-UI 0.0.59, A2A v1 |
| Desktop / mobile | `@prometheus-ags/entity-graph-tauri` | Tauri 2 plugin |
| Flutter | `entity_graph_flutter@3.1.0` | Dart graph + Riverpod; optional controller and official DevTools companion; A2UI 1.0-RC compatibility via GenUI 0.10.2 in the showcase |
| Tooling | `entity-graph-cli`, `entity-graph-mcp` | Rust crates |

## Certification model

Every public claim is backed by a named evidence gate — a script you can run
from a clean checkout. The [packages](/docs/packages/overview) section lists
the gate for each artifact, and the [examples](/docs/examples/overview) gallery
shows certified consumers running against packed tarballs.

## Where to go next

- [Architecture](/docs/product/architecture) — how the three-layer model works
- [Package selection](/docs/packages/overview) — pick the artifact for your stack
- [Examples gallery](/docs/examples/overview) — certified consumers to fork
