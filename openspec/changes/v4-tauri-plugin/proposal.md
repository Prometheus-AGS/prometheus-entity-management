# Proposal: v4-tauri-plugin — Tauri desktop sync plugin with pglite-oxide

> Part of umbrella `2026-07-13-v4-prometheus-entity-sync` · Wave 7 · Depends on: v4-pes-server-binary, v4-entity-sync-ts-sdk

## Summary

A Tauri v2 plugin (`tauri-plugin-prometheus-sync`) that:
1. Embeds PGlite via `pglite-oxide` in the Rust backend — giving the Tauri process a local Postgres-syntax SQLite engine
2. Exposes sync state to the Tauri frontend (the existing TypeScript SDK) via Tauri IPC commands
3. Uses `OPFS Ahead-of-time Hash Persistence (OpfsAhp)` in the WebView for Chrome-based Tauri targets; falls back to `NodeFS` for the Rust side

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri WebView (TypeScript)                                   │
│  entity-sync-pglite + entity-sync-react hooks                 │
│  ↕ Tauri IPC (invoke / listen)                               │
├─────────────────────────────────────────────────────────────┤
│  Tauri Rust backend — tauri-plugin-prometheus-sync            │
│  ├── pglite-oxide: PGlite WASM embedded via Wasmtime          │
│  ├── SyncClient (Rust): PSyncV1 WebSocket connection          │
│  └── IPC handlers: apply_delta, get_status, write_op         │
└─────────────────────────────────────────────────────────────┘
```

## pglite-oxide integration

`pglite-oxide` exposes a `PGlite` struct that accepts a `postgres://` URI. The Rust backend opens a pglite-oxide database, delegates SQL execution to it, and marshals results back through IPC.

```rust
use pglite_oxide::PGlite;

let db = PGlite::open("postgres:///var/app_data/entities.db").await?;
db.exec("CREATE TABLE IF NOT EXISTS todos (id TEXT PRIMARY KEY, data JSONB)").await?;
```

## Caveats and fallback

`pglite-oxide` is pre-crates.io as of 2026-07-13. The plugin must compile with a `[patch]` pointing at the local clone (`/Users/gqadonis/Projects/prometheus/pglite-oxide`). If `pglite-oxide` cannot be vendored, the plugin falls back to `rusqlite` for local persistence and documents the degraded path clearly.

## IPC surface

```typescript
// Frontend invokes these Tauri commands:
invoke('prometheus_sync_apply_delta', { entityType, entityId, op })
invoke('prometheus_sync_get_status')  // → SyncStatus
invoke('prometheus_sync_write', { entityType, entityId, op })

// Backend emits these events:
listen('prometheus_sync_delta', (event) => { /* Delta payload */ })
listen('prometheus_sync_status_changed', (event) => { /* SyncStatus */ })
```

## Success criteria

- [ ] `tauri-plugin-prometheus-sync` compiles with `cargo build` on macOS
- [ ] Tauri example app: entity list displays data from pglite-oxide backend
- [ ] Sync bidirectional: write in Tauri app → server → seen by browser tab within 500ms
- [ ] `pnpm tauri build` produces a signed macOS `.app` with < 120 MB bundle
- [ ] pglite-oxide fallback to rusqlite documented in README with feature flag
