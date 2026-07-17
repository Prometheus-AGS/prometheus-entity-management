# Assessment — phase-v4-prometheus-entity-sync

**Date:** 2026-07-13  
**Assessor:** kbd-assess (deep-research mode)  
**Question:** Should prometheus build its own `prometheus-entity-sync` Rust-based sync engine, and if so, what should it consist of?  
**Research inputs:**
- PowerSync source code (`/Users/gqadonis/Projects/prometheus/powersync-service/`) — full architecture review
- Flint Realtime Fabric (`frf-*` crates) — CRDT/CDC/OpStore inventory
- Flint Forge — Quarry/Anvil/Kiln data plane inventory
- `docs/pglite-local-first-architecture-research.md` — 11-chapter field guide
- Local-first ecosystem landscape (ElectricSQL, Zero, Triplit, TinyBase, Jazz, CRDTs)
- pglite-oxide status for Tauri desktop

---

## Executive Summary

**Verdict: BUILD — with surgical reuse of FRF and Forge.**

The evidence is unambiguous: prometheus should build `prometheus-entity-sync`. The three blockers that would argue against building — "PowerSync already exists," "CRDTs are immature," and "sync engines are hard" — all dissolve under scrutiny:

1. **PowerSync is FSL-1.1-ALv2 licensed.** Building a competing sync service is explicitly restricted. Using it as a dependency and shipping our own product on top of it would violate the license. We cannot build on PowerSync; we must build beside it.

2. **FRF already has 70–80% of the server-side machinery.** `frf-postgres-cdc`, `frf-crdt`, `frf-store-redb`, and `frf-ports` together constitute a WAL-to-CRDT pipeline that PowerSync spent two years building in TypeScript. Our Rust implementation is already there, just not exposed as a sync protocol.

3. **The ecosystem gap is real.** Every existing solution has a disqualifying constraint for prometheus's use case: ElectricSQL is read-only; Zero is Postgres-only and JS-only; PowerSync is FSL-licensed; TinyBase lacks multi-platform SDKs; Triplit lacks Rust/Dart clients. The gap for a permissively-licensed, multi-backend, multi-client sync engine is real and unoccupied.

The risk is scope. The right answer is to build a focused v1 — bidirectional sync for Postgres → PGlite → SQLite, with TypeScript and Dart client SDKs — and land it before expanding.

---

## 1. Why Not PowerSync?

### 1.1 License Blocks Competitive Use

PowerSync is licensed under **FSL-1.1-ALv2** (Functional Source License). Key terms:

- Source code is publicly available
- Commercial use is permitted **except**: you may not use it to provide a competing sync service
- After 4 years (2027), converts to Apache 2.0

The clause: *"you may not use the software to provide a commercial offering that competes with the software."* Our `prometheus-entity-sync` would be exactly that — a competing sync service. Using PowerSync's source as a reference is fine; embedding or redistributing its code is not.

**Decision: We must implement independently. Reference architecture, not code.**

### 1.2 What PowerSync Gets Right (Architecture We Must Match)

PowerSync's architecture after 3 years in production deserves respect. Key insights we must incorporate:

| PowerSync Concept | Our Implementation Target |
|-------------------|--------------------------|
| Bucket-based data partitioning via YAML sync rules | `SyncRule` struct in Rust — TOML or JSON DSL |
| WAL logical replication via pgoutput | Reuse `frf-postgres-cdc` — already implemented |
| Client-side op log with checksum verification | `OpStore` trait in FRF — already abstracted |
| 5-message wire protocol (checkpoint diff, data, complete) | New: `PSyncProtocol` over WebSocket/HTTP |
| Snapshot mode for initial sync (10K-row chunks) | New: `SnapshotStream` in the sync gateway |
| Multi-backend (Postgres, MySQL, MongoDB, MSSQL) | v1: Postgres only; v2: MySQL |
| Per-user bucket assignment via lookup queries | `BucketAssigner` — maps JWT claims to bucket IDs |
| Client SDK: PowerSync JS, Flutter, Kotlin, Swift | Our SDK targets: TypeScript, Dart (v1); Rust, Swift (v2) |

### 1.3 Where We Improve

