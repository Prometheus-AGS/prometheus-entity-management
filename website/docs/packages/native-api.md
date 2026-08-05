---
title: Dart and Rust APIs
sidebar_position: 3
---

# Native API references

The Dart package is canonical under `packages/entity_graph_flutter`. The
[published dartdoc reference](https://prometheus-ags.github.io/prometheus-entity-management/native-api/dart/)
is generated from that package, never from the provenance import:

```bash
pnpm run docs:native-api
```

The curated Flutter guides link provider families, graph operations, views,
transports, and the optional FFI seam to this dartdoc surface.

Rust deliverables include the entity graph CLI, MCP server, and the Rust plugin
bundled with the Tauri npm artifact. Their combined
[rustdoc reference](https://prometheus-ags.github.io/prometheus-entity-management/native-api/rust/)
is generated with crate-scoped commands:

```bash
cargo doc --no-deps --manifest-path packages/entity-graph-cli/Cargo.toml
cargo doc --no-deps --manifest-path packages/entity-graph-mcp/Cargo.toml
cargo doc --no-deps --manifest-path packages/entity-graph-tauri/rust-plugin/Cargo.toml
```

These documentation commands do not publish to pub.dev or crates.io and do not
claim signing, device, or app-store certification.
