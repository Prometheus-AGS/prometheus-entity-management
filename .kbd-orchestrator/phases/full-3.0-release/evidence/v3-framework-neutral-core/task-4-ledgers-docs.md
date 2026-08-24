# Task 4 — Ledgers, skills, and documentation

## Machine-readable synchronization

- Added `release.core.framework-neutral` to `examples/coverage.json` with the verifier command, BDD feature, release policy, and packed evidence.
- Extended `validate-v3-release-contract.mjs` and its fail-closed tests so missing commands, policies, and evidence cannot silently pass.
- Rebuilt the React package and regenerated `prometheus-entity-skills/_shared/references/library-exports.json`.
- The runtime ledger now contains 201 exports, including `createGraphStore`, `graphStore`, `graphSyncStatusStore`, and `getGraphSyncStatus` while retaining the React `useGraphStore` and `useGraphSyncStatus` names.

## Human-facing documentation

- Added `release/framework-neutral-core.md` with the core/React boundary, examples, migration table, deprecation window, reproducible commands, and explicit certification limits.
- Updated root and package READMEs to distinguish vanilla core APIs from React hooks.
- Updated release index and package-contract limits to acknowledge the completed React-free core gate without claiming the pending cross-binding singleton gate.
- Corrected the unsupported “byte-identical / 197 exports unchanged” claim in all twelve npm package changelogs.

## Skill synchronization

- Updated the shared public API reference for the store factory, singleton, StoreApi type, sync-status store, and imperative reader.
- Added the framework boundary to architecture rules.
- Updated the v3 release-contract skill reference with the packed-core proof requirement and certification limits.
- Added core/React import migration and per-request SSR isolation guidance.
- Linked the new contract from the skill bundle catalogs.

## Executable documentation checks

The `@v3-framework-neutral-core` BDD feature now includes a documentation scenario proving:

- coverage ledger traceability;
- core versus React store semantics;
- skill reference synchronization;
- deprecated alias and SSR request-isolation guidance;
- continued blocking of cross-binding singleton certification and later release outcomes.

## Gate results

- `pnpm run verify:skills` — 201 runtime exports match the ledger.
- `pnpm run validate:release-contract` — zero errors.
- `pnpm run test:release-contract` — 12 tests passed.
- `pnpm run bdd:release-contract` — 5 scenarios and 32 steps passed.
- `pnpm run bdd:framework-neutral-core` — 4 scenarios and 21 steps passed.
- `pnpm run bdd:package-contracts` — 5 scenarios and 24 steps passed.
- React package typecheck passed.
- Targeted ESLint and `git diff --check` passed.

This task changes documentation and machine-readable contracts, not a rendered product surface. Visual proof remains inapplicable here and is still required for later showcase and Docusaurus tasks.
