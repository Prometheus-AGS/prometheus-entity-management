# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 15 of 28 changes
**Current round:** Round 5 (next dependency-ready change)
**Updated:** 2026-08-20T14:13:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-agentic-a2ui-example`

## Exact next command

```text
/kbd-apply v3-agentic-a2ui-example
```

The Next.js App Router example is certified and archived (2026-08-20): per-request SSR graph isolation, hydration boundary with no mismatch or duplicate fetch, dynamic `/release-showcase` route, browser E2E 4/4, BDD 3/3, and the empty changeset keeps `changeset status` green. Note: `position.json`/`progress.json` were reconciled this session — 15 changes are archived, not the 7 the previous waypoint claimed. Build the deterministic A2A agent emitting official A2UI surfaces for the shared domain next. `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
