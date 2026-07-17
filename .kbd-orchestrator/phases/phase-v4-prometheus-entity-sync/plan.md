# Plan — phase-v4-prometheus-entity-sync

**Date:** 2026-07-13  
**Phase:** prometheus-entity-sync — Rust sync engine + TypeScript/Dart/Tauri SDKs  
**Change backend:** OpenSpec (`openspec/changes/2026-07-13-v4-prometheus-entity-sync/`)  
**Total changes:** 14  
**Umbrella:** `2026-07-13-v4-prometheus-entity-sync`

---

## Ordering Rationale

This phase builds a new sibling repository (`prometheus-entity-sync/`) alongside the PEM monorepo. Dependencies flow strictly from:

```
[Wave 1] Repo scaffold + domain types
    ↓
[Wave 2] Sync rule DSL + BucketAssigner (CRITICAL PATH — security)
    ↓
[Wave 3] WAL→bucket pipeline (snapshot + delta)
    ↓
[Wave 4] Wire protocol + gateway server
    ↓
[Wave 5] TypeScript client SDK + PEM integration
    ↓
[Wave 6] Dart/Flutter SDK
    ↓
[Wave 7] Rust client SDK + Tauri plugin
    ↓
[Wave 8] AgentSkills.io skill + release artifacts
```

**The BucketAssigner (Wave 2) is the critical path item.** Data leakage between users is the highest-severity bug class. Wave 2 is deliberately isolated and must have exhaustive tests before anything downstream touches it.

---

## Changes

### Wave 1 — Foundation (can apply immediately)

#### `v4-repo-scaffold`
**Agent:** frontier  
**Summary:** Bootstrap the `prometheus-entity-sync` Rust workspace + pnpm workspaces mono-repo under `/Users/gqadonis/Projects/prometheus/prometheus-entity-sync/`. Initialize `pes-core` crate with SyncRule types, BucketOp, PgLsn, Op, and the entity change domain model. Wire FRF crate dependencies (frf-postgres-cdc, frf-crdt, frf-ports, frf-domain) as path dependencies.

**Deliverables:**
- `/Users/gqadonis/Projects/prometheus/prometheus-entity-sync/` — new repository
- `Cargo.toml` workspace with `pes-core`, member stubs for all future crates
- `pnpm-workspace.yaml` for TypeScript packages
- `pes-core/src/types.rs`: `SyncRule`, `BucketDef`, `BucketId`, `BucketOp`, `EntityChange`, `PgLsn`, `Op` (upsert/delete/crdt_patch)
- `pes-core/src/lib.rs`: public re-exports
- CI: GitHub Actions workflow (cargo test, cargo clippy, cargo fmt --check)
- `README.md` skeleton

**DoD:** `cargo build` passes; `cargo clippy -- -D warnings` passes; all types compile.

---

#### `v4-pes-core-types` *(can parallel with v4-repo-scaffold if scaffold lands as a quick bootstrap)*
**Agent:** frontier  
**Summary:** Flesh out `pes-core` with all domain types needed by downstream crates — ensures no circular imports and gives a stable API surface before protocol work starts.

**Deliverables:**
- `SyncRule { id, description, parameters, parameter_queries, data_queries }`
- `BucketAssignment { bucket_id, entity_type, entity_id, row_data }`  
- `TokenClaims { sub, tenant_id, exp, custom: HashMap<String, Value> }`
- `PgLsn(u64)` — LSN newtype with ordering
- `Op` enum: `Upsert(serde_json::Value)`, `Delete`, `CrdtPatch(Bytes)`
- `BucketChecksum(u64)` for integrity verification
- `SyncError` enum (thiserror): `BucketAssignmentFailed`, `LsnGap`, `ChecksumMismatch`, `ProtocolError`, `AuthError`
- Serde derives on all public types; `#[non_exhaustive]` on `Op` and `SyncError`

**DoD:** All types serialize/deserialize via `serde_json`; unit tests for serde round-trips.

---

### Wave 2 — SyncRule DSL + BucketAssigner (CRITICAL PATH)

