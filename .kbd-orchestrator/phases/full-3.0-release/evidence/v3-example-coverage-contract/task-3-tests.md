# Task 3 BDD and mutation-test evidence

Change: `v3-example-coverage-contract`  
Task: 3 of 6  
Recorded: 2026-08-01

## Outcome

Added stakeholder-facing BDD and adversarial unit coverage for the shared example contract. The tests prove the contract's current positive behavior, attack its fail-closed boundaries, and verify that it can later transition to `complete` only with implemented release and showcase evidence.

## Added checks

- `tests/features/release/v3-example-coverage-contract.feature`: four release-reviewer scenarios.
- `tests/steps/v3-example-coverage-contract.steps.ts`: executable domain, mapping, evidence, mutation, and honesty assertions.
- `tests/release/v3-example-coverage-contract.test.mjs`: twelve deterministic unit/mutation tests.
- Root scripts: `test:example-coverage` and `bdd:example-coverage`; the default `test` chain includes the unit suite.

## Red-to-green result

The authoritative red receipt is `task-3-bdd-red.md`. Eight tests passed and four failed before implementation, exposing:

1. missing semantic report paths were accepted;
2. duplicate showcase identities could hide a missing required showcase;
3. nonexistent completed visual evidence was accepted;
4. malformed near-complete coverage threw instead of returning diagnostics.

The validator was hardened without relaxing the tests. It now requires the exact five showcase IDs, validates all implemented evidence as nonempty repository-relative files, validates its semantic report, and handles absent showcase arrays diagnostically.

## Green receipts

| Gate | Result |
| --- | --- |
| `pnpm run test:example-coverage` | 12/12 pass |
| `pnpm run bdd:example-coverage` | 4/4 scenarios, 25/25 steps |
| focused Cucumber JSON parse | 1 feature, 4 scenarios, 25 steps, 0 failed |
| full `pnpm run bdd` | 28/28 scenarios, 152/152 steps |
| focused ESLint | pass |
| `pnpm run validate` | pass; 13/13 semantic scenarios |
| `pnpm run test:release-contract` | 13/13 pass |
| `pnpm run test:ci-baseline` | 17/17 pass |
| `pnpm exec openspec validate v3-example-coverage-contract --strict` | pass |

Machine-readable BDD output: `task-3-cucumber.json`.

## Behaviors covered

- exact Project/User/Task/Comment/Activity domain;
- tenant-scoped, deterministic, keyless fixtures;
- ID-only lists;
- all thirteen expected semantic outcomes;
- exact sixteen stable capability and artifact mappings;
- bidirectional scenario/capability links;
- exact five showcase identities and scenario ownership;
- outcome, scenario, artifact, command, path, transport, list, and tenant drift;
- planned versus implemented showcase evidence;
- premature completion rejection and truthful future completion acceptance;
- safe diagnostics for malformed near-complete input;
- repository-bound implemented evidence paths.

## Evidence boundary

This is a headless semantic contract, so browser/device screenshots, accessibility scans, traces, videos, native smoke tests, and packed showcase consumers are not applicable to this task. The BDD explicitly asserts that the report is not release certification and that all runtime/visual evidence remains owned by the five downstream showcase changes. This limitation is evidence of honest scope, not a substitute for those later mandatory visual and platform lanes.
