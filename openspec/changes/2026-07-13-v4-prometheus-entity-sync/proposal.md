# Proposal: prometheus-entity-sync — Rust sync engine

> Umbrella change `2026-07-13-v4-prometheus-entity-sync` · phase-v4-prometheus-entity-sync · 14 changes · 8 waves

## Summary

Build `prometheus-entity-sync`: a Rust-native, MIT-licensed, bidirectional sync engine that connects Postgres to PGlite (browser), SQLite (mobile/Dart), and pglite-oxide (Tauri desktop). Ships with TypeScript, Dart, and Tauri client SDKs plus an AgentSkills.io compliant skill.

## Motivation

Every existing solution has a disqualifying constraint:
- **PowerSync** (FSL-1.1): building a competing sync service is license-restricted
- **ElectricSQL** (FSL): read-only sync, no Dart client, no SQLite native
- **Zero (Rocicorp)** (BSL): Postgres-only, JS-only, no mobile
- **Triplit** (Apache): custom storage, no Postgres native, no Dart

FRF already has 70–80% of the server-side machinery (`frf-postgres-cdc`, `frf-crdt`, `frf-store-redb`, `frf-ports`). The gap is a bucket-based sync protocol DSL, a wire protocol, and client SDKs.

## Architecture

New sibling repository: `/Users/gqadonis/Projects/prometheus/prometheus-entity-sync/`

```
Postgres WAL
  → frf-postgres-cdc (existing FRF crate)
  → WalToBucketRouter (new — routes rows to per-user buckets per SyncRules DSL)
  → BucketOpLog (new — per-bucket ordered op log with checksums)
  → pes-gateway (new — WebSocket server, PSyncV1 protocol)
  → Client SDKs (TypeScript/PGlite, Dart/SQLite, Rust/pglite-oxide)
  → PEM entity graph (via prometheusSync transport)
```

## Changes

| ID | Wave | Priority |
|----|------|----------|
| v4-repo-scaffold | 1 | P0 |
| v4-pes-core-types | 1 | P0 |
| v4-sync-rules-dsl | 2 | P0 |
| v4-bucket-assigner | 2 | P0 ⚠️ CRITICAL |
| v4-pes-snapshot | 3 | P0 |
| v4-pes-oplog | 3 | P0 |
| v4-wal-to-bucket-router | 3 | P0 |
| v4-psync-protocol | 4 | P0 |
| v4-pes-gateway | 4 | P0 |
| v4-pes-server-binary | 4 | P1 |
| v4-entity-sync-ts-sdk | 5 | P0 |
| v4-pem-sync-transport | 5 | P1 |
| v4-dart-sdk | 6 | P1 |
| v4-tauri-plugin | 7 | P1 |
| v4-entity-sync-skill | 8 | P2 |

## Success criteria

- [ ] Two browser tabs (different users) sync bidirectionally via PGlite, seeing only their own data
- [ ] Flutter app syncs offline and replays writes in order on reconnect
- [ ] Tauri desktop app syncs via Rust backend with pglite-oxide
- [ ] `entity-sync-cli validate-rules` correctly rejects invalid sync rules
- [ ] Docker image starts and serves `/health` in <2s
- [ ] All Rust crates pass `cargo clippy -- -D warnings`

## Non-goals (v1)

- MySQL, MongoDB, MSSQL source support
- Swift iOS native SDK (Flutter covers iOS)
- Kotlin Android SDK (Flutter covers Android)
- Peer-to-peer sync
- Sync rules web UI
- Multi-region server replication
