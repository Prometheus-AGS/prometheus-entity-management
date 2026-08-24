# Release impact: v3-docs-api-reference

**Date:** 2026-08-22

## What the 3.0 release gains

- **Complete multi-language API reference** generated from the export ledgers:
  12 TypeDoc-derived npm package pages (566 stable exports with signatures,
  doc comments, and canonical source links), curated Dart and Rust entry
  pages backed by generated dartdoc/rustdoc artifacts, and a package index
  where every declared artifact appears exactly once.
- **An enforceable documentation policy, not a hope**: vanished stable exports
  fail the build; new undocumented exports fail the build; the undocumented
  baseline (`site/api-docs-baseline.json`) can only shrink. The policy caught
  three stale `@internal` tags on public exports on its first runs.
- **Package chooser pages** with install commands, peer/runtime matrices,
  stability badges, and bundle metadata for all 12 npm packages.
- **Deterministic routes under the Pages base path**: every link is relative
  or `useBaseUrl`-resolved; generated docs/sidebar regenerate at `prebuild`.

## Downstream unblocked

- `v3-docs-concepts-packages` (#23) — conceptual guides land next to this
  reference; cross-link map (`site/api-cross-links.json`) is the extension
  point.
- `v3-docs-examples-integrations` (#24), `v3-docs-operations-migration` (#25),
  `v3-docs-github-pages` (#26) — all build on this route tree.

## Risk and compatibility notes

- Three publishable source files changed: doc-comment-only fixes removing
  stale `@internal` tags (`entity-graph-core/devtools-event-bus.ts`,
  `entity-graph-alpine/entity-binding.ts`, `entity-graph-alpine/list-binding.ts`).
  No runtime behavior change; targeted package tests green (core 24/24,
  alpine 16/16), full typecheck 23/23.
- `docs:build`/`docs:start` now regenerate the API reference at prebuild
  (TypeDoc ×12 + dartdoc + cargo doc ≈ 2–4 min full, faster incremental);
  `prestart` skips artifacts for dev-loop speed.
- `typedoc@0.28.20` is a site-only devDependency; the isolation test fails if
  it ever leaks into a publishable package.
- Generated docs under `site/docs/api/npm/`, `site/docs/api/index.mdx`,
  `site/docs/packages/<slug>.mdx`, `site/api-sidebar.generated.json`, and
  `site/static/api/` are git-ignored by design — source of truth is the
  packages themselves.