#### `v4-sync-rules-dsl`
**Agent:** frontier  
**Depends on:** `v4-pes-core-types`  
**Summary:** Implement `pes-rules` crate: TOML-based sync rule DSL parser and validator. The DSL defines buckets, their parameter queries (run against Postgres to resolve JWT claims to bucket parameters), and their data queries (which rows each user sees).

**Deliverables:**
- `pes-rules/src/parser.rs`: Deserialize `sync-rules.toml` into `SyncRuleSet`
- `pes-rules/src/validator.rs`: Validate TOML — detect undefined parameters, circular references, missing data queries, SQL injection in query templates
- `pes-rules/src/lib.rs`: public API
- TOML schema documented in `docs/sync-rules-reference.md`
- Test fixtures: `tests/fixtures/valid-rules.toml`, `tests/fixtures/invalid-rules/` (10+ error cases)
- Error messages must cite line/column from TOML file

**DoD:** All fixtures parse correctly; invalid fixtures produce specific, actionable errors; `cargo test` green.

---

#### `v4-bucket-assigner` ⚠️ CRITICAL PATH
**Agent:** frontier  
**Depends on:** `v4-sync-rules-dsl`  
**Summary:** Implement `BucketAssigner` in `pes-rules`: given JWT `TokenClaims` and a `SyncRuleSet`, execute parameter lookup queries against Postgres and return the set of `BucketId`s the user is authorized to subscribe to, along with the SQL filter for their data.

This is the security boundary. A bug here leaks one user's data to another.

**Deliverables:**
- `BucketAssigner` struct with `async fn assign(claims: &TokenClaims, pool: &PgPool) -> Result<Vec<BucketAssignment>, SyncError>`
- Parameter query execution: queries run with `claims.sub` and `claims.tenant_id` as `$1`/`$2` parameters (parameterized, never interpolated)
- Data query binding: substitutes resolved bucket parameters into data query templates using a safe templating engine (not string interpolation)
- Caching: 60-second TTL cache per `(user_id, rule_version)` to avoid repeated Postgres roundtrips
- **Exhaustive test suite** covering: single-bucket user, multi-bucket user, user with no matching bucket, SQL injection attempt via JWT claim fields, expired JWT, malformed claims, Postgres connectivity loss
- Property-based test (proptest): any string in `claims.sub` never produces unparameterized SQL

**DoD:** 100% branch coverage on `assign()`; property test with 10,000 random claim strings passes; no string interpolation of user-controlled values anywhere in the module.

---

### Wave 3 — WAL Pipeline (snapshot + delta)

#### `v4-pes-snapshot`
**Agent:** frontier  
**Depends on:** `v4-bucket-assigner`  
**Summary:** Implement `pes-snapshot` crate: given a `BucketAssignment`, stream the current snapshot of matching rows from Postgres in 10,000-row batches, computing a checksum for integrity verification.

**Deliverables:**
- `SnapshotStream`: async stream of `SnapshotBatch { bucket_id, rows: Vec<Row>, offset: usize, is_last: bool }`
- Checksum: `xxhash3` of all row PKs + versions in sorted order → `BucketChecksum`
- Pagination via keyset (PK-ordered cursor), not `OFFSET` — safe for large tables
- Reuses `frf-postgres-cdc` connection pool management
- Test: deterministic snapshot of a 100K-row test table matches expected checksum

**DoD:** Snapshot of 100K rows completes in <5 seconds on local Postgres; checksum is deterministic.

---

#### `v4-pes-oplog`
**Agent:** frontier  
**Depends on:** `v4-pes-core-types`  
**Summary:** Implement `pes-oplog` crate: a per-bucket append-only op log backed by `frf-store-redb`. Ops are ordered by LSN and can be drained from any checkpoint LSN.

**Deliverables:**
- `BucketOpLog` struct implementing `frf-ports::OpStore` trait
- `async fn append(bucket_id, op: BucketOp) -> Result<PgLsn, SyncError>`
- `async fn drain_since(bucket_id, from_lsn: PgLsn) -> impl Stream<Item = BucketOp>`
- `async fn checksum(bucket_id) -> BucketChecksum` — running checksum for integrity
- Compaction: prune ops older than configurable TTL (default 7 days)
- Test: concurrent appenders + concurrent readers; no dropped ops; no duplicates

