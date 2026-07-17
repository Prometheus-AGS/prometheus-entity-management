# Goals — phase-v4-prometheus-entity-sync

Build `prometheus-entity-sync`: a **Rust-native, MIT-licensed, bidirectional sync engine** that connects Postgres to PGlite (browser), SQLite (mobile/desktop), and pglite-oxide (Tauri desktop) — on par with PowerSync's feature set but with no license restrictions and a Rust/Dart/TypeScript SDK surface.

---

## P0 — Sync Server Core

- `pes-core` crate: SyncRule types, BucketOp, LSN cursors, entity change model
- `pes-rules` crate: TOML sync rules DSL parser; `BucketAssigner` evaluates per-user bucket membership from JWT claims + lookup queries against Postgres
- `pes-oplog` crate: Per-bucket ordered op log with checksum; backed by `frf-store-redb`
- `pes-snapshot` crate: Chunked initial sync (10K rows/batch) from Postgres via `frf-postgres-cdc`
- `pes-protocol` crate: PSyncV1 wire protocol (WebSocket + MessagePack binary framing)
- `pes-gateway` crate: WebSocket server (tokio-tungstenite), extending `frf-gateway`
- `pes-server` binary: config file, health endpoint, metrics (Prometheus-format), Docker image
- Integration with `frf-postgres-cdc` for WAL streaming (no reimplementation)
- Integration with `frf-crdt` (Loro) for CRDT write path and conflict resolution

## P1 — TypeScript Client SDK + PEM Integration

- `@prometheus-ags/entity-sync-core`: Protocol client, reconnect (exponential backoff), JWT refresh, LSN tracking
- `@prometheus-ags/entity-sync-pglite`: PGlite extension — `syncBucket()` applies delta ops to local PGlite
- `@prometheus-ags/entity-sync-react`: `useEntitySync()`, `useSyncStatus()` React hooks
- PEM `registerEntityTransport` integration: `prometheusSync(config)` transport factory
- Works in PEM Vite example app: bidirectional sync of `entities` table

## P2 — Dart / Flutter SDK

- `prometheus_entity_sync` Dart package: pure Dart WebSocket client, no FFI
- SQLite backend via `drift` (Dart ORM)
- Dart models generated from PEM SDL schema (`entity-graph.toml`)
- Offline queue: operations buffered in SQLite `_operation_queue` table; drained on reconnect
- Flutter example app: tasks/entities sync, works offline, resumes on reconnect
- Published to pub.dev

## P3 — Tauri Desktop Plugin + pglite-oxide

- `pes-sdk-rust`: Rust client SDK (async WebSocket, reconnect, op application)
- `prometheus-entity-sync-tauri` Tauri plugin: Rust backend sync + webview command bridge
- pglite-oxide integration option: Rust backend holds pglite-oxide instance for Postgres-syntax SQL
- Tauri example app: desktop local-first app with offline sync
- Background sync worker (tokio task) independent of webview lifecycle

## P4 — AgentSkills.io Skill + Release

- `skills/entity-sync` SKILL.md with 6 capabilities: configure-server, define-sync-rules, integrate-pglite, integrate-flutter, integrate-tauri, debug-sync
- `entity-sync-cli` Rust CLI: validate sync rules, simulate bucket assignment, inspect op log
- Helm chart + Kubernetes manifests for `pes-server`
- Full API documentation
- v1.0 release tag across all packages

---

## Non-Goals (explicitly out of scope for v1)

- MySQL, MongoDB, MSSQL, CockroachDB source support (v2+)
- Swift iOS native SDK (Dart via Flutter covers iOS)
- Kotlin Android SDK (Dart via Flutter covers Android)
- Peer-to-peer sync (no server architecture)
- Web UI for sync rule authoring
- Multi-region sync server replication

---

## Success Criteria

- A `pnpm run dev` Vite app can sync a Postgres `todos` table to PGlite bidirectionally with two users in separate browser tabs, in isolation (bucket-scoped)
- A Flutter app built against the Dart SDK can sync offline, accumulate local writes, and replay them in correct order on reconnect
- A Tauri desktop app using the Tauri plugin can sync via the Rust backend with pglite-oxide
- The `entity-sync-cli validate-rules sync-rules.toml` command correctly identifies invalid bucket configurations
- All crates pass `cargo clippy -- -D warnings` and `cargo fmt --check`
- The Docker image starts and serves health at `/health` within 2 seconds
