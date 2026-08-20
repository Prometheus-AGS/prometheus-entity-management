# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 16 of 28 changes
**Current round:** Round 5 (next dependency-ready change)
**Updated:** 2026-08-20T15:53:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-flutter-riverpod-a2ui-example`

## Exact next command

```text
/kbd-apply v3-flutter-riverpod-a2ui-example
```

The agentic A2UI example is certified and archived (2026-08-20): a keyless deterministic A2A v1 agent streams official A2UI v0.9.1 surfaces; actions cross the allowlisted catalog with tenant authorization and human approval for destructive ops; happy/denied/malformed/cancelled flows are pinned by golden fixtures and 4/4 Chromium tests with zero serious/critical axe violations. Build the complete Flutter/Riverpod mobile example on the certified Dart graph next. `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
