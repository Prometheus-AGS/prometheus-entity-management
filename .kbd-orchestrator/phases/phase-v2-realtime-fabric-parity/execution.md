EXECUTION: phase-v2-realtime-fabric-parity
Project: prometheus-entity-management (@prometheus-ags/prometheus-entity-management)
Date: 2026-06-21
Selected backend: openspec (driven via /kbd-apply)
Dispatched to: claude-code (self) for frontier/medium changes; codex (parallel worktree) eligible for C4; opencode for C8
Backend rationale: openspec/ exists at root + project.json declares an openspec block; the plan emitted 8 OpenSpec changes under umbrella v2-0-realtime-fabric-parity. Spec-backed traceability is required (CLAUDE.md skills↔exports gate is verifiable per change). Per the execute protocol, task execution routes through /kbd-apply — never bare /opsx:apply.
Backend entrypoint: /kbd-apply v2-crdt-merge-strategy-port  (then per execution-round order)
OpenSpec available: YES
Source plan: .kbd-orchestrator/phases/phase-v2-realtime-fabric-parity/plan.md

EXECUTION SCOPE

- v2-crdt-merge-strategy-port: pluggable MergeStrategy seam + Loro reference impl (foundation)
- v2-agui-ingestion-bridge: applyAgUiDelta/Snapshot into the graph (← C1)
- v2-flint-realtime-adapter: createFlintAdapter() over frf-entity-management facade (← C1)
- v2-tauri-sqlite-persistence: GraphPersistenceAdapter over @tauri-apps/plugin-sql
- v2-devtools-time-travel: timeline + state diff + snapshot import/export
- v2-devtools-graph-visualization: relationship/graph viz tab (← C5)
- v2-incremental-query-spike: differential-dataflow spike (GATED; may slip to v2.1)
- v2-eslint-layering-rule: enforce Component→Hook→Store

MODEL ROUTING NOTE
project.json has no model_policy block. Resolving model class → concrete model with
current defaults: frontier → Opus 4.8 · medium → Sonnet 4.6 · small → Haiku 4.5.

DISPATCH CONTRACTS

- v2-crdt-merge-strategy-port → claude-code (self)
  Entry: /kbd-apply v2-crdt-merge-strategy-port
  Model class: frontier   Concrete model: Opus 4.8
  Model rationale: new core abstraction (MergeStrategy port) at the graph write path; cross-cutting; >8 tasks.
  Progress file: .kbd-orchestrator/phases/phase-v2-realtime-fabric-parity/progress.json
  Handoff: update progress.json per task; on DONE run QA gate → kbd-apply verify → archive.

- v2-agui-ingestion-bridge → claude-code (self)
  Entry: /kbd-apply v2-agui-ingestion-bridge
  Model class: frontier   Concrete model: Opus 4.8
  Model rationale: novel agent-state→graph path mapping; integration design decisions (applier choice).
  Progress file: (same)   Depends on: v2-crdt-merge-strategy-port

- v2-flint-realtime-adapter → claude-code (self)
  Entry: /kbd-apply v2-flint-realtime-adapter
  Model class: frontier   Concrete model: Opus 4.8
  Model rationale: cross-repo integration; optional-peer graceful degradation; checkpoint/resume correctness.
  Progress file: (same)   Depends on: v2-crdt-merge-strategy-port

- v2-tauri-sqlite-persistence → codex (parallel worktree) OR claude-code
  Entry: /kbd-apply v2-tauri-sqlite-persistence
  Model class: medium   Concrete model: Sonnet 4.6
  Model rationale: bounded adapter implementing an existing contract; one module boundary.
  Progress file: (same)

- v2-devtools-time-travel → claude-code (self)
  Entry: /kbd-apply v2-devtools-time-travel
  Model class: frontier   Concrete model: Opus 4.8
  Model rationale: new UI surface + diff logic over existing action log; >8 tasks across UI.
  Progress file: (same)

- v2-devtools-graph-visualization → claude-code (self)
  Entry: /kbd-apply v2-devtools-graph-visualization
  Model class: medium   Concrete model: Sonnet 4.6
  Model rationale: bounded UI tab reusing relations registry + selection context.
  Progress file: (same)   Depends on: v2-devtools-time-travel

