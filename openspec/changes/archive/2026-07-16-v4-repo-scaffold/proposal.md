# Proposal: v4-repo-scaffold — prometheus-entity-sync repository bootstrap

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 1 · No dependencies

## Summary

Bootstrap the `prometheus-entity-sync` Rust/TypeScript monorepo at `/Users/gqadonis/Projects/prometheus/prometheus-entity-sync/`. Establishes the workspace structure, FRF dependency wiring, and CI pipeline that all subsequent changes build on.

## Motivation

A new sibling repository is needed rather than adding to PEM — this is an independent service with its own release cycle, Docker image, and multi-language SDKs. The repository structure must be decided once, correctly, before any crate logic lands.

## Design

### Rust workspace structure

```toml
# Cargo.toml (workspace root)
[workspace]
resolver = "2"
members = [
  "crates/pes-core",
  "crates/pes-rules",
  "crates/pes-oplog",
  "crates/pes-snapshot",
  "crates/pes-protocol",
  "crates/pes-gateway",
  "crates/pes-server",
  "crates/pes-sdk-rust",
]

[workspace.dependencies]
frf-postgres-cdc = { path = "../../flint-realtime-fabric/crates/frf-postgres-cdc" }
frf-crdt = { path = "../../flint-realtime-fabric/crates/frf-crdt" }
frf-ports = { path = "../../flint-realtime-fabric/crates/frf-ports" }
frf-domain = { path = "../../flint-realtime-fabric/crates/frf-domain" }
tokio = { version = "1", features = ["full"] }
serde = { version = "1", features = ["derive"] }
serde_json = "1"
thiserror = "2"
tracing = "0.1"
```

### TypeScript workspace structure

```yaml
# pnpm-workspace.yaml
packages:
  - 'packages/*'
  - 'skills/entity-sync'
```

### CI (GitHub Actions)

```yaml
# .github/workflows/ci.yml
on: [push, pull_request]
jobs:
  rust:
    runs-on: ubuntu-latest
    steps:
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --workspace
      - run: cargo clippy --workspace -- -D warnings
      - run: cargo fmt --check
  typescript:
    runs-on: ubuntu-latest
    steps:
      - uses: pnpm/action-setup@v4
      - run: pnpm install
      - run: pnpm typecheck
      - run: pnpm test
```

## Success criteria

- [ ] `cargo build --workspace` succeeds from fresh checkout
- [ ] `cargo clippy --workspace -- -D warnings` produces zero warnings
- [ ] `cargo fmt --check` passes
- [ ] `pnpm install` succeeds
- [ ] GitHub Actions CI runs green on first push
- [ ] `README.md` describes the project, installation, and quick-start
