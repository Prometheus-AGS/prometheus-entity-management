# Current Waypoint

**Active phase:** `phase-v2-realtime-fabric-parity`
**Previous phase:** `phase-v1-npm-framework`
**KBD process state:** `implemented`
**Updated:** 2026-06-21

## Status

v2 Realtime Fabric Parity — **all 8 changes IMPLEMENTED** on branch `feat/v2-realtime-fabric-parity`. Gates: typecheck ✓, 201 tests pass, verify:skills ✓ (189 exports), treeshake ✓. 4 commits (317c572, bebad5f, bf1d005, 3bfecf2).

| Change | Status | Commit |
|---|---|---|
| C1 CRDT MergeStrategy port + Loro | DONE | 317c572 |
| C4 Tauri/SQLite persistence | DONE | bebad5f |
| C8 ESLint layering rule | DONE | bebad5f |
| C5 time-travel DevTools | DONE | bf1d005 |
| C6 graph-viz DevTools | DONE | bf1d005 |
| C2 AG-UI ingestion bridge | DONE | 3bfecf2 |
| C3 Flint adapter | DONE | 3bfecf2 |
| C7 incremental spike (ceiling-doc) | DONE | 3bfecf2 |

## Carried-forward note

- **C3 Flint live test deferred** until `@prometheusags/frf-sdk` is published/linkable (built against the minimal-surface facade + optional peer; unit-tested with a fake client).

## Exact next command

```
/kbd-reflect
```
Then `/opsx:verify` + `/opsx:archive` per change and open a PR for `feat/v2-realtime-fabric-parity`.

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
