# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 26 of 28 changes
**Current round:** Round 8 (release certification is the human gate)
**Updated:** 2026-08-23T07:30:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-release-certification` — **human gate; do not start autonomously.**

## Exact next command

```text
/kbd-apply v3-release-certification   # requires explicit operator authorization
```

The GitHub Pages docs change is certified and archived (2026-08-23): `.github/workflows/docs-pages.yml` adapts the proven sibling Pages workflow — SHA-pinned checkout/configure/upload/deploy actions, PR build-only validation (upload + deploy jobs are main-only, so PRs can never deploy), serialized main deployment into the protected `github-pages` environment, and release-aware `DOCS_VERSION_LABEL` 3.0 navbar labeling. Production is gated on build (links throw), `verify:docs-snippets`, and a new 6-lane quality gate `scripts/verify-docs-pages-quality.mjs`: search index, 9 deep-route probes returning non-empty 200 under `/prometheus-entity-management/`, secrets scan, absolute-path scan, axe a11y in both themes, and Lighthouse budgets (declared in `site/lighthouse-budgets.json`, enforced from resource measurements since LH13 removed the native budget audit). The gates caught and fixed real pre-deployment defects: internal absolute paths leaked into the bundle (new `strip-build-paths.mjs` postbuild), systemic light-theme link contrast (3.71:1 → 5.17:1), prism token contrast in both themes, color-only content links, uncrawlable sidebar categories, and dark inline-code contrast (4.49 → ≈5.0). The deployment URL is recorded in `release/docs-site.json` and `RELEASING.md` points the 3.0 release at it. Gates: verifier 3/3 lanes, quality 6/6, release test 10/10, BDD 3/14, all five docs regressions green, typecheck 23/23, validate errors [], eslint clean, openspec strict valid. First live deployment is operator-confirmed (Pages must be enabled for the repo). **Boundary reached: the remaining changes — `v3-release-certification` (27) and `v3-stable-publication` (28) — are the human-gated hand-off and are not started autonomously.**

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