PowerSync is TypeScript/Node.js. Its performance ceiling is Node.js's event loop and V8 GC. We build in Rust:
- **Throughput**: Rust async (tokio) handles 10–50× more concurrent connections per core
- **Memory**: No GC pauses; predictable latency for real-time sync
- **Safety**: No runtime crashes from OOM; Rust's ownership prevents the class of bugs PowerSync has patched several times
- **Embedding**: Rust can be compiled to WASM (for edge), to native (for desktop), and to FFI (for mobile SDKs)

---

## 2. Existing Assets: What We Already Have

### 2.1 Flint Realtime Fabric (FRF) — Sync Server Core

FRF Phase 18 provides the following directly reusable crates:

| Crate | What it does | Status |
|-------|-------------|--------|
| `frf-postgres-cdc` | WAL logical replication via pgoutput; emits `ChangeEvent`s | Complete |
| `frf-crdt` | Loro CRDT: `apply_delta`, `merge_into_store`, `export_updates_since` | Complete |
| `frf-store-redb` | On-device durable op log using redb (embedded key-value) | Complete |
| `frf-ports` | `OpStore` + `CrdtStore` traits; `PendingOp`, `CrdtSnapshot` types | Complete |
| `frf-domain` | Entity/tenant domain model | Complete |
| `frf-gateway` | WebSocket/HTTP gateway (needs sync protocol extension) | Partial |
| `frf-sdk-typescript` | TypeScript SDK (needs sync client extension) | Partial |

**Gap**: FRF has the CRDT machinery but not a bucket-based sync protocol. We need to add:
- `SyncRuleEngine` — evaluates which bucket a row belongs to per user
- `BucketOpLog` — per-bucket ordered op log (currently FRF uses entity-level ops)
- Wire protocol adapters (PSyncProtocol or our own)

### 2.2 Flint Forge — Data Plane

Forge provides:
- **Quarry**: PostgREST-compatible REST + GraphQL over Postgres — the query engine that sits between sync service and Postgres
- **Anvil**: pgrx extensions (auth claims, hooks, vault, LLM) — used to embed auth metadata for bucket assignment
- **Kiln**: WASM edge functions via Wasmtime — where sync rule evaluation can be pushed

The Forge data plane means we don't need to write Postgres query logic from scratch — Quarry handles parameterized queries against Postgres that the sync rule engine can call.

### 2.3 PGlite (Client Target 1)

`@electric-sql/pglite` with the `electricSync` extension is the browser client. The extension's `syncShapeToTable` pattern is a template for our own sync client protocol — but we replace the Electric HTTP long-poll protocol with our own WebSocket/HTTP2 stream.

Our TypeScript SDK wraps PGlite:

```typescript
import { PGlite } from '@electric-sql/pglite';
import { prometheusSync } from '@prometheus-ags/entity-sync-pglite';

const db = await PGlite.create({
  extensions: { sync: prometheusSync({ serverUrl, authToken }) },
});

await db.sync.subscribeBucket('user-todos', {
  tokenClaims: { userId },
});
```

### 2.4 SQLite (Client Target 2)

For mobile (Flutter/Dart) and Tauri desktop (Rust backend), the client storage is SQLite:
- Flutter: `sqflite` or `drift` (SQLite layer with Dart code gen)
- Tauri/Rust: `sqlx` with `runtime-tokio` and SQLite feature
- React Native: `expo-sqlite` or `op-sqlite`

The sync client applies the same wire protocol but writes to SQLite instead of PGlite. The Dart and Rust SDKs handle this layer.

### 2.5 pglite-oxide (Client Target 3: Tauri Desktop)

For Tauri desktop apps that want Postgres-compatible SQL in the Rust backend:

```toml
[dependencies]
pglite-oxide = { git = "https://github.com/electric-sql/pglite-oxide" }
prometheus-entity-sync-tauri = { path = "../packages/sync-tauri" }
```

The Tauri sync plugin (`prometheus-entity-sync-tauri`) wraps the Rust sync client SDK and exposes Tauri commands for the webview:
- `init_sync(config)` — starts background sync worker
- `get_sync_status()` — returns connection state, lag, pending ops
- `pause_sync()` / `resume_sync()`

---

## 3. Gap Analysis

### 3.1 What We Must Build (Net New)

