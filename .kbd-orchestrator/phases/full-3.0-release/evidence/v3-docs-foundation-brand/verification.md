# Verification: v3-docs-foundation-brand

**Date:** 2026-08-22
**Verifier:** `scripts/verify-docs-foundation.mjs` (4 lanes) → `evidence/v3-docs-foundation-brand/verification.json` — **PASS**

## Acceptance matrix

| Plan acceptance criterion | Evidence | Result |
| ------------------------- | -------- | ------ |
| Brand assets have documented provenance and accessible alternatives | `docs/branding/ASSETS.md` (asset inventory + provenance + alternatives table); `brandAssets` lane asserts assets exist, provenance markers present, navbar logo alt text configured | PASS |
| Mobile/desktop nav builds | `static-build` lane: `site/build/index.html` + all section routes built; responsive breakpoints in `index.module.css` (`@media (max-width: 996px)`) and navbar title collapse rule in `custom.css` | PASS |
| Dark mode builds | `custom.css` `[data-theme='dark']` token set; `respectPrefersColorScheme: true`; `prometheus-mark-dark.svg` selected via `srcDark` | PASS |
| 404 route builds | `site/build/404.html` asserted by verifier | PASS |
| Search builds | `@easyops-cn/docusaurus-search-local@0.55.2` registered; `site/build/search-index.json` asserted | PASS |
| Sitemap builds | `site/build/sitemap.xml` asserted, contains product/packages/examples routes | PASS |
| Social card route builds | `site/build/img/social-card.png` asserted; `themeConfig.image` + `og:*`/`twitter:card` metadata configured | PASS |
| Broken links/anchors fail CI | `onBrokenLinks: 'throw'` + `onBrokenMarkdownLinks: 'throw'` in config; build lane runs the real `docusaurus build` | PASS |
| Docusaurus dependencies cannot leak into publishable packages | `dependencyIsolation` lane + release test scan all `packages/*/package.json` for 10 site-only deps; zero leaks | PASS |

## Plan detail coverage

| Detail | Where |
| ------ | ----- |
| Private pnpm workspace for Docusaurus 3.10.2 | `site/` in `pnpm-workspace.yaml`; `@prometheus-ags/entity-graph-docs-site` `"private": true` |
| All Docusaurus packages pinned to one version | core/preset-classic/theme-mermaid/module-type-aliases/types all exactly `3.10.2` (registry-verified); asserted by config-integrity lane and release test |
| Prometheus logo/brand tokens | `--prometheus-*` token namespace in `custom.css`; ember marks in `site/static/img/` |
| Accessible light/dark themes | Full token sets for both; WCAG AA contrast pairs documented in ASSETS.md; `:focus-visible` 3px outline |
| Responsive landing page | `src/pages/index.js` + `index.module.css` (hero, release card, capability grid, explore paths) |
| Product/package/example navigation | Three sidebars, navbar + footer entries, four doc pages |
| Local search | `@easyops-cn/docusaurus-search-local@0.55.2`, hashed index over docs+pages |
| Mermaid | `@docusaurus/theme-mermaid@3.10.2` + `markdown.mermaid: true`; exercised by `docs/product/architecture.md` flowchart |
| Code tabs | Available via MDX `Tabs` (preset-classic); code blocks use prism `rust/toml/bash/dart/diff` additional languages |
| SEO/social metadata | `themeConfig.metadata` og/twitter + per-page `description` front matter (content contract) |
| Canonical edit links | `editUrl` → `github.com/Prometheus-AGS/prometheus-entity-management/edit/main/site/` |
| Adapt sibling skill-pack site, keep pnpm-only | Donor config/CSS/landing patterns adapted; pnpm workspace + `pnpm --filter` scripts only |
| Isolate site React deps from library packages | React 18.0.0 declared only in `site/package.json`; publishable React 19 peer ranges untouched |

## Gates run (this session, all green)

- `pnpm run verify:docs-foundation` — 4 lanes PASS (`verification.json`)
- `pnpm run test:v3-docs-foundation-brand` — 10/10
- `pnpm run bdd:docs-foundation` — 3 scenarios / 13 steps
- `pnpm run typecheck` — 23/23
- `pnpm run validate` — errors `[]`
- `openspec validate v3-docs-foundation-brand --strict` — valid
- `npx eslint` on new scripts/tests/steps — clean

## Defects found and fixed during implementation

1. **`prism-svelte` module missing** — `prism-react-renderer@2.3.0` ships no svelte
   grammar; `additionalLanguages: [..., 'svelte']` crashed the server build.
   Fix: dropped `svelte` from the list (Svelte snippets render as `markup`).
2. **`clsx` false positive in isolation scan** — `entity-graph-react` already
   depended on `clsx` before this change, so it cannot be a site-only marker.
   Fix: removed `clsx` from the site-only set in test + verifier; documented in
   design D-2 and site README.
3. **Isolation walker descended into `node_modules`** — test walker flagged
   transitive manifests (`node_modules/svelte/package.json`). Fix: skip
   `node_modules` in `walkPublishableManifests`.
4. **Social card text overflow** — first render clipped the wordmark at the
   right edge. Fix: reduced type scale, verified visually at 1200×630.

## Retained limits

- **Visual review:** light/dark rendering and responsive nav are asserted via
  build output, config, and CSS presence; pixel-level visual review remains
  manual. (Recorded in `verification.json` → `limits.visualReview`.)
- **Deployment:** GitHub Pages deployment, DNS, and hosted CI publication are
  owned by `v3-docs-github-pages`; this change certifies the local static
  build only. (`coverage.json` → `documentationSite` stays `planned` under
  that change.)
- **API reference content:** TypeDoc/Dartdoc/Rustdoc generation is
  `v3-docs-api-reference`; foundation ships product/packages/examples pages
  only.
