# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 25 of 28 changes
**Current round:** Round 7 (next dependency-ready change)
**Updated:** 2026-08-23T06:45:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-docs-github-pages`

## Exact next command

```text
/kbd-apply v3-docs-github-pages
```

The operations/migration docs change is certified and archived (2026-08-23): 13 pages — 3 migration guides (`site/docs/migration/`: v2-to-v3, alpha-to-stable, compatibility-policy) with canonical breaking-change tables and explicit before/after guidance, plus 10 operations pages (`site/docs/operations/`: release-notes, release-runbook, security, performance, testing, deployment, troubleshooting, faq, contributing, skills-usage) — wired into a new `operationsSidebar` + "Operations" navbar item. Six raw `.ts/.tsx` upgrade-validation fixtures under `tests/release/fixtures/upgrade/` compile against the 12 packed packages via the snippet harness's new whole-file mode (`--ext .ts,.tsx`), so migration recipes are not prose-only. The release test (12/12) enforces the content contract: breaking-change token pairs, fixture references, security tenant-boundary/secret-handling markers, runbook↔automation consistency (publish.yml + `release:rc:*` scripts + 7 journal states + immutability/corrective recovery), sidebar reachability, alt text. Gates: verifier 5/5 lanes (snippet-compile 53/30 docs, fixture-compile 6/6, release-gate, static-build, routes), BDD 3/14, typecheck 23/23, validate errors [], all four docs regressions green, eslint clean, openspec strict valid. Next: GitHub Pages deployment (`v3-docs-github-pages`). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
