---
type: Reference
id: prometheus-entity-sync-phase-v4-snapshot-completion
title: Prometheus Entity Sync Phase v4 Snapshot Completion
tags:
- prometheus-entity-sync
- kbd-phase
- rust-sync-engine
- postgres-cdc
- pglite
- snapshot-stream
- testcontainers
links:
- hybrid-mobile-poc-phase-assessment-codegen-ci-and-build-blockers
sources:
- stdin
- manual:prometheus-entity-management/phase-v4-prometheus-entity-sync
timestamp: 2026-07-16T22:40:38.277642+00:00
created_at: 2026-07-16T22:40:38.277642+00:00
updated_at: 2026-07-16T22:40:38.277642+00:00
revision: 0
---

## Phase Context

- **Project:** `prometheus-entity-management`
- **Phase:** `phase-v4-prometheus-entity-sync`
- **KBD root:** `/Users/gqadonis/Projects/prometheus/prometheus-entity-management`
- **Captured:** `2026-07-16T22:39:17Z`
- **Status:** 6/14 changes complete
- **Recent milestone:** `v4-pes-snapshot` completed, verified, and archived
- **Next change:** `v4-wal-to-bucket-router`

## Objective

Build `prometheus-entity-sync`: a Rust-native, MIT-licensed, bidirectional sync engine connecting Postgres to:

- PGlite in browsers
- SQLite on mobile/desktop
- `pglite-oxide` for Tauri desktop

The intended feature level is comparable to PowerSync, but without license restrictions and with Rust, Dart, and TypeScript SDK surfaces.

## Planned Architecture

### P0: Sync Server Core

- `pes-core`: `SyncRule` types, `BucketOp`, LSN cursors, entity change model.
- `pes-rules`: TOML sync-rules DSL parser; `BucketAssigner` evaluates per-user bucket membership from JWT claims and lookup queries against Postgres.
- `pes-oplog`: per-bucket ordered op log with checksum, backed by `frf-store-redb`.
- `pes-snapshot`: chunked initial sync from Postgres via `frf-postgres-cdc`; target batch size is 10K rows.
- `pes-protocol`: `PSyncV1` wire protocol using WebSocket plus MessagePack binary framing.
- `pes-gateway`: WebSocket server using `tokio-tungstenite`, extending `frf-gateway`.
- `pes-server`: binary with config file support, health endpoint, Prometheus-format metrics, and Docker image.
- WAL streaming integration uses `frf-postgres-cdc`; CDC is not reimplemented.
- CRDT write path and conflict resolution integrate with `frf-crdt` / Loro.

### P1: TypeScript SDK and PEM Integration

- `@prometheus-ags/entity-sync-core`: protocol client, exponential-backoff reconnect, JWT refresh, LSN tracking.
- `@prometheus-ags/entity-sync-pglite`: PGlite extension; `syncBucket()` applies delta operations to local PGlite.
- `@prometheus-ags/entity-sync-react`: `useEntitySync()` and `useSyncStatus()` React hooks.
- PEM transport integration through `registerEntityTransport` and a `prometheusSync(config)` transport factory.
- Target validation: bidirectional sync of the `entities` table in the PEM Vite example app. PEM and local-first sync are also identified as showcase capabilities in [Hybrid Mobile PoC Phase Assessment: Codegen, CI, and Build Blockers](/hybrid-mobile-poc-phase-assessment-codegen-ci-and-build-blockers.md).

### P2: Dart / Flutter SDK

- `prometheus_entity_sync` Dart package.
- Pure Dart WebSocket client; no FFI.
- SQLite backend via `drift`.

## Completed: `v4-pes-snapshot`

`v4-pes-snapshot` completed all 11/11 tasks and was verified and archived.

### SnapshotStream implementation

- Uses **keyset pagination only**; it never uses `OFFSET`.
- Implements a two-level `xxh3` checksum scheme:
  - Per-batch row-identity hashing.
  - Folded bucket-level checksum.
- The bucket-level checksum is designed to catch dropped or reordered batches, not only row-level mismatches.

### Correctness bug found and fixed

A serious pagination bug was discovered during the 100K-row integration test:

- The keyset cursor was compared as text.
- On `BIGINT` IDs, lexical comparison caused numeric ordering corruption, e.g. `'2' > '10'`.
- Result: the snapshot stream returned **749,966 rows instead of 100,000**.
- Production impact would have been silent duplicated and/or skipped rows.

Fix:

- Detect the `id` column's real Postgres type once per query using `pg_typeof`.
- Run type detection **before pagination starts**.
- This ordering matters because Postgres type-checks all `WHERE ... OR ...` branches at parse time; the cast cannot be deferred until a real cursor value exists.
- The fix required two implementation iterations.

### Verification

Integration tests use `testcontainers`:

- 100K-row snapshot completes in approximately 1–2 seconds, below the 5-second target.
- Batch-checksum determinism is verified across independent runs.
- Cancellation safety is verified with no leaked pool connections.

Unit coverage:

- 9 checksum unit tests.

### Environment note

For this development environment, `testcontainers` requires `DOCKER_HOST` to point at Colima's socket.

## Next Work

Next phase item: `v4-wal-to-bucket-router`.

Purpose:

- Connect `frf-postgres-cdc` through `BucketAssigner` into `BucketOpLog`.
- Complete the remaining Wave 3 critical-path spine after snapshot/oplog work.

Coordination note:

- Check `task_81d7bf99` before starting, because the change is likely to touch `pes-gateway`, where two background tasks may overlap.

# Citations

1. stdin
2. manual:prometheus-entity-management/phase-v4-prometheus-entity-sync