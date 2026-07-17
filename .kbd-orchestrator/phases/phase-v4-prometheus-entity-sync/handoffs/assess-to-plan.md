# Handoff: assess → plan — phase-v4-prometheus-entity-sync

_Generated: 2026-07-16_

## What the assessment decided

**Verdict: BUILD** — Build `prometheus-entity-sync` as an independent Rust sync engine.

**Key reasons:**
- PowerSync is FSL-1.1-ALv2 licensed; building a competing sync service on its code is prohibited
- FRF (flint-realtime-fabric) already provides 70–80% of the server-side machinery: WAL CDC, CRDT, op log, entity model
- The gap to fill is: sync rule DSL, bucket assigner, snapshot engine, PSyncV1 wire protocol, gateway, and client SDKs

**Architecture chosen:**
- PSyncV1 protocol: WebSocket binary framing, MessagePack encoded
- SyncRule DSL: TOML-based bucket definitions (not YAML — differentiated from PowerSync)
- BucketAssigner: CRITICAL SECURITY BOUNDARY — parameterized SQL only, no string interpolation of JWT values
- FRF reuse: `frf-postgres-cdc` (WAL), `frf-crdt` (Loro), `frf-store-redb` (op log), `frf-ports` (traits)

## What the plan produced

**14 changes across 8 waves:**

| Wave | Changes |
|------|---------|
| 1 | v4-repo-scaffold |
| 2 | v4-pes-core-types |
| 3 | v4-sync-rules-dsl, v4-pes-oplog |
| 4 | v4-bucket-assigner ⚠️ SECURITY, v4-pes-snapshot |
| 5 | v4-wal-to-bucket-router, v4-psync-protocol |
| 6 | v4-pes-gateway, v4-pes-server-binary |
| 6.5 | v4-entity-sync-ts-sdk, v4-pem-sync-transport |
| 7 | v4-dart-sdk |
| 7.5 | v4-tauri-plugin |
| 8 | v4-entity-sync-skill |

**Critical path:** v4-repo-scaffold → v4-pes-core-types → v4-sync-rules-dsl → v4-bucket-assigner → v4-wal-to-bucket-router → v4-pes-gateway → v4-entity-sync-ts-sdk → v4-pem-sync-transport → v4-entity-sync-skill

## What to do next

Run `/kbd-apply v4-repo-scaffold` to begin execution.

The `v4-bucket-assigner` change carries the highest security risk — it is the enforcement boundary between user JWT claims and the data they are allowed to see. The proposal mandates 100% branch coverage, proptest property testing, and a mandatory `security-reviewer` agent sign-off before that change can be marked done.

## Files produced

```
.kbd-orchestrator/phases/phase-v4-prometheus-entity-sync/
├── assessment.md
├── goals.md
├── plan.md
├── progress.json
└── handoffs/
    └── assess-to-plan.md  ← this file

openspec/changes/2026-07-13-v4-prometheus-entity-sync/
├── proposal.md                      # umbrella
├── v4-repo-scaffold/
├── v4-pes-core-types/
├── v4-sync-rules-dsl/
├── v4-bucket-assigner/
├── v4-pes-oplog/
├── v4-pes-snapshot/
├── v4-wal-to-bucket-router/
├── v4-psync-protocol/
├── v4-pes-gateway/
├── v4-pes-server-binary/
├── v4-entity-sync-ts-sdk/
├── v4-pem-sync-transport/
├── v4-dart-sdk/
├── v4-tauri-plugin/
└── v4-entity-sync-skill/

docs/
└── pglite-local-first-architecture-research.md
```
