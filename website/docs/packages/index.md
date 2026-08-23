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
verified registry snapshot currently has three public npm RCs:

| Package | Install tag | Current `latest` |
| --- | --- | --- |
| `@prometheus-ags/entity-graph-core` | `@next` → `3.0.0-rc.1` | `3.0.0-alpha.0` |
| `@prometheus-ags/prometheus-entity-management` | `@latest` or `@next` → `3.0.0-rc.1` | `3.0.0-rc.1` |
| `@prometheus-ags/a2ui-react` | `@next` → `3.0.0-rc.1` | `3.0.0-alpha.0` |
| Remaining nine npm packages | staged; not yet installable as RC | `3.0.0-alpha.0` |
| `entity_graph_flutter` | pub.dev `3.0.0` | `3.0.0` |

“Staged” is not equivalent to published: do not request `@next` for one of the
nine packages until its npm approval is complete and the registry table is
updated. Flutter is public and consumer-verified, although pub.dev has not yet
associated the package with a verified publisher.

[Browse the generated TypeScript API reference](https://prometheus-ags.github.io/prometheus-entity-management/api/).
It is generated from the declarations inside all twelve packed npm tarballs.
