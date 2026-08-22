# Design: v3-docs-foundation-brand

## Candidate reuse decisions

### cand-021 — Docusaurus 3.10.2

- **Verdict:** adopt
- **Decision:** Adopt the current official Docusaurus line and adapt the existing Prometheus skill-pack Pages pattern, while keeping documentation dependencies in a private workspace package.
- **Evidence:**
  - Tier 1: Docusaurus builds static output suitable for GitHub Pages and requires all @docusaurus packages to stay on one version. (https://docusaurus.io/docs/installation)
  - Tier 1: Docusaurus supports release-aware documentation routes, version selectors, banners, and bounded retained versions. (https://docusaurus.io/docs/versioning)
  - Tier 1: The sibling Prometheus skill-pack site supplies a proven Prometheus organization/base-path, local search, Mermaid, canonical-content, and pinned Pages workflow donor pattern. (file:///Users/gqadonis/Projects/prometheus/prometheus-skill-pack/site/docusaurus.config.js)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

## Implementation decisions (2026-08-22)

- **D-1 · Private `site/` workspace package.** The docs site lives at `site/` as a pnpm workspace package named `@prometheus-ags/entity-graph-docs-site` with `"private": true`, added to `pnpm-workspace.yaml`. All `@docusaurus/*` packages pinned to exactly `3.10.2` (donor-proven set, registry-verified 2026-08-22). The site is never published and no publishable package may depend on it.
- **D-2 · Dependency isolation.** Site-only dependencies (Docusaurus, `@easyops-cn/docusaurus-search-local`, `mermaid`, `prism-react-renderer`, `@mdx-js/react`, React 18 for the site runtime) are declared only in `site/package.json`. React 18.0.0 matches the donor-proven Docusaurus 3.10.2 runtime; publishable packages keep their own React 19 peer ranges untouched. The verifier scans every publishable `packages/*/package.json` and fails if any site-only dependency leaks in (`clsx` is excluded from the site-only set: it was already a legitimate dependency of `entity-graph-react` before this change). Donor security overrides `serialize-javascript@7.0.7` / `uuid@11.1.1` are adopted at the root `pnpm.overrides` (advisory hardening for the Docusaurus dep tree being introduced; no workspace package depends on either directly).
- **D-3 · Brand assets with provenance.** The KnowMe mark from the donor site is product-specific and is NOT copied. A new Prometheus ember mark (`prometheus-mark.svg` / `prometheus-mark-dark.svg`), favicon, and social card are created in-repo from the org brand tokens; provenance and accessible alternatives (alt text, aria labels, text fallback) are documented in `docs/branding/ASSETS.md`.
- **D-4 · Brand tokens renamed, values inherited.** `custom.css` adapts the donor token set under `--prometheus-*` names (ember/ink/surface scales) with accessible light/dark themes, focus-visible outlines, and responsive breakpoints.
- **D-5 · Content model.** One docs plugin instance, three sidebars: Product (overview, architecture), Packages (selection guide + per-package pages for the 12 npm packages, Dart package, and Rust crates), Examples (gallery of certified examples). Content is authored in `site/docs/` (foundation only; full API reference is change `v3-docs-api-reference`). Canonical `editUrl` points at this repository. Content contract (required front matter: `title`, `description`; no orphaned pages) is documented in `site/README.md` and enforced by the release test.
- **D-6 · Verification.** `scripts/verify-docs-foundation.mjs` runs four lanes: config integrity (single Docusaurus version, private package, workspace membership, broken-links-throw), dependency isolation scan, brand-asset provenance, and a clean `docusaurus build` asserting built routes: `404.html`, `sitemap.xml`, local-search index, social card, and product/packages/examples pages. Root scripts: `docs:start`, `docs:build`, `verify:docs-foundation`, `test:v3-docs-foundation-brand`, `bdd:docs-foundation`.

