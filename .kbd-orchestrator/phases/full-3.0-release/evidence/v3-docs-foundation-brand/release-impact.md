# Release impact: v3-docs-foundation-brand

**Date:** 2026-08-22

## What the 3.0 release gains

- A **private, certified documentation foundation**: Docusaurus 3.10.2 in a
  pnpm workspace package (`site/`) with Prometheus brand tokens, accessible
  light/dark themes, responsive landing page, product/packages/examples
  information architecture, local search, Mermaid, SEO/social metadata, and
  canonical edit links into this repository.
- **Dependency isolation as a gate, not a convention**: the verifier and
  release test both fail if any Docusaurus/search/mermaid dependency ever
  appears in a publishable package manifest.
- **Brand governance**: every visual asset has recorded provenance and a
  named accessible alternative in `docs/branding/ASSETS.md`; future assets
  must register there before commit.
- **Content contract**: front-matter, sidebar reachability, and evidence-gate
  citation rules in `site/README.md`, enforced by the release test.

## Downstream unblocked

- `v3-docs-api-reference` (#22) — generates API docs into this foundation.
- `v3-docs-migration-guides` (#23) — migration content lands in the product
  section.
- `v3-docs-github-pages` (#24) — deploys this certified static build; its
  `coverage.json` `documentationSite` row remains `planned` until then.

## Risk and compatibility notes

- Root `pnpm.overrides` gained `serialize-javascript@7.0.7` and
  `uuid@11.1.1` (donor-proven advisory pins for the Docusaurus dep tree; no
  workspace package depends on either directly). Full typecheck and validate
  gates re-ran green after the pin.
- The site consumes React 18.0.0 locally; publishable React 19 peer ranges
  are untouched. Lockfile grew by the Docusaurus tree (+1,132 packages);
  install time from a warm store is ~43s.
- Site build artifacts (`site/build/`, `.docusaurus/`) are git-ignored; the
  verifier rebuilds from source on every run.
