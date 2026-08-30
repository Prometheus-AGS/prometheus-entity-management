---
title: Packages & API
slug: /packages/
sidebar_position: 6
---

# Package family

The 3.0 contract contains twelve npm packages plus native Dart and Rust
deliverables. The framework-neutral core owns the graph. Bindings consume a
compatible application-owned core peer so they cannot create hidden graph
singletons. Generated API pages are built from packed public artifacts rather
than source-only aliases.

Use the [package chooser](chooser.md) to select a binding or integration. The
verified registry snapshot has all twelve npm packages public at stable
`3.2.0`:

| Package | Install | Current `latest` |
| --- | --- | --- |
| `@prometheus-ags/prometheus-entity-management` (React) | `pnpm add @prometheus-ags/prometheus-entity-management` | `3.2.0` |
| `@prometheus-ags/entity-graph-core` | `pnpm add @prometheus-ags/entity-graph-core` | `3.2.0` |
| Other ten `@prometheus-ags/*` packages | `pnpm add <package>` | `3.2.0` |
| `entity_graph_flutter` | pub.dev `3.1.0` | `3.1.0` |

Installs resolve stable `3.2.0` from `latest` by default. The withdrawn
`3.0.0` manifests are deprecated (unresolved `workspace:` protocol), and
stale-artifact `3.0.4` is also deprecated. `@next` now points at stable `3.2.0`
as well. Flutter 3.1.0 is public
and consumer-verified, although pub.dev has not yet associated the package
with a verified publisher.

[Browse the generated TypeScript API reference](https://prometheus-ags.github.io/prometheus-entity-management/api/).
It is generated from the declarations inside all twelve packed npm tarballs.
