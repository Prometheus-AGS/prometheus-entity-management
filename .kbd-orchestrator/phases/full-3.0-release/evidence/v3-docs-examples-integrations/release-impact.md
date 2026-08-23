# Release impact: v3-docs-examples-integrations

**Date:** 2026-08-22

## What the 3.0 release gains

- **Five start-to-finish example tutorials** (React 19/Vite 8, Next.js App
  Router, agentic A2UI, Flutter/Riverpod, universal Tauri) with architecture,
  setup, annotated feature matrices keyed to the shared coverage scenario IDs,
  test commands, platform notes, and troubleshooting drawn from the real
  evidence loops (React #185 selector stability, Riverpod family forking,
  Tauri storage-key collision, and others).
- **Six integration guides** (WebSocket, Supabase, GraphQL, PGlite+Loro,
  A2A+A2UI, Flint) whose adapter snippets compile against the packed packages
  and which uniformly separate keyless deterministic demo mode from
  live-credential operation.
- **Contract-tested docs**: scenario IDs validate against
  `examples/shared/scenario-contract.json`; gate commands validate against
  root scripts; runnable-source links validate against on-disk example dirs;
  tutorial claims mirror each owning change's certified evidence boundary.

## Downstream unblocked

- `v3-docs-operations-migration` (#25) — the last docs content change.
- `v3-docs-github-pages` (#26) — the full route tree (guides + reference +
  examples + integrations) now builds deterministically.

## Risk and compatibility notes

- `scripts/verify-skills-snippets.mjs` consumer deps gained
  `@supabase/supabase-js` (all-packages mode only); default skills lane
  unaffected (regression-verified).
- `site/sidebars.js` and `examples/overview.md` changed additively; all docs
  release tests re-run green.
- No publishable package source changed — docs, tests, scripts only.
