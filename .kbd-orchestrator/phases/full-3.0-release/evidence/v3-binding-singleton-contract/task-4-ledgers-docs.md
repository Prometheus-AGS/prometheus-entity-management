# Task 4 — ledgers, skills, and documentation

## Coverage ledger

`examples/coverage.json` now maps `release.bindings.one-core-singleton` to:

- `v3-binding-singleton-contract`;
- the tagged Cucumber feature;
- `pnpm run verify:binding-singletons`;
- the release and Changesets policies;
- reproducible dependency, implementation, red/green BDD, packed-report, and documentation evidence.

The overall release and all five showcase statuses remain `in-progress`/`planned`. No binding gate is presented as full 3.0 certification.

## Public contract and package guidance

- Added `release/binding-singleton-contract.md` with the certified six-binding matrix, required peer plus development dependency policy, application-owned installation model, exact twelve-package fixed group, public store boundary, positive/negative verification, and explicit limits.
- Updated root and release navigation/status pages and cross-linked the earlier package/core gates without retroactively expanding their claims.
- Updated all six binding READMEs to install core explicitly and explain that the application owns the compatible graph instance.
- Replaced stale non-React documentation uses of the deprecated core `useGraphStore` alias with `graphStore`.
- Corrected Alpine's false “already a dependency” statement to the required-peer policy.
- Documented Solid's newly explicit vanilla `graphStore` re-export separately from its reactive `createGraphStore(selector)` primitive and retained migration alias.
- Corrected six repository-relative links in the React package README that incorrectly resolved beneath `packages/entity-graph-react/`.

## API ledger decision

`prometheus-entity-skills/_shared/references/library-exports.json` tracks the built React package runtime exports. This change does not add or remove a React runtime export, so regenerating it must produce no delta. The human API ledger now contains a stable JavaScript binding singleton table, including Solid's `graphStore` surface and the primary public adapter of every certified binding.

## Skill synchronization

Updated the shared architecture, API, release-contract, migration, skill-map, and root skill references to require:

- explicit application installation of the core peer;
- no production or optional binding core relationship;
- `pnpm run verify:binding-singletons` for six-binding physical-singleton and reactive-behavior claims;
- separate evidence for native Tauri/Flutter, browsers/devices, showcases, Docusaurus, registries, and stable publication.

## Visual evidence boundary

This documentation task describes a headless package topology and has no rendered product UI to screenshot. It does not waive the requested visual certification: later example and Docusaurus changes must provide real browser/device screenshots, accessibility evidence, and route/runtime results where applicable.

## Verification

- Documentation BDD red: 1 new scenario and 5 new steps were undefined before their step definitions; see `task-4-bdd-red.md`.
- `pnpm run bdd:binding-singletons`: 5 scenarios, 25 steps, and 3 hooks passed.
- `pnpm run refresh:exports`: rebuilt the React package and regenerated 201 runtime names; the four framework-neutral exports already present in the current worktree remain synchronized.
- `pnpm run verify:skills`: 201 runtime exports match the ledger.
- `pnpm run test:release-contract`: 12 tests passed, including honest in-progress showcase status and fixed npm group validation.
- A read-only relative Markdown target audit passed across all 17 synchronized documents after correcting the React README paths.
- Focused ESLint, strict OpenSpec validation, release-contract validation, stale non-React alias scan, JSON parsing, and `git diff --check` passed.
- The workspace has no configured `prettier` executable (`pnpm exec prettier --check` returned command-not-found). No unplanned formatter dependency was added; repository-defined lint, BDD, skills, release, and diff gates remain the authoritative checks.