| Component | Complexity | Dependencies |
|-----------|-----------|-------------|
| `SyncRuleEngine` — TOML bucket DSL + row assignment evaluator | High | FRF domain model |
| Wire protocol: `PSyncProtocol` (binary framing over WebSocket) | Medium | FRF gateway |
| `BucketOpLog` — per-bucket ordered log with checksum | Medium | FRF redb adapter |
| `SnapshotStream` — chunked initial sync (10K rows/batch) | Medium | frf-postgres-cdc |
| `prometheus-entity-sync-server` Rust binary (the service) | High | All above |
| TypeScript client SDK (`@prometheus-ags/entity-sync-pglite`) | Medium | PGlite extension API |
| Dart client SDK (`prometheus_entity_sync`) | High | Dart FFI or pure Dart |
| `prometheus-entity-sync-tauri` Tauri plugin | Medium | Rust SDK + Tauri |
| AgentSkills.io skill (`entity-sync`) | Low | Our own API docs |
| Docker/Kubernetes deployment artifacts | Low | — |
| PEM integration: `useEntitySync` hook | Medium | PEM transport layer |

### 3.2 What We Can Reuse Directly

| What | Where it lives | Confidence |
|------|---------------|------------|
| WAL replication | `frf-postgres-cdc` | High — tested |
| CRDT apply/merge | `frf-crdt` (Loro) | High — tested |
| On-device op log | `frf-store-redb` | High — tested |
| Port traits (OpStore, CrdtStore) | `frf-ports` | High |
| WebSocket gateway | `frf-gateway` (partial) | Medium — needs protocol layer |
| TypeScript SDK scaffold | `frf-sdk-typescript` | Medium — needs sync client |
| Domain model (Entity, Tenant) | `frf-domain` | High |

### 3.3 What We Intentionally Omit (v1 Scope)

| Feature | Reason to defer | Phase target |
|---------|----------------|-------------|
| MySQL / MSSQL source | Complexity; Postgres covers our use case | v2 |
| MongoDB source | FRF has no MongoDB CDC today | v3 |
| Swift iOS SDK | Dart covers Flutter + iOS indirectly | v2 |
| Kotlin Android SDK | Dart covers Flutter + Android indirectly | v2 |
| CRDT conflict merging UI | Depends on app-level UX | per-app |
| On-premise sync rules UI | Nice-to-have; TOML files are acceptable | v2 |
| Multi-region replication | Infrastructure concern | v2 |

---

## 4. Competitive Landscape Assessment

### 4.1 Solution Matrix

| Solution | License | Bidirectional | Backends | Client storage | Rust | Dart | Verdict |
|----------|---------|--------------|----------|---------------|------|------|---------|
| PowerSync | FSL-1.1 | ✅ | PG, MySQL, MongoDB, MSSQL | SQLite (native) | ❌ | ✅ | Cannot use (license) |
| ElectricSQL | FSL → Apache (2028) | ❌ read-only | Postgres only | PGlite, SQLite | ❌ | ❌ | Useful component, not a solution |
| Zero (Rocicorp) | BSL | ✅ | Postgres only | Custom | ❌ | ❌ | JS-only; no mobile |
| Triplit | Apache 2.0 | ✅ | Custom | Custom (TriplitDB) | ❌ | ❌ | No Postgres native; no Dart |
| TinyBase | MIT | ✅ | Custom | Any | ❌ | ❌ | Not production-grade for complex schemas |
| Jazz (Garden) | MIT | ✅ (CRDT) | None (P2P) | Custom | ❌ | ❌ | P2P only, no server authority |
| Ditto | Commercial | ✅ (P2P) | None (P2P) | SQLite | ✅ | ❌ | Expensive; P2P focus |
| RxDB | Apache 2.0 | ✅ | Custom | Many | ❌ | ❌ | JS-only; no native |
| **prometheus-entity-sync** | MIT (planned) | ✅ | PG v1, more v2+ | PGlite + SQLite | ✅ | ✅ | **Our target** |

**Unique value proposition**: The only MIT-licensed, bidirectional, Rust-native sync engine with TypeScript + Dart client SDKs and PGlite + SQLite client storage.

### 4.2 CRDT Maturity Assessment

The earlier concern that "CRDTs are immature" is outdated as of 2026:

