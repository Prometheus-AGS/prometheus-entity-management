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

Use the [package chooser](chooser.md) to select a binding or integration. npm
`@next` commands appear only after registry verification. Current `latest`
tags remain unchanged: React is stable at `2.2.0`; the other eleven packages
still point to `3.0.0-alpha.0` and are not described as stable.

[Browse the generated TypeScript API reference](https://prometheus-ags.github.io/prometheus-entity-management/api/).
It is generated from the declarations inside all twelve packed npm tarballs.
