# Release impact: v3-docs-concepts-packages

**Date:** 2026-08-22

## What the 3.0 release gains

- **A complete learning path**: quickstart + 13 concept guides + 8 binding
  guides + 5 practice guides (27 hand-authored pages), wired into a dedicated
  `guidesSidebar` and a "Guides" navbar section.
- **Docs that cannot teach broken code**: every ts/tsx snippet in the guides
  compiles against the 12 packed npm packages in a consumer project. The gate
  caught ten real defects during authoring — wrong hook fields, a sync/async
  mistake, an arity error, and a JSX-mode conflict — before any reader could.
- **A machine-checkable capability map** (`site/capability-map.json`): 26
  stable capabilities each mapped to concept + API + example routes; the
  release test fails on orphan pages or dead routes.
- **Architectural honesty enforced**: a language gate rejects guides that
  prescribe component/hook-level fetching, and install blocks are restricted
  to registry `pnpm add` — no `file:`/`link:`/`workspace:` leaks into the
  public docs.

## Downstream unblocked

- `v3-docs-examples-integrations` (#24) — example pages extend the same route
  tree and reuse the parameterized snippet harness.
- `v3-docs-operations-migration` (#25) — operations/migration guides follow
  the same content contract (front matter, sidebar, capability map).
- `v3-docs-github-pages` (#26) — the full route tree (guides + reference) now
  builds deterministically; deployment is the only remaining docs concern.

## Risk and compatibility notes

- `scripts/verify-skills-snippets.mjs` gained flags (`--root`, `--ext`,
  `--skip`, `--all-packages`) and a `pnpm.overrides` fix in the consumer
  manifest; the default skills lane is regression-verified unchanged (19
  snippets / 15 docs).
- `site/sidebars.js` and `site/docusaurus.config.js` changed additively (new
  sidebar + navbar item); the foundation and api-reference release tests were
  re-run green after the change.
- No publishable package source changed in this change — docs, tests,
  scripts, and site config only.
