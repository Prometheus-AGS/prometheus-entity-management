# Analysis — phase-v2-realtime-fabric-parity

**Stage:** Analyze (engineering-landscape research → build-vs-adopt)
**Mode:** Stack-specified (TypeScript / React / Zustand library — no stack discovery needed)
**Date:** 2026-06-21
**Inputs:** `assessment.md` (7 gaps GAP-1..GAP-7 + deferred GAP-8 WebRTC)
**Budget:** tier caps 8 queries / 20 min — used 2 (gh/local), 14 (npm registry), 4 (web). Under budget; no cap hit.

This stage converts the assessment's gaps into evidence-backed adopt / adapt / reference / reject verdicts. The machine contract is `library-candidates.json`; this file is the narrative.

---

## Headline finding: GAP-1 is a *bridge*, not a build

The single most important discovery this stage: **the Flint side already ships the integration seam.** `flint-realtime-fabric/sdks/entity-management/` contains a working `@prometheusags/frf-entity-management` package (v0.1.0, updated 2026-06-19) with:

```ts
class RealtimeAdapter {
  async *watchEntities(query: EntityQuery): AsyncIterable<EntityEvent>
  async mutateEntity(record: EntityRecord): Promise<void>
}
// EntityEvent = { entityType, entityId, tenantId, channelId, data, offset: bigint, correlationId? }
```

Critically, this facade **JSON-decodes the spine envelope payload** and exposes a plain `EntityEvent` — it does **not** leak proto/tonic types. That directly resolves assessment **Q1**: we build against this stable entity-shaped facade plus our own `RealtimeAdapter`/`ChangeSet` contract. The unfrozen `proto-v1` risk is contained inside `frf-sdk`, *below* the seam we consume. We do **not** wait for proto freeze.

Constraint: `@prometheusags/frf-sdk` is **not on npm** (workspace-only). Therefore our published package must treat Flint as an **optional peer dependency** — `createFlintAdapter()` ships, but importing it requires the consumer to have `frf-sdk` installed. Same pattern we already use for `@tanstack/react-table` (optional peer).

`EntityEvent.offset` is `bigint` — maps to our adapter's checkpoint/resume semantics (the SurrealDB live adapter already proves the checkpoint-store pattern).

---

## Per-gap verdicts

### GAP-1 — Flint integration → **ADAPT (cand-001) + BUILD glue**
Wrap `watchEntities()` AsyncIterable → our `ChangeSet` stream → `RealtimeManager` (16ms coalescing already exists). Map `mutateEntity()` to optimistic graph writes. Flint = optional peer dep. **Highest strategic priority, now de-risked.**

### GAP-2 — CRDT merge → **ADOPT Loro (cand-002) behind a BUILT MergeStrategy port**
Loro 1.13.5 (MIT, updated *today*) wins the 2026 crdt-benchmarks across the board, uses the Fugue algorithm (maximal non-interleaving), and ships a **movable Tree + LWW-Map** — the LWW-Map maps cleanly onto our `type:id:field` entity model. Its Rust core also aligns with Flint's Rust fabric (likely the same engine, reducing double-merge risk). Automerge (cand-003) and Yjs (cand-004) are **reference** — kept reachable through the port but not adopted (Automerge = heavier history model; Yjs = document/collab-oriented data model with more impedance to a normalized graph). **Do not hard-wire any engine** — the port is the deliverable; Loro is the one reference impl. Watch Flint's Loro-vs-Automerge decision (Q2).

### GAP-3 — Incremental queries → **REFERENCE only; ceiling + virtualization for v2.0**
d2ts (cand-007) is the engine behind TanStack DB's sub-ms live queries, but it's `0.1.8` (pre-production). TanStack DB itself (cand-010) is the closest competitor and a study target — **never a dependency** (adopting it surrenders our ecosystem-agnostic moat). Decision on **Q3**: for v2.0, document a scale ceiling for `view/evaluator` re-derivation and lean on `@tanstack/react-virtual` (already a dependency). Schedule a **v2.x research spike** on differential dataflow once d2ts stabilizes. Do not block v2.0.

### GAP-4 — Agent ingestion (AG-UI) → **ADOPT @ag-ui/core types (cand-005) + BUILD the bridge**
This is the **highest-leverage, lowest-effort win**, confirmed by research: AG-UI `STATE_DELTA` is **RFC-6902 JSON Patch**, and our `patchEntity()` is already JSON-Patch-shaped. `applyAgUiDelta(graph, event)` is a small module. AG-UI is the de-facto protocol (Google/LangChain/AWS/MS/Mastra/PydanticAI). Risk: `@ag-ui/*` is `0.0.57` (pre-1.0) — pin it, keep it an **optional peer dep**, isolate behind our bridge. Use `fast-json-patch` (cand-006) **only if** `@ag-ui/client` doesn't already expose an applier (prefer reusing AG-UI's — one fewer dep; Spec stage confirms). **Scope (Q4): ingestion bridge first, not a full AG-UI client.** Note on **A2A/A2UI**: Agent2Agent is agent↔agent — that's Flint's `frf-agentproto` concern, consumed via the Flint adapter (GAP-1), not this bridge. AG-UI covers the agent→UI direction we need here.

