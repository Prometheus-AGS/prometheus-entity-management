# Task 4 — coverage, API, skills, and documentation synchronization

**Recorded:** 2026-08-03  
**Change:** `v3-vite-react19-example`  
**Status:** pass

## Coverage promotion

`examples/coverage.json` now records `react-19-vite-8` as `implemented`.
Every React-owned capability receipt is implemented and points to
`pnpm run verify:vite-react19` plus concrete test/evidence paths. The showcase
runtime receipt preserves `countsAsPackedPackageEvidence: false`; overall
coverage remains `in-progress` and release certification remains false.

The React browser gate also adds rendered PGlite/Loro evidence to
`graph.offline-persistence-sync` without replacing the existing headless and
packed sync receipts.

## Public API and runtime ledgers

The browser fixes add public declaration behavior but no new runtime export
name:

- core exports the type `LoroModuleLoader` and accepts it in
  `createLoroMergeStrategy(loadLoro?)`;
- sync exposes `LoroProviderOptions.loadLoro` and passes that loader to core;
- React remote queries now seed their canonical base list; and
- cache-miss Suspense reads start their fetch before suspending.

The human API references and package READMEs document these contracts.
Regeneration confirmed the runtime ledgers remain internally consistent:

- React: 201 runtime exports;
- sync: 16 runtime exports.

## Documentation and skill routing

Added:

- `release/vite-react19-example.md` — architecture, scenario matrix, local/live
  modes, loader guidance, verification, RC usage, and evidence limits;
- `prometheus-entity-skills/_shared/references/vite-react19-example.md` — agent
  routing, required command, architecture, optional-peer loader, and claim
  boundary.

Updated root, examples, package, releasing, changelog, release-index, API, sync,
and skill documentation so they distinguish:

1. implemented source-workspace React/Vite browser evidence;
2. separate packed-candidate installability; and
3. protected immutable npm RC staging under `next`.

The four remaining showcase applications stay planned.

## Verification

| Command | Result |
| --- | --- |
| `pnpm run verify:example-coverage` | pass — 13/13 scenarios, 16 capabilities, 16 stable artifacts, 5 showcases, overall `in-progress`, release certified `false` |
| `pnpm run bdd:example-coverage` | pass — 4 scenarios, 27 steps, 6 hooks |
| React `refresh:exports` | pass — wrote 201 runtime names |
| Sync `refresh:exports` | pass — wrote 16 runtime names |
| React `verify:skills` | pass — 201 names match |
| Sync `verify:skills` | pass — 16 names match |
| scoped ESLint for the updated coverage step | pass |
| scoped `git diff --check` | pass |

The first BDD run failed because the previous acceptance text required all five
showcases to remain planned. The feature and step were updated to require the
new evidence-backed mixed state, and the rerun passed.
