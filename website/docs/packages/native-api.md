---
title: Dart and Rust APIs
sidebar_position: 3
---

# Native API references

The Dart package is canonical under `packages/entity_graph_flutter` and public
on [pub.dev as `entity_graph_flutter@3.0.5`](https://pub.dev/packages/entity_graph_flutter). The
[published dartdoc reference](https://prometheus-ags.github.io/prometheus-entity-management/native-api/dart/)
is generated from that package, never from the provenance import:

```bash
pnpm run docs:native-api
pnpm run docs:native-api:verify
```

Generation and full reproducibility verification are release gates. They
require Flutter `3.44.8`, dartdoc `9.0.5`, and Rust `1.88.0`; the generator
rejects a different Flutter version and invokes the exact Rust toolchain.

The Pages deployment does not rebuild native documentation or install native
toolchains. It runs `pnpm run docs:native-api:check`, which hashes every
declared native source and every committed dartdoc/rustdoc artifact and compares
them with the checked-in manifest. Any source, file, byte, or inventory drift
fails before deployment; full regeneration remains the stronger release gate.

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

These documentation commands do not perform registry publication. The Dart
package is already public; the standalone Rust crates remain unpublished. The
commands do not claim signing, device, or app-store certification.