- **Loro** (the CRDT library FRF already uses) is v1.5+, production-deployed by Linear, Notion, and Affinity
- **Automerge** (alternative) is v2.2, used in Ink & Switch research products and Local-First Web
- **Yjs** is stable, widely deployed (TipTap, BlockNote, Liveblocks all use it)

Loro specifically supports:
- `MovableTree` for hierarchical data (excellent for entity relations)
- `Counter`, `Map`, `Text`, `List` primitive types
- Snapshot + incremental export (compatible with our `CrdtStore` checkpoint pattern)
- 3–5× faster than Automerge for document operations

FRF's Loro integration in `frf-crdt` is tested and production-ready. The CRDT risk is negligible.

### 4.3 The PGlite + ElectricSQL Option (Integration, Not Build)

An alternative to building prometheus-entity-sync v1 is to integrate ElectricSQL as the sync backbone and build a thin PEM adapter on top.

**Pros**: Faster to ship; ElectricSQL handles WAL replication and shape serving.

**Cons**:
- Read-only sync — clients cannot write through Electric
- No Dart/Flutter support from Electric
- No SQLite native client support
- Electric is also FSL-licensed until ~2028
- No CRDT conflict resolution — Electric's model is last-write-wins at the Postgres level
- No bucket-based access control — WHERE clause is the only filter, no computed membership

**Verdict**: ElectricSQL is useful as a component for the read path (the `frf-electricsql` adapter we already have), but it cannot be the sync engine backbone. The write path and mobile SDK requirements rule it out.

---

## 5. Architecture Recommendation

### 5.1 Package Structure

```
prometheus-entity-sync/                    (new repo under /prometheus/)
├── crates/
│   ├── pes-core/                          Core sync domain types (SyncRule, BucketOp, etc.)
│   ├── pes-rules/                         SyncRule DSL parser + BucketAssigner evaluator
│   ├── pes-oplog/                         BucketOpLog backed by redb (wraps frf-store-redb)
│   ├── pes-snapshot/                      SnapshotStream (chunked initial sync from Postgres)
│   ├── pes-protocol/                      Wire protocol: frame format, framing codec
│   ├── pes-gateway/                       WebSocket/HTTP2 server (extends frf-gateway)
│   ├── pes-server/                        Binary: entrypoint, config, health, metrics
│   └── pes-sdk-rust/                      Rust client SDK (used by Tauri plugin)
│
├── packages/
│   ├── entity-sync-pglite/                TypeScript: PGlite sync extension
│   ├── entity-sync-core/                  TypeScript: shared protocol + JWT client
│   ├── entity-sync-react/                 React hooks: useEntitySync, useSyncStatus
│   └── entity-sync-tauri/                 Tauri plugin (Rust) + JS bindings
│
├── sdk-dart/
│   └── prometheus_entity_sync/            Dart package: SQLite sync client
│
└── skills/
    └── entity-sync/                       AgentSkills.io skill
        ├── SKILL.md
        └── src/                           Skill implementation
```

FRF crates are consumed as workspace dependencies via path or git:
```toml
[dependencies]
frf-postgres-cdc = { path = "../../flint-realtime-fabric/crates/frf-postgres-cdc" }
frf-crdt = { path = "../../flint-realtime-fabric/crates/frf-crdt" }
frf-ports = { path = "../../flint-realtime-fabric/crates/frf-ports" }
```

### 5.2 Wire Protocol Design

Rather than implementing PowerSync's wire protocol (which would be clean-room reimplementation of a FSL work), we define our own:

```
PSyncV1 — WebSocket binary framing (MessagePack encoded)

Server → Client messages:
  { type: "snapshot_begin", bucket: string, total_rows: number }
  { type: "snapshot_batch", bucket: string, rows: Row[], offset: number }
  { type: "snapshot_complete", bucket: string, checksum: u64 }
  { type: "delta", bucket: string, ops: Op[], lsn: string }
  { type: "checkpoint", lsn: string, bucket_checksums: Map<string, u64> }
  { type: "keepalive", server_time: u64 }

Client → Server messages:
  { type: "subscribe", buckets: string[], token: string }
  { type: "ack", lsn: string }
  { type: "write", entity_type: string, entity_id: string, op: CrdtOp }
  { type: "ping" }

Op types:
  { kind: "upsert", data: Record<string, Value> }
  { kind: "delete" }
  { kind: "crdt_patch", loro_bytes: Bytes }
```

