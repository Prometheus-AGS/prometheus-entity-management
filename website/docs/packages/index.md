---
title: Packages & API
slug: /packages/
sidebar_position: 6
---

# Package family

The 4.x contract contains thirteen npm packages (twelve libraries plus the `@prometheus-ags/prometheus-entity-management` compatibility alias) plus native Dart and Rust
deliverables. The framework-neutral core owns the graph. Bindings consume a
compatible application-owned core peer so they cannot create hidden graph
singletons. Generated API pages are built from packed public artifacts rather
than source-only aliases.

Use the [package chooser](chooser.md) to select a binding or integration. The
verified registry snapshot has all thirteen npm packages public at stable
`4.4.0`:

| Package | Install | Current `latest` |
| --- | --- | --- |
| `@prometheus-ags/entity-graph-react` (React) | `pnpm add @prometheus-ags/entity-graph-react` | `4.4.0` |
| `@prometheus-ags/entity-graph-core` | `pnpm add @prometheus-ags/entity-graph-core` | `4.4.0` |
| Other eleven `@prometheus-ags/*` packages | `pnpm add <package>` | `4.4.0` |
| `entity_graph_flutter` | pub.dev `4.0.0` | `4.0.0` |

Installs resolve stable `4.4.0` from `latest` by default, and `next` points at
the same version. The withdrawn `3.0.0` and `4.0.1` manifests are deprecated
(unresolved `workspace:` protocol), and stale-artifact `3.0.4` is also
deprecated. Flutter 4.0.0 is public and consumer-verified, although pub.dev has
not yet associated the package with a verified publisher.

[Browse the generated TypeScript API reference](https://prometheus-ags.github.io/prometheus-entity-management/api/).
It is generated from the declarations inside all thirteen packed npm tarballs.
