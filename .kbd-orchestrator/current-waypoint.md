# Current Waypoint

**Active phase:** `phase-v2-realtime-fabric-parity`
**Previous phase:** `phase-v1-npm-framework`
**KBD process state:** `execution-ready`
**Updated:** 2026-06-21

## Status

v2 Realtime Fabric Parity — **execution dispatched**. Backend = OpenSpec, driven task-by-task via `/kbd-apply`. 8 changes PENDING with per-change model routing. Scope: all four tracks in v2.0 (user-confirmed). No code written yet — this is the dispatch contract.

## Next pending change

`v2-crdt-merge-strategy-port` (foundation — unblocks the AG-UI bridge and Flint adapter)

## Exact next command

```
/kbd-apply v2-crdt-merge-strategy-port
```
**BRANCH GATE first:** create `feat/v2-realtime-fabric-parity` before `/kbd-apply` writes code (currently on `main`). Then Round 2 (`v2-agui-ingestion-bridge`, `v2-flint-realtime-adapter`) unblocks once C1 is DONE.

## Execution rounds

**Round 1 (parallel, no deps):**
- `v2-crdt-merge-strategy-port` (C1) — MergeStrategy port + Loro
- `v2-tauri-sqlite-persistence` (C4)
- `v2-devtools-time-travel` (C5)
- `v2-incremental-query-spike` (C7, gated — may slip to v2.1)
- `v2-eslint-layering-rule` (C8)

**Round 2 (depend on Round 1):**
- `v2-agui-ingestion-bridge` (C2 ← C1) — headline agentic feature
- `v2-flint-realtime-adapter` (C3 ← C1) — named CRITICAL integration
- `v2-devtools-graph-visualization` (C6 ← C5)

## Key constraints

- All integration libs (loro-crdt, @ag-ui/*, frf-sdk, @tauri-apps/plugin-sql) ship as **optional peer deps**; core stays zustand+immer.
- `frf-sdk` not on npm → Flint adapter degrades gracefully.
- Every export-touching change (C1–C4) must run `pnpm run refresh:exports` + pass `pnpm run verify:skills` (CLAUDE.md immutable gate).

## Artifacts

- `phases/phase-v2-realtime-fabric-parity/assessment.md`
- `phases/phase-v2-realtime-fabric-parity/analysis.md` + `library-candidates.json`
- `phases/phase-v2-realtime-fabric-parity/plan.md`
- `phases/phase-v2-realtime-fabric-parity/decision-log.md`
- `openspec/changes/v2-0-realtime-fabric-parity/` (umbrella) + 8 child changes
