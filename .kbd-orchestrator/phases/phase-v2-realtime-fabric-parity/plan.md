PLAN: phase-v2-realtime-fabric-parity
Project: prometheus-entity-management (@prometheus-ags/prometheus-entity-management)
Date: 2026-06-21
OpenSpec available: YES
Backend: OpenSpec (root openspec/ + project.json openspec block)
Model gate: Opus 4.8 (frontier) — kbd-plan frontier requirement satisfied
Changes to implement: 8 (all four tracks — user-selected scope: full v2.0)
Umbrella change: v2-0-realtime-fabric-parity (groups the 8 child changes)

SCOPE DECISION (user-confirmed 2026-06-21): All four tracks ship in v2.0.
Trade-off surfaced (S-03): C7 (incremental-query spike) is research-flavored and is
the schedule risk. It is planned as a time-boxed SPIKE with a decision gate, not a
guaranteed feature — it may produce a "documented ceiling + virtualization" outcome
rather than a differential-dataflow engine, and must NOT block the v2.0 release of
C1-C6/C8. All other changes are deterministic build/glue work against adopted libraries.

────────────────────────────────────────────────────────────────────────
CHANGE LIST (ordered by dependency, then customer value)
────────────────────────────────────────────────────────────────────────

1. v2-crdt-merge-strategy-port — Pluggable MergeStrategy seam + Loro reference impl
   - library: cand-002 (loro-crdt, ADOPT) | cand-003/004 (reference)
   - addresses: GAP-2
   - Scope: core (graph.ts upsert seam, new src/merge/) — no UI
   - Depends on: NONE
   - Recommended agent: Claude Code
   - Est. complexity: L
   - Complexity score: High
   - Model class: frontier
   - Customer value: MEDIUM (enables collaborative/agentic multi-writer correctness)
   - Details: Introduce a MergeStrategy port invoked at upsertEntity (default = current
     LWW). Ship one optional Loro-backed strategy (lazy dynamic import; loro-crdt as
     optional peer dep). Wire syncMetadata.origin into conflict resolution. This is the
     FOUNDATION for correct concurrent writes from both Flint realtime (C2) and AG-UI
     agents (C3), so it goes first.

