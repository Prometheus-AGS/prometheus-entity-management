# Prometheus Entity Management — documentation site

Private Docusaurus 3.10.2 workspace for the 3.0 release docs. **Never
published** (`"private": true`); no publishable package may depend on anything
declared here.

## Commands (run from the repository root)

```bash
pnpm run docs:start   # local dev server
pnpm run docs:build   # static build to site/build/
pnpm run verify:docs-foundation  # full certification lane (includes build)
```

## Dependency rules

- All `@docusaurus/*` packages stay pinned to exactly one version (`3.10.2`).
- Site-only dependencies (Docusaurus, search-local, mermaid,
  prism-react-renderer, `@mdx-js/react`, React 18) are declared **only**
  in this package. The `verify:docs-foundation` isolation lane fails the build
  if any of them appears in a publishable `packages/*/package.json`. (`clsx`
  is not part of the site-only set — `entity-graph-react` already depends on
  it legitimately.)

## Content contract

Every doc page under `site/docs/` must:

1. Carry front matter with `title` and `description` (used for SEO/social
   metadata).
2. Be reachable from a sidebar in `site/sidebars.js` — no orphaned pages.
3. Link only to routes that exist; broken links and broken Markdown anchors
   fail the build (`onBrokenLinks: 'throw'`,
   `onBrokenMarkdownLinks: 'throw'`).
4. Cite an evidence gate (`pnpm run verify:*` / `cargo test …`) for every
   capability claim, matching the claims discipline in
   `prometheus-entity-skills/_shared/references/ecosystem-claims.json`.

Edit links are canonical: the `editUrl` in `docusaurus.config.js` points at
this repository so readers land on the exact source file.

## Sections

- `docs/product/` — what the product is and how the architecture works
- `docs/packages/` — artifact selection across npm, Dart, and Rust
- `docs/examples/` — certified consumer examples and their gates
