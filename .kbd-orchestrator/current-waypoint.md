# Current Waypoint

**Active phase:** `full-3.0-release`
**Status:** `executing`
**Backend:** OpenSpec
**Implementation progress:** 21 of 28 changes
**Current round:** Round 6 (next dependency-ready change)
**Updated:** 2026-08-22T06:55:00Z

## Execution

The reviewed 28-change plan is dispatched through OpenSpec and the KBD-aware `/kbd-apply` task loop. Deep-research and Feynman readiness artifacts are under `.research/full-3.0-release-execution-readiness/`.

## Next pending change

`v3-docs-api-reference`

## Exact next command

```text
/kbd-apply v3-docs-api-reference
```

The docs foundation change is certified and archived (2026-08-22): a private pnpm workspace site (`site/`) now runs Docusaurus 3.10.2 with all @docusaurus/* packages pinned to one version, Prometheus ember brand tokens (`--prometheus-*`, provenance in `docs/branding/ASSETS.md`), accessible light/dark themes, a responsive landing page, product/packages/examples navigation, local search, Mermaid, SEO/social metadata, and canonical edit links into this repo. Broken links/anchors throw; the verifier's isolation lane proves no Docusaurus dependency can leak into publishable packages. Gates: verifier 4/4 lanes (incl. clean static build asserting 404/sitemap/search-index/social-card routes), release test 10/10, BDD 3/13, typecheck 23/23, validate errors []. The evidence loop fixed a prism-svelte grammar crash, a clsx false positive in the isolation scan, and a node_modules walker leak. Next: generate the complete multi-language API and package reference (`v3-docs-api-reference`). `v3-release-certification` and `v3-stable-publication` remain human-gated and are the hand-off boundary.

## Operator follow-up

`origin/codex/full-3.0-continue` holds a never-merged parallel implementation of the Next.js change with library-level fixes (scoped graph runtime, GC/listener handling). Decide whether those warrant their own OpenSpec change; see `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/release-impact.md`.