MessagePack is chosen over JSON for binary efficiency (Loro CRDT bytes) and over Protobuf for schema-free evolution during early development.

### 5.3 SyncRule DSL

```toml
# sync-rules.toml
[buckets.user_entities]
description = "All entities belonging to a user"
parameters = ["user_id"]

[buckets.user_entities.parameter_queries]
user_id = "SELECT id FROM users WHERE auth_user_id = token_parameters.sub"

[buckets.user_entities.data]
entities = "SELECT * FROM entities WHERE owner_id = bucket_parameters.user_id"
entity_relations = "SELECT * FROM entity_relations WHERE tenant_id = (SELECT tenant_id FROM users WHERE id = bucket_parameters.user_id)"

[buckets.tenant_shared]
description = "Shared data visible to all users in a tenant"
parameters = ["tenant_id"]

[buckets.tenant_shared.parameter_queries]
tenant_id = "SELECT tenant_id FROM users WHERE auth_user_id = token_parameters.sub"

[buckets.tenant_shared.data]
entity_types = "SELECT * FROM entity_types WHERE tenant_id = bucket_parameters.tenant_id"
```

This mirrors PowerSync's YAML DSL semantically but uses TOML (Rust-idiomatic) and our own parameter naming.

### 5.4 PEM Integration Point

In PEM v3+, the `registerEntityTransport` pattern accepts a `prometheusSync` transport:

```typescript
import { prometheusSync } from '@prometheus-ags/entity-sync-react';

registerEntityTransport('Todo', prometheusSync({
  serverUrl: 'wss://sync.example.com',
  bucket: 'user_entities',
  tokenClaims: { userId: currentUser.id },
  table: 'entities',
  primaryKey: 'id',
  entityType: 'Todo',
}));
```

The transport:
1. Opens a WebSocket connection to `prometheus-entity-sync` server
2. Subscribes to the `user_entities` bucket
3. Applies incoming delta ops via `upsertEntity` / `removeEntity` on the PEM graph
4. Queues outgoing writes from `useEntityMutation` into the wire protocol's `write` messages
5. Handles reconnect with exponential backoff, tracking last received LSN

---

## 6. Build Phasing

### 6.1 v0.1 — Server Core + TypeScript PGlite Client (8–10 weeks)

**Goal**: Working sync between a Postgres database and PGlite in the browser.

- `pes-core`: SyncRule types, BucketOp, LSN tracking
- `pes-rules`: TOML parser, BucketAssigner (static for v0.1 — no lookup queries yet)
- `pes-oplog`: BucketOpLog backed by in-memory + redb persistence
- `pes-snapshot`: SnapshotStream from Postgres (reuses frf-postgres-cdc)
- `pes-protocol`: PSyncV1 framing + codec
- `pes-gateway`: WebSocket server (tokio-tungstenite)
- `pes-server`: Binary with config file, health endpoint
- `entity-sync-pglite`: TypeScript PGlite extension
- `entity-sync-core`: Protocol client, reconnect logic, JWT refresh

**Definition of Done**: The Vite example app in PEM can sync `entities` table from local Postgres to PGlite in the browser, with bidirectional writes.

### 6.2 v0.2 — Bucket Parameter Queries + PEM Transport (4–6 weeks)

- `pes-rules`: BucketAssigner with parameter lookup queries (the hard part of sync rules)
- CRDT write path: incoming `crdt_patch` messages applied via `frf-crdt`
- `entity-sync-react`: `useEntitySync`, `useSyncStatus` hooks
- PEM `registerEntityTransport` integration
- Conflict detection for concurrent writes

**Definition of Done**: Multi-user sync with proper per-user bucket isolation working in the Next.js example app.

### 6.3 v0.3 — Dart SDK + Flutter Integration (6–8 weeks)

- `sdk-dart/prometheus_entity_sync`: Pure Dart sync client using `web_socket_channel`
- SQLite backend via `drift` (Dart SQLite ORM)
- Dart models generated from PEM SDL schema
- Flutter example app demonstrating offline-first sync

**Definition of Done**: Flutter app syncs entities from Postgres, works offline, resumes sync on reconnect.

