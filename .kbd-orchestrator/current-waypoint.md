# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 20 of 28 changes
**Current round:** Round 6 (next dependency-ready change)
**Updated:** 2026-08-22T03:55:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-docs-foundation-brand`

## Exact next command

```text
/kbd-apply v3-docs-foundation-brand
```

The skills ecosystem change is certified and archived (2026-08-22): the bundle index now maps all twelve public npm packages plus Dart and the Rust CLI/MCP crates with a package-selection table; new registry-driven export ledgers validate every npm package (`verify:skills` = 12 npm + Dart); all 19 public snippets compile against packed tarballs in a temp consumer (`verify:skills-snippets`); every referenced path exists; and all 18 binding/integration claims are backed by consumer fixtures or examples via `ecosystem-claims.json`. The evidence loop fixed a wholesale stale v2 API in the Surreal live-query skill and a data-flow language violation in the Prisma plugin. Gates: verifier 4/4 lanes (incl. Rust cargo tests), release test 7/7, BDD 3/12, typecheck 23/23, validate + coverage errors []. Next: establish the Prometheus-branded Docusaurus information architecture (`v3-docs-foundation-brand`). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
