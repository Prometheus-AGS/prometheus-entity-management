# Verification: v3-docs-github-pages

**Date:** 2026-08-23
**Verifier:** `scripts/verify-docs-pages.mjs` (3 lanes) → `evidence/v3-docs-github-pages/verification.json` — **PASS**
**Quality gates:** `scripts/verify-docs-pages-quality.mjs` (6 lanes) → `evidence/v3-docs-github-pages/quality.json` — **PASS**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| ------------------------- | -------- | ------ |
| PRs cannot deploy | Release test asserts the deploy job's `if` requires `refs/heads/main` and excludes `pull_request`; the artifact upload step is main-only too, so PRs leave no deployable artifact | PASS |
| Only protected `main` publishes to `github-pages` | Deploy job binds `environment: github-pages` (protection rules are repo settings), runs only on main, and is serialized via `concurrency: pages-deploy, cancel-in-progress: false` | PASS |
| Representative deep routes return non-empty 200 under `/prometheus-entity-management/` | Route-probe lane serves the production build with a base-path-aware static server and asserts 200 + ≥512 bytes for 9 routes (home, product, guides, packages, examples, integrations, migration, operations, api) | PASS |
| Deployment URL recorded; 3.0 release points to it | `release/docs-site.json` records the canonical URL/base path/environment/workflow; release test asserts it matches `site/docusaurus.config.js` defaults and that `RELEASING.md` points at it | PASS |
| Quality-gated production (build, links, snippets, search index, route probes, accessibility, Lighthouse budgets, no secrets/internal paths) | Quality lanes: searchIndex, routeProbes, secretsScan, absPathScan, a11y (axe, both themes), lighthouse (category floors + declared resource budgets). Workflow runs build (links throw), `verify:docs-snippets`, and `verify:docs-pages-quality` before any deploy | PASS |
| Adapt proven sibling Pages workflow (SHA-pinned actions, serialized deploy, environment protection) | `.github/workflows/docs-pages.yml` adapts `prometheus-skill-pack/.github/workflows/docs-pages.yml`: same pinned SHAs for checkout v4 / configure-pages v5 / upload-pages-artifact v3 / deploy-pages v4, same serialization and environment shape | PASS |
| Release-aware 3.x docs labeling | Navbar "v3.0 docs" item driven by `DOCS_VERSION_LABEL` (set to `3.0` in the workflow, recorded in `release/docs-site.json`) | PASS |

## Defects found by the new gates and fixed

The quality gates caught real, pre-existing defects before first deployment:

1. **Internal absolute paths in the deployed bundle** — Docusaurus serializes
   resolved config (`require.resolve` paths) into the client bundle, leaking
   the build machine's workspace path. New `scripts/strip-build-paths.mjs`
   postbuild rewrites the workspace prefix to a stable placeholder in all text
   assets; wired into the site `build` script.
2. **Systemic link color-contrast failure (light theme)** — brand primary
   `#e04e28` measured 3.71:1 on the surface background (WCAG needs 4.5:1).
   Light primary scale shifted to the darker ember (`#b93f20`, 5.17:1).
3. **Links distinguishable by color alone** — content links now underlined
   (WCAG 1.4.1 / Lighthouse link-in-text-block).
4. **Prism syntax-token contrast** — github light theme tokens `#e3116c`
   (4.32), `#d73a49` (4.30), `#36acaa` (2.58), `#999988` (2.71), `#00a4db`
   (2.68) and dracula comment `rgb(98,114,164)` (3.02) remapped to accessible
   values via a theme-object override in `docusaurus.config.js` (inline styles
   make CSS overrides impossible without `!important`).
5. **Dark-mode inline-code contrast** — `#ff6a3d` on `#323234` measured 4.49:1;
   dark primary nudged to `#ff7a4d` (≈5.0:1).
6. **Uncrawlable sidebar category anchors** — all 9 sidebar categories rendered
   as `<a>` without `href` (Lighthouse crawlable-anchors); each now carries a
   `generated-index` link.

## Toolchain note

Lighthouse 13 removed the built-in `performance-budget` audit
(`--budgets-path` no longer exists). The declared budgets in
`site/lighthouse-budgets.json` are therefore enforced by the quality script
against the real Lighthouse run's `resource-summary`/`third-party-summary`
measurements — same intent, current API. Performance category floor is 0.7
(local-serve variance); accessibility/best-practices/SEO floors are 0.95 and
measured at 1.0/1.0/1.0 on home and 0.97–1.0 on deep routes after the fixes.

## Gates run (this session, all green)

- `pnpm run verify:docs-pages` — 3 lanes PASS (workflow-contract, static-build, quality-gates)
- `pnpm run verify:docs-pages-quality` — 6 lanes PASS
- `pnpm run test:v3-docs-github-pages` — 10/10
- `pnpm run bdd:docs-pages` — 3 scenarios / 14 steps
- Regression: foundation 10/10, api-reference 10/10, concepts 8/8, examples 10/10, operations 12/12, typecheck 23/23, validate errors [], eslint clean, openspec `--strict` valid

## Retained limits

- **First live deployment is operator-confirmed.** GitHub Pages must be
  enabled for the repository (deploy-from-GitHub-Actions source), and the
  `github-pages` environment's protection rules are repo settings this change
  cannot prove. The workflow is merge-safe: it deploys only from protected
  `main` after all gates pass.
- **PR-time runtime is bounded** (~install + build + gates); the a11y and
  Lighthouse lanes run on 9 probe routes / 3 Lighthouse routes respectively.
- The `docs-sync.yml`-style cross-repo sync the sibling repo performs is out
  of scope; this repo's site is self-contained.