**DoD:** 10,000 concurrent ops/second sustained; all ops retrievable by LSN range.

---

#### `v4-wal-to-bucket-router`
**Agent:** frontier  
**Depends on:** `v4-bucket-assigner`, `v4-pes-oplog`  
**Summary:** Wire `frf-postgres-cdc` WAL events through `BucketAssigner` to `BucketOpLog`. When a WAL event arrives for entity type X, the router determines which buckets should receive the change and appends a `BucketOp` to each relevant op log.

**Deliverables:**
- `WalToBucketRouter` struct: consumes `frf-postgres-cdc::ChangeEvent` stream, calls `BucketAssigner.find_affected_buckets(change)`, appends to `BucketOpLog`
- Parallelism: fan-out to N buckets concurrently per WAL event
- Backpressure: if op log write is slow, slow WAL consumption (don't drop events)
- Metrics: events_received_total, events_routed_total, routing_latency_ms
- Test: Postgres table update → correct buckets receive the op; unrelated bucket receives nothing

**DoD:** E2E test: Postgres INSERT → WAL event → routed to exactly the correct buckets within 100ms.

---

### Wave 4 — Wire Protocol + Gateway

#### `v4-psync-protocol`
**Agent:** frontier  
**Depends on:** `v4-pes-core-types`  
**Summary:** Implement `pes-protocol` crate: PSyncV1 binary wire protocol using MessagePack framing over WebSocket. Define all message types with versioning.

**Deliverables:**
- `ServerMessage` enum: `SnapshotBegin`, `SnapshotBatch`, `SnapshotComplete`, `Delta`, `Checkpoint`, `Keepalive`
- `ClientMessage` enum: `Subscribe`, `Ack`, `Write`, `Ping`
- MessagePack codec: `encode(msg) -> Bytes`, `decode(bytes) -> Result<Msg, ProtocolError>`
- Protocol version field in `Subscribe` + server version negotiation response
- Fuzz test (cargo-fuzz): random bytes never panic the decoder

**DoD:** All message types round-trip without loss; fuzz test runs 100,000 iterations without panic.

---

#### `v4-pes-gateway`
**Agent:** frontier  
**Depends on:** `v4-psync-protocol`, `v4-wal-to-bucket-router`  
**Summary:** Implement `pes-gateway` crate: WebSocket server that serves sync clients. Each connection subscribes to buckets, receives snapshot + deltas, and can send write ops upstream.

**Deliverables:**
- `SyncGateway` built on `tokio-tungstenite`
- Connection handler: parse `Subscribe`, validate JWT (HMAC-SHA256 or RS256), call `BucketAssigner`, start snapshot stream, then subscribe to `BucketOpLog` deltas
- Write handling: accept `Write` messages from client, validate entity type, write to Postgres via `frf-ports::OpStore`, emit CRDT patch via `frf-crdt`
- Keepalive: server sends `Keepalive` every 30 seconds
- Graceful disconnect: drain pending ops to client before closing
- Connection limit: configurable max concurrent connections (default 10,000)
- Load test: 1,000 concurrent connections, 100 messages/second/connection

**DoD:** 1,000 concurrent connections sustained for 60 seconds without memory leak or dropped messages.

---

#### `v4-pes-server-binary`
**Agent:** frontier  
**Depends on:** `v4-pes-gateway`  
**Summary:** Create `pes-server` binary: the deployable `prometheus-entity-sync` service with config file, health endpoint, graceful shutdown, and Prometheus metrics.

**Deliverables:**
- `pes-server/src/main.rs`: tokio runtime, config loading, gateway startup
- `config.toml` format: `[server]` (host, port, max_connections), `[postgres]` (url), `[auth]` (jwt_secret or jwks_url), `[sync_rules]` (path), `[metrics]` (port)
- Health endpoint: `GET /health` → `200 OK { "status": "healthy", "connections": N }`
- Prometheus metrics endpoint: `GET /metrics`
- Graceful shutdown: SIGTERM drains connections within 30s
- Docker image: `prometheus-entity-sync:latest` (~80 MB, distroless base)
- `docker-compose.yml` for local development (server + Postgres)

**DoD:** Docker image starts and serves `/health` within 2 seconds; `docker-compose up` brings up a working sync environment.

---

### Wave 5 — TypeScript Client SDK + PEM Integration

#### `v4-entity-sync-ts-sdk`
**Agent:** frontier  
**Depends on:** `v4-psync-protocol` (spec reference), `v4-pes-server-binary` (for integration tests)  
**Summary:** Implement TypeScript client SDK packages: `entity-sync-core` (protocol client), `entity-sync-pglite` (PGlite extension), `entity-sync-react` (React hooks).

**Deliverables:**
- `packages/entity-sync-core/`: WebSocket client, PSyncV1 codec (TypeScript), reconnect (exponential backoff with jitter, max 30s), JWT refresh before expiry, LSN tracking
- `packages/entity-sync-pglite/`: PGlite extension — `syncBucket(config)` applies delta ops to local PGlite tables; handles `upsert`, `delete`, `crdt_patch` op types
- `packages/entity-sync-react/`: `useEntitySync(config)`, `useSyncStatus()` — React 18/19 compatible hooks
- Tests: integration test against `docker-compose` stack; unit tests for reconnect logic, LSN advancement, op application

**DoD:** `entity-sync-react` Vite example in PEM can sync `todos` table bidirectionally; offline/reconnect cycle works.

---

#### `v4-pem-sync-transport`
**Agent:** frontier  
**Depends on:** `v4-entity-sync-ts-sdk`  
**Summary:** Add `prometheusSync()` transport factory to PEM's transport registry, enabling `registerEntityTransport('Todo', prometheusSync({...}))`.

**Deliverables:**
- `packages/entity-sync-pglite/src/pem-transport.ts`: `prometheusSync(config): EntityTransport<T>` — implements the `EntityTransport` interface from `@prometheus-ags/entity-graph-core`
- Bidirectional: incoming deltas call `upsertEntity`/`removeEntity`; outgoing mutations from `useEntityMutation` are queued as `Write` messages
- PEM Vite example: updated `src/shared/db/entity-transports.ts` to use `prometheusSync`
- PEM Next.js example: updated with `prometheusSync` transport

**DoD:** PEM examples compile; two browser tabs in separate windows see each other's writes within 500ms.

---

### Wave 6 — Dart / Flutter SDK

#### `v4-dart-sdk`
**Agent:** frontier  
**Depends on:** `v4-psync-protocol` (spec reference), `v4-pes-server-binary`  
**Summary:** Implement `prometheus_entity_sync` Dart package — pure Dart WebSocket sync client with SQLite persistence via `drift`.

**Deliverables:**
- `sdk-dart/prometheus_entity_sync/`: Dart package (Flutter compatible)
- `SyncClient` class: WebSocket connect, PSyncV1 MessagePack decode (using `messagepack` pub package), JWT management
- `DriftSyncAdapter`: applies delta ops to a `drift` database; generates SQL from `Op` structs
- `SyncStatus` stream: exposes connection state, LSN, pending write count
- Offline queue: `_operation_queue` table in drift DB; drained in LSN order on reconnect
- Flutter example app: tasks/entities sync, works offline, resumes on reconnect
- `pubspec.yaml` ready for pub.dev publish

**DoD:** Flutter integration test: INSERT while offline → reconnect → server receives INSERT in correct order → remote client sees it.

---

### Wave 7 — Rust Client SDK + Tauri Plugin

#### `v4-tauri-plugin`
**Agent:** frontier  
**Depends on:** `v4-pes-gateway`  
**Summary:** Implement Rust sync client SDK (`pes-sdk-rust`) and Tauri plugin (`entity-sync-tauri`). The plugin runs a background sync worker in the Rust backend and exposes Tauri commands to the webview.

**Deliverables:**
- `crates/pes-sdk-rust/`: async WebSocket sync client, PSyncV1 framing, reconnect, SQLite/pglite-oxide persistence adapters
- `packages/entity-sync-tauri/src-tauri/`: Tauri plugin (Rust) — `init_sync`, `get_sync_status`, `pause_sync`, `resume_sync` commands
- `packages/entity-sync-tauri/src/index.ts`: JS bindings using `@tauri-apps/api/tauri`
- pglite-oxide integration: optional feature flag `pglite-oxide` — when enabled, `pes-sdk-rust` uses `PGliteInstance` for storage instead of SQLite
- Tauri example app: demonstrates desktop local-first sync

**DoD:** Tauri example app syncs, works offline, and the webview sees sync status updates in real time.

---

### Wave 8 — AgentSkills.io Skill + Release

#### `v4-entity-sync-skill`
**Agent:** frontier  
**Depends on:** all above  
**Summary:** Author AgentSkills.io compliant `entity-sync` skill and all release artifacts.

**Deliverables:**
- `skills/entity-sync/SKILL.md`: 6 capabilities with tool schemas
- `entity-sync-cli` Rust binary: `validate-rules`, `inspect-oplog`, `simulate-bucket-assignment`, `replay-snapshot` subcommands
- Helm chart: `charts/prometheus-entity-sync/` — Deployment, Service, ConfigMap, HPA
- GitHub Actions: release workflow (build binary, push Docker, publish npm packages, publish pub.dev package)
- `CHANGELOG.md`, `LICENSE` (MIT), `SECURITY.md`
- v1.0.0 tag + GitHub release

**DoD:** `entity-sync-cli validate-rules sync-rules.toml` exits 0 on valid rules; `skills/entity-sync/SKILL.md` passes AgentSkills.io lint.

---

## Wave Summary

| Wave | Changes | Gate | Parallelizable within wave |
|------|---------|------|--------------------------|
| 1 | v4-repo-scaffold, v4-pes-core-types | None | Yes |
| 2 | v4-sync-rules-dsl, v4-bucket-assigner | Wave 1 | Sequential (DSL before Assigner) |
| 3 | v4-pes-snapshot, v4-pes-oplog, v4-wal-to-bucket-router | Wave 2 | snapshot + oplog parallel; router after both |
| 4 | v4-psync-protocol, v4-pes-gateway, v4-pes-server-binary | Wave 3 | protocol parallel with wave 3; gateway after; server after gateway |
| 5 | v4-entity-sync-ts-sdk, v4-pem-sync-transport | Wave 4 | SDK first, PEM transport after |
| 6 | v4-dart-sdk | Wave 4 | Parallel with Wave 5 |
| 7 | v4-tauri-plugin | Wave 5 | — |
| 8 | v4-entity-sync-skill | Wave 7 | — |

**Total: 14 changes across 8 waves.**

---

## Critical Path

```
v4-repo-scaffold
  → v4-pes-core-types
    → v4-sync-rules-dsl
      → v4-bucket-assigner ⚠️  ← MUST have 100% coverage before proceeding
        → v4-wal-to-bucket-router
          → v4-pes-gateway
            → v4-entity-sync-ts-sdk
              → v4-pem-sync-transport
                → v4-entity-sync-skill (v1.0)
```

---

## Model Class Assignments

| Change | Model | Reasoning |
|--------|-------|-----------|
| v4-repo-scaffold | frontier | Sets architectural patterns used by all other changes |
| v4-pes-core-types | frontier | Type system design has long-lived consequences |
| v4-sync-rules-dsl | frontier | Parser + error reporting requires careful design |
| v4-bucket-assigner | frontier | Security-critical; needs deep reasoning |
| v4-pes-snapshot | frontier | Correctness + performance together |
| v4-pes-oplog | frontier | Concurrent data structure correctness |
| v4-wal-to-bucket-router | frontier | Integration of 3 systems |
| v4-psync-protocol | frontier | Wire protocol design is hard to change later |
| v4-pes-gateway | frontier | WebSocket concurrency at scale |
| v4-pes-server-binary | medium | Mostly plumbing |
| v4-entity-sync-ts-sdk | frontier | Client SDK API design + integration |
| v4-pem-sync-transport | medium | Wiring to existing PEM transport interface |
| v4-dart-sdk | frontier | New language target; FFI-adjacent |
| v4-tauri-plugin | frontier | Multi-language boundary (Rust + TS) |
| v4-entity-sync-skill | medium | Docs + tooling |

---

## First Change to Apply

```
/kbd-apply v4-repo-scaffold
```

This creates the repository scaffold and domain types that every other change depends on.
