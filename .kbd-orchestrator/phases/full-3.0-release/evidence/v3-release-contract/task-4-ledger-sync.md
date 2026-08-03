# Task 4 — release ledger, skills, and documentation synchronization

## BDD red evidence

The new scenario `Release-facing ledgers consume the authoritative contract` was added before its implementation. The first run of `pnpm run bdd:release-contract` failed with one undefined scenario and four undefined steps:

```text
5 scenarios (4 passed, 1 undefined)
32 steps (28 passed, 4 undefined)
ELIFECYCLE Command failed with exit code 1
```

## Implemented synchronization

- Added `examples/coverage.json` with one implemented release-contract check, five explicitly planned showcase applications, and the planned Docusaurus site.
- Added `prometheus-entity-skills/_shared/references/v3-release-contract.md` as the skill-facing link to the authoritative machine-readable contract.
- Kept `library-exports.json` strictly scoped to runtime exports; this change does not modify `src/index.ts`.
- Updated the skill catalog, skill entry point, API reference, project README, and examples README.
- Extended the release validator and unit suite to reject coverage drift or prematurely certified showcase claims.

## Green evidence

```text
pnpm run bdd:release-contract
5 scenarios (5 passed)
32 steps (32 passed)

pnpm run test:release-contract
8 tests, 8 passed

pnpm run validate:release-contract
errors: []
plannedShowcases: 5

pnpm run verify:skills
OK: 197 runtime exports match ledger.

openspec validate v3-release-contract --strict
Change 'v3-release-contract' is valid

git diff --check
PASS
```

`pnpm exec prettier --check ...` could not run because Prettier is not installed in the workspace. No dependency was added solely for this documentation task; repository-native validators and `git diff --check` pass.
