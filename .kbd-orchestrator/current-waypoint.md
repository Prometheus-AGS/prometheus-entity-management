# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 22 of 28 changes
**Current round:** Round 6 (next dependency-ready change)
**Updated:** 2026-08-22T09:55:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-docs-concepts-packages`

## Exact next command

```text
/kbd-apply v3-docs-concepts-packages
```

The API reference change is certified and archived (2026-08-22): `scripts/generate-api-reference.mjs` drives TypeDoc 0.28.20 over the 12 publishable npm packages (566 stable exports with signatures + canonical source links), renders deterministic MDX under `site/docs/api/npm/`, generates 12 package chooser pages (install, peer/runtime matrix, stability badge, bundle metadata), and produces dartdoc + rustdoc artifacts under `site/static/api/` linked from curated entry pages. The doc-coverage policy fails on vanished exports, newly undocumented exports, and baseline shrinkage (`site/api-docs-baseline.json`, 209 baseline entries); it caught three stale `@internal` tags on public exports on first runs. Gates: verifier 4/4 lanes, release test 10/10, BDD 3/14, typecheck 23/23, validate errors [], foundation regression 10/10. Retained limits: Dart undocumented coverage (dartdoc index has no comment signal) and Rust symbol-level ratcheting. Next: write the complete conceptual and framework guide set (`v3-docs-concepts-packages`). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
