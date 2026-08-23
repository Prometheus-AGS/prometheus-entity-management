# Release impact: v3-docs-github-pages

## Surface added

- `.github/workflows/docs-pages.yml` — quality-gated, release-aware Pages
  deployment adapted from the proven sibling workflow (SHA-pinned
  checkout/configure-pages/upload-pages-artifact/deploy-pages; PR build-only;
  serialized main-only deploy to the protected `github-pages` environment).
- `scripts/verify-docs-pages-quality.mjs` — 6-lane production quality gate
  (search index, base-path route probes, secrets scan, absolute-path scan,
  axe a11y in both themes, Lighthouse budgets + category floors), shared by CI
  and local certification.
- `scripts/verify-docs-pages.mjs` — 3-lane certification verifier.
- `scripts/strip-build-paths.mjs` — postbuild that removes internal absolute
  paths from the deployed bundle (wired into the site `build` script).
- `site/lighthouse-budgets.json` — declared resource budgets (incl. zero
  third-party origins), enforced from Lighthouse measurements.
- `release/docs-site.json` — recorded deployment URL; `RELEASING.md` points
  the 3.0 release at it.
- `tests/release/v3-docs-github-pages.test.mjs` (10 assertions), BDD feature +
  steps (3 scenarios / 14 steps).
- Root scripts: `verify:docs-pages`, `verify:docs-pages-quality`,
  `test:v3-docs-github-pages`, `bdd:docs-pages`.

## Defect repairs included (found by the new gates)

- Site theme contrast fixes (light primary scale, prism token remaps in both
  themes, dark inline-code color, underlined content links).
- Sidebar categories now render crawlable `generated-index` links.
- Built artifacts no longer embed the build machine's absolute paths.

## New dependency

- `lighthouse@13.4.1` (devDependency, workspace root) — required by the plan's
  Lighthouse-budgets gate. Dev-only; never shipped in any published artifact.
  Note: LH13 removed the native `performance-budget` audit, so budgets are
  enforced against the run's resource measurements instead.

## Publication authority

None over npm/pub.dev/crates.io. The workflow's deploy path is merge-safe
(main-only, environment-protected) but the first live GitHub Pages deployment
is an operator-confirmed action (Pages must be enabled for the repository).
`v3-release-certification` and `v3-stable-publication` remain the release
boundary and now have a quality-gated documentation deployment to reference.