### GAP-5 — Time-travel DevTools → **BUILD on existing in-repo materials**
No embeddable third party (Redux/TanStack DevTools don't fit our Zustand-graph panel). But the raw materials already exist in-repo: `graph-actions.ts` (action log), `exportGraphSnapshot`, `devtools-event-bus` (ring buffer + replay). Build a timeline tab (state-before/after diff), snapshot import/export, pin-to-entity, and a **graph-relationship visualization** tab (we *store* a graph but never *draw* it — clear differentiator). Automerge's history model (cand-003) is worth referencing for time-travel UX ideas.

### GAP-6 — SQLite/Tauri persistence → **ADOPT @tauri-apps/plugin-sql (cand-008) + BUILD adapter**
v2.4.0, stable, official. Implement a `GraphPersistenceAdapter` (our get/set/remove contract already abstracts storage) over Tauri SQL for desktop. **Reject wa-sqlite (cand-009)** — browser SQL is already covered by our PGlite adapter; no second wasm engine. SQLite need is real only on Tauri/native.

### GAP-7 — Layering enforcement → **ADAPT: start with eslint no-restricted-imports (cand-011)**
No off-the-shelf plugin enforces our specific Component→Hook→Store rule. Cheapest path: an `eslint` `no-restricted-imports` rule banning `./graph`/`useGraphStore` in component files, before investing in a custom AST plugin. Promote to a published `eslint-plugin-prometheus-entity` only if the simple rule proves insufficient.

### GAP-8 — WebRTC/P2P → **DEFER (confirmed)**
Owned by the Flint fabric (str0m/LiveKit signaling). Consume through the Flint adapter; do not re-implement in the entity layer.

---

## Build-vs-adopt summary

| Gap | Adopt | Build (glue/seam) |
|---|---|---|
| GAP-1 Flint | frf-entity-management facade (optional peer) | `createFlintAdapter()` → ChangeSet/RealtimeManager + checkpoint |
| GAP-2 CRDT | Loro (reference impl) | `MergeStrategy` port at `upsertEntity` |
| GAP-3 incremental | — (reference d2ts/TanStack DB) | doc ceiling + virtualization now; spike later |
| GAP-4 AG-UI | @ag-ui/core types (optional peer) | `applyAgUiDelta` / `applyAgUiSnapshot` bridge |
| GAP-5 devtools | — | timeline + diff + graph-viz + import/export on existing event-bus/action-log |
| GAP-6 SQLite | @tauri-apps/plugin-sql | Tauri-SQL `GraphPersistenceAdapter` |
| GAP-7 lint | eslint no-restricted-imports | rule config (later: custom plugin) |

**Five build_required items** flow to Plan as build tasks (see `library-candidates.json` → `build_required`). All five are *glue against adopted libraries*, not from-scratch subsystems — the architecture (RealtimeAdapter contract, GraphPersistenceAdapter, patch layer, event-bus, action-log) already provides every seam.

---

## Open questions resolved vs. still open

- **Q1 (Flint sequencing):** RESOLVED → build against the frf-entity-management facade + our contract now; proto freeze is not a blocker.
- **Q2 (CRDT engine):** RESOLVED in approach → engine-agnostic `MergeStrategy` port + Loro reference impl; mirror Flint's final choice when made.
- **Q3 (incremental):** RESOLVED → ceiling + virtualization for v2.0; d2ts spike deferred to v2.x.
- **Q4 (AG-UI scope):** RESOLVED → ingestion bridge first, not a full client.
- **Q5 (devtools host):** RESOLVED → extend our EntityExplorer (add time-travel + graph-viz), do not adopt an external host.

**Still open for Spec/Plan / user:**
- Should v2.0 ship all four tracks, or is Track A (Agent+Fabric) a standalone v2.0 with B/C/D as v2.1+? (Sequencing/scope call — recommend Track A as v2.0 headline.)
- Confirm `@ag-ui/*` and `frf-sdk` are acceptable as **optional peer deps** (keeps core bundle lean; matches existing `@tanstack/react-table` precedent).
- Whether to reuse AG-UI's bundled JSON-Patch applier vs. adding `fast-json-patch` (Spec-stage detail).

---

### Confidence
High on GAP-1, GAP-2, GAP-4, GAP-6 (strong registry + in-repo + Flint-repo evidence). Medium on GAP-3 (deliberately deferred; depends on d2ts maturing). Medium-high on GAP-5/GAP-7 (in-repo materials confirmed; effort is the variable). No budget cap was hit.