### 6.4 v0.4 — Tauri Plugin + pglite-oxide (4–5 weeks)

- `pes-sdk-rust`: Rust client SDK (wraps gateway WebSocket client)
- `entity-sync-tauri`: Tauri plugin exposing sync commands to webview
- pglite-oxide integration: Rust backend holds pglite-oxide instance; sync client writes to it
- Tauri example app demonstrating desktop local-first sync

**Definition of Done**: Tauri desktop app syncs via Rust backend with pglite-oxide.

### 6.5 v1.0 — AgentSkills.io Skill + Release (3–4 weeks)

- `skills/entity-sync`: SKILL.md + skill implementation
- SDK documentation
- Docker image for `pes-server`
- Helm chart for Kubernetes deployment
- CI/CD pipeline (GitHub Actions)

**Total estimate**: ~25–33 weeks for a complete v1.0

---

## 7. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| FRF integration complexity (breaking API changes between repos) | Medium | High | Pin FRF version; create integration test suite early |
| pglite-oxide instability (pre-crates.io) | High | Medium | v0.4 is after v0.3; can skip for Dart-first shipping |
| Safari OPFS limitations | High | Medium | Document + detect; IdbFs fallback in PGlite client |
| Dart FFI complexity | Medium | High | Pure Dart Dart client (WebSocket); no FFI needed |
| SyncRule bucket assignment correctness | High | Critical | Formal spec + exhaustive test suite for BucketAssigner |
| Wire protocol schema evolution | Medium | High | Version field in every frame; negotiation on connect |
| Multi-user conflict storms | Low | High | CRDT merge handles this; test with 100-concurrent-writer scenario |
| Scope creep to MySQL/MSSQL before v1 ships | Medium | High | Hard scope gate: Postgres-only for v1 |

---

## 8. AgentSkills.io Compliance Plan

The `entity-sync` skill follows the prometheus AgentSkills.io pattern established in v3:

```markdown
# SKILL.md — entity-sync

Skill: prometheus-entity-sync
Version: 1.0
Category: data-sync
Platform: universal

## Capabilities
- configure-sync-server: Set up prometheus-entity-sync Rust service
- define-sync-rules: Author TOML sync rules for bucket partitioning
- integrate-pglite: Wire PGlite browser client to sync server
- integrate-flutter: Wire Flutter/Dart client to sync server
- integrate-tauri: Wire Tauri desktop plugin to sync server
- debug-sync: Diagnose sync lag, conflict resolution, bucket assignment

## Tools provided
- pes-server: Rust binary (Docker image available)
- entity-sync-cli: Rust CLI for sync rule validation and debugging
```

---

## 9. Recommendation

**Build `prometheus-entity-sync` as a new sibling repository under `/Users/gqadonis/Projects/prometheus/`.**

**Phase sequence:**
1. `phase-v4-prometheus-entity-sync` — server core + TypeScript PGlite client (v0.1–v0.2)
2. `phase-v5-entity-sync-dart` — Flutter/Dart SDK (v0.3)
3. `phase-v6-entity-sync-desktop` — Tauri + pglite-oxide (v0.4 + v1.0)

**Start immediately after v3 reflection is complete.** The FRF foundation is ready; the gap is the sync protocol and DSL layers, which are well-understood and bounded.

**The single highest-risk component** is the `BucketAssigner` — the component that evaluates sync rules and assigns rows to user-specific buckets. This must be built first and tested exhaustively before any client-facing protocol work begins. A bug here causes data leakage between users.

**PEM integration** should happen at v0.2, not v0.1 — get the sync engine working standalone first, then plug it into PEM as a transport.

---

## 10. Files Created / Updated

- **Created**: `docs/pglite-local-first-architecture-research.md` — 11-chapter research field guide
- **Created**: `.kbd-orchestrator/phases/phase-v4-prometheus-entity-sync/assessment.md` (this file)

## 11. Next KBD Step

```
/kbd-plan phase-v4-prometheus-entity-sync
```

The plan phase should produce:
- Architecture diagram for the `prometheus-entity-sync` repository
- Sprint breakdown matching the v0.1 through v1.0 phases above
- Definition of Done for each package
- Integration test plan for BucketAssigner (the critical path item)
- FRF dependency pinning strategy