2. v2-agui-ingestion-bridge — applyAgUiDelta / applyAgUiSnapshot into the graph
   - library: cand-005 (@ag-ui/core types, ADOPT optional peer) | cand-006 (fast-json-patch, conditional)
   - addresses: GAP-4
   - Scope: core (new src/agent/ag-ui-bridge.ts) — no UI
   - Depends on: v2-crdt-merge-strategy-port (deltas may conflict → route through MergeStrategy)
   - Recommended agent: Claude Code
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (the headline agentic feature; smallest-surface highest-leverage win)
   - Details: STATE_SNAPSHOT → replaceEntity/upsert; STATE_DELTA (RFC-6902 JSON Patch) →
     patchEntity (already JSON-Patch-shaped) or canonical write via MergeStrategy. Map
     agent-state JSON paths to type:id:field. Prefer @ag-ui/client's bundled patch applier;
     add fast-json-patch only if absent (Spec confirms). @ag-ui/* = optional peer dep.

3. v2-flint-realtime-adapter — createFlintAdapter() over frf-entity-management facade
   - library: cand-001 (@prometheusags/frf-entity-management, ADAPT optional peer)
   - addresses: GAP-1 (named CRITICAL priority)
   - Scope: core (new src/adapters/flint.ts) — wires into existing RealtimeManager
   - Depends on: v2-crdt-merge-strategy-port (realtime conflicts → MergeStrategy)
   - Recommended agent: Claude Code
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: frontier
   - Customer value: HIGH (the named strategic integration)
   - Details: Wrap Flint RealtimeAdapter.watchEntities() AsyncIterable → our ChangeSet
     stream feeding RealtimeManager (16ms coalescing). Map mutateEntity() to optimistic
     writes. offset(bigint) ↔ our checkpoint-store resume (mirror surreal-live pattern).
     frf-sdk stays OPTIONAL peer (not on npm) — published build must not hard-depend on it.

4. v2-tauri-sqlite-persistence — GraphPersistenceAdapter over @tauri-apps/plugin-sql
   - library: cand-008 (@tauri-apps/plugin-sql, ADOPT) | cand-009 (wa-sqlite, REJECT)
   - addresses: GAP-6
   - Scope: core (new src/adapters/tauri-sql-persistence.ts)
   - Depends on: NONE (independent — implements existing GraphPersistenceAdapter contract)
   - Recommended agent: Codex (parallel, isolated) or Claude Code
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (Tauri desktop local-first parity)
   - Details: Implement get/set/remove over Tauri SQL for desktop on-device persistence,
     pairing with existing PGlite (browser) adapter. Tauri plugin = optional peer dep.

5. v2-devtools-time-travel — Timeline + state diff + snapshot import/export in EntityExplorer
   - library: none (BUILD on in-repo graph-actions log + exportGraphSnapshot + event-bus)
   - addresses: GAP-5
   - Scope: ui (src/ui/entity-explorer/ new timeline tab)
   - Depends on: NONE (uses existing action log + snapshot export)
   - Recommended agent: Claude Code (UI)
   - Est. complexity: L
   - Complexity score: High
   - Model class: frontier
   - Customer value: HIGH (debuggability of the new realtime/agent surface)
   - Details: New "Timeline" tab driven by graph-actions records: jump-to-state, before/after
     diff, snapshot import/export buttons, pin-to-entity watch. Reference Automerge (cand-003)
     history UX for ideas. Wires existing materials; no new core data structures.

6. v2-devtools-graph-visualization — Relationship/graph viz tab in EntityExplorer
   - library: none (BUILD; lightweight — reuse existing relations registry)
   - addresses: GAP-5
   - Scope: ui (src/ui/entity-explorer/ new graph tab)
   - Depends on: v2-devtools-time-travel (shares panel chrome/selection context)
   - Recommended agent: Claude Code (UI)
   - Est. complexity: M
   - Complexity score: Medium
   - Model class: medium
   - Customer value: MEDIUM (we store a graph but never draw it — clear differentiator)
   - Details: Render entities-as-nodes / relations-as-edges from the crud/relations registry
     + lists. Click-through to detail pane (existing). Keep dependency-light (no heavy graph lib
     unless Spec justifies); SVG/canvas first.

7. v2-incremental-query-spike — Differential-dataflow evaluation SPIKE (time-boxed)
   - library: cand-007 (@electric-sql/d2ts, REFERENCE) | cand-010 (TanStack DB, REFERENCE)
   - addresses: GAP-3
   - Scope: core (research + view/evaluator benchmark harness) — SPIKE, gated outcome
   - Depends on: NONE (independent research)
   - Recommended agent: Roo Code (Architect mode) → Claude Code
   - Est. complexity: L
   - Complexity score: High
   - Model class: frontier
   - Customer value: LOW-MEDIUM (scale headroom; not user-visible if outcome = ceiling)
   - Details: Time-boxed. Benchmark current view/evaluator re-derivation vs d2ts at 10k/100k
     rows. DECISION GATE: adopt differential engine OR ship documented scale ceiling +
     @tanstack/react-virtual guidance. MUST NOT block v2.0 of the other changes — if the spike
     overruns, it slips to v2.1 with the ceiling-doc as the v2.0 deliverable.

8. v2-eslint-layering-rule — Enforce Component→Hook→Store (no direct store import in components)
   - library: cand-011 (eslint no-restricted-imports, ADAPT)
   - addresses: GAP-7
   - Scope: tooling (eslint config + docs; later optional eslint-plugin-prometheus-entity)
   - Depends on: NONE
   - Recommended agent: OpenCode or Cline (quick targeted)
   - Est. complexity: S
   - Complexity score: Low
   - Model class: small
   - Customer value: MEDIUM (enforces the core architectural discipline for large apps)
   - Details: Add no-restricted-imports rule banning ./graph / useGraphStore in component files
     (**/components/**, non-hook .tsx). Document the rule. Promote to a custom AST plugin only
     if the simple rule proves insufficient.

────────────────────────────────────────────────────────────────────────
EXECUTION ROUND ORDER
────────────────────────────────────────────────────────────────────────
Round 1 (parallel, no deps):
   C1 v2-crdt-merge-strategy-port
   C4 v2-tauri-sqlite-persistence
   C5 v2-devtools-time-travel
   C7 v2-incremental-query-spike
   C8 v2-eslint-layering-rule
Round 2 (parallel, depend on Round 1):
   C2 v2-agui-ingestion-bridge      (← C1)
   C3 v2-flint-realtime-adapter     (← C1)
   C6 v2-devtools-graph-visualization (← C5)

Critical path: C1 → {C2, C3}  (CRDT port unblocks both agent + realtime writers)
Headline value path: C1 → C2 (AG-UI bridge) and C3 (Flint adapter) are the named priorities.

────────────────────────────────────────────────────────────────────────
DEPENDENCY POSTURE (applies to all relevant changes)
────────────────────────────────────────────────────────────────────────
- loro-crdt (C1), @ag-ui/* (C2), @prometheusags/frf-sdk (C3), @tauri-apps/plugin-sql (C4)
  ALL ship as OPTIONAL peer dependencies — matching the existing @tanstack/react-table
  precedent. Core bundle stays lean (zustand + immer only); consumers opt in per integration.
- frf-sdk is NOT on npm — C3 consumes via workspace link / preview; published build degrades
  gracefully (importing createFlintAdapter without frf-sdk installed throws a clear error).

────────────────────────────────────────────────────────────────────────
IMMUTABLE CONSTRAINT (CLAUDE.md skills-sync gate)
────────────────────────────────────────────────────────────────────────
Every change that touches src/index.ts public exports MUST:
  - run `pnpm run refresh:exports` (updates prometheus-entity-skills/_shared/references/
    library-exports.json)
  - update related skill docs so `pnpm run verify:skills` passes in CI
This applies to C1, C2, C3, C4 (new exports) — bake into each change's tasks + verification.

────────────────────────────────────────────────────────────────────────
COMMANDS TO RUN (OpenSpec)
────────────────────────────────────────────────────────────────────────
/opsx:new v2-crdt-merge-strategy-port
/opsx:new v2-agui-ingestion-bridge
/opsx:new v2-flint-realtime-adapter
/opsx:new v2-tauri-sqlite-persistence
/opsx:new v2-devtools-time-travel
/opsx:new v2-devtools-graph-visualization
/opsx:new v2-incremental-query-spike
/opsx:new v2-eslint-layering-rule

────────────────────────────────────────────────────────────────────────
SYCOPHANCY SELF-CHECK
────────────────────────────────────────────────────────────────────────
- S-02 (Agreement Without Grounding): User chose "all four tracks." Grounded — analyze showed
  every change except C7 is deterministic glue against adopted libs (low feasibility risk).
  C7's research risk is surfaced and de-risked via a decision gate + slip allowance.
- S-07 (Scope Creep Flattery): Scope = exactly the 8 changes mapping to the 7 assessed gaps
  (GAP-5 → 2 changes). No speculative additions. GAP-8 (WebRTC) explicitly DEFERRED to Flint.
- S-03 (Caveat Collapse): Trade-offs surfaced — C7 is a gated spike that may slip; frf-sdk
  unpublished forces optional-peer + graceful-degradation; CRDT engine tracks Flint's pending
  Loro-vs-Automerge decision (may require a second strategy impl later).

PLAN COMPLETE