- v2-incremental-query-spike → roo-architect → claude-code
  Entry: /kbd-apply v2-incremental-query-spike
  Model class: frontier   Concrete model: Opus 4.8
  Model rationale: research + benchmark + DECISION gate; architectural risk assessment.
  Progress file: (same)   GATED: may slip to v2.1 with ceiling-doc floor deliverable.

- v2-eslint-layering-rule → opencode (or cline)
  Entry: /kbd-apply v2-eslint-layering-rule
  Model class: small   Concrete model: Haiku 4.5
  Model rationale: config + fixtures + docs; ≤3 effective files, single layer.
  Progress file: (same)

EXECUTION ROUND ORDER
Round 1 (parallel): v2-crdt-merge-strategy-port, v2-tauri-sqlite-persistence, v2-devtools-time-travel, v2-incremental-query-spike, v2-eslint-layering-rule
Round 2 (parallel): v2-agui-ingestion-bridge (←C1), v2-flint-realtime-adapter (←C1), v2-devtools-graph-visualization (←C5)

APPROVAL GATES

- BRANCH GATE (before any code application): currently on `main`. Create a feature branch
  (e.g. feat/v2-realtime-fabric-parity) before /kbd-apply writes code. No code is written
  during /kbd-execute — this gate is for the apply step.
- FLINT DEPENDENCY GATE (C3): @prometheusags/frf-sdk is not on npm. Confirm workspace link
  or preview availability before applying C3; otherwise C3 proceeds with the minimal-surface
  shim + optional-peer guard only (no live integration test until frf-sdk is reachable).
- C7 DECISION GATE: spike must produce a written adopt-later-vs-ceiling-doc decision; if it
  overruns its time-box it slips to v2.1 with the ceiling-doc as the v2.0 deliverable.

FALLBACK CONDITIONS

- If /kbd-apply cannot drive a change task-by-task with inspectable progress → stay on openspec but execute manually, documenting why.
- If a parallel tool (codex) cannot keep scope bounded to the change → reassign to claude-code (self).

VERIFICATION REQUIREMENTS

- Per change: `pnpm run typecheck` + `pnpm run test`
- Export-touching changes (C1, C2, C3, C4): `pnpm run refresh:exports` + `pnpm run verify:skills` (CLAUDE.md immutable gate)
- Tree-shake gate where devtools/actions touched: `pnpm run check:treeshake`
- Pre-release: `pnpm run prepublishOnly` dry path (typecheck + build + test + verify:skills)

PER-CHANGE QA GATE (artifact-refiner)
After each change → DONE: /refine-validate "<change-id>" before archive.
Skip QA when: <3 files modified, docs-only, or --skip-qa. (C8 likely skip-eligible; C7 ceiling-doc-only may skip.)

PROGRESS LEDGER

- [PENDING] v2-crdt-merge-strategy-port — claude-code (frontier)
- [PENDING] v2-agui-ingestion-bridge — claude-code (frontier)
- [PENDING] v2-flint-realtime-adapter — claude-code (frontier)
- [PENDING] v2-tauri-sqlite-persistence — codex/claude-code (medium)
- [PENDING] v2-devtools-time-travel — claude-code (frontier)
- [PENDING] v2-devtools-graph-visualization — claude-code (medium)
- [PENDING] v2-incremental-query-spike — roo-architect/claude-code (frontier, gated)
- [PENDING] v2-eslint-layering-rule — opencode (small)

OUTPUTS

- 8 implemented OpenSpec changes (code + tests) under umbrella v2-0-realtime-fabric-parity
- New optional-peer integrations: loro-crdt, @ag-ui/*, frf-sdk, @tauri-apps/plugin-sql
- Updated skills↔exports ledger; CHANGELOG; spec delta for v2.0

BLOCKERS

- frf-sdk not on npm (C3) — see Flint dependency gate. Not blocking C1/C2 or other changes.

REFLECTION HANDOFF

- kbd-reflect should consume: per-change DONE/BLOCKED status, the C7 spike decision (adopt-later vs ceiling-doc), whether any optional-peer integration needed contract changes, and whether the CRDT engine should track Flint's final Loro-vs-Automerge decision (a possible follow-up change).

EXECUTION READY
