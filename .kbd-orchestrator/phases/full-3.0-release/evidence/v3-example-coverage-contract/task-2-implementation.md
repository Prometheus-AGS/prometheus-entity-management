# Task 2 implementation evidence

Change: `v3-example-coverage-contract`  
Task: 2 of 6  
Recorded: 2026-08-01

## Outcome

Implemented the presentation-neutral semantic fixture and coverage contract for all five planned 3.0 showcases. The contract is deterministic, keyless, tenant-scoped, schema-validated, and explicitly separate from later framework and platform certification.

## Implemented surface

- `examples/shared/scenario-contract.json`: canonical Project, User, Task, Comment, and Activity fixtures; ID-only lists; eight deterministic transport fixtures; thirteen named scenarios; fixed time and security assumptions.
- `examples/shared/scenario-contract.schema.json`: closed Draft 2020-12 contract schema.
- `examples/shared/README.md`: consumer rules and semantic-evidence boundary.
- `examples/coverage.json`: sixteen stable capability mappings, all sixteen stable release artifacts, thirteen scenarios, and all five planned showcases.
- `examples/coverage.schema.json`: closed coverage, capability, evidence, and showcase schema.
- `scripts/verify-example-coverage.mjs`: importable fail-closed validator plus a deterministic semantic oracle for the thirteen scenarios.
- `package.json` and `scripts/run-ci-gate.mjs`: the root validation gate now includes release-contract and example-coverage verification.

## Scenario result

`pnpm run verify:example-coverage -- --report .kbd-orchestrator/phases/full-3.0-release/evidence/v3-example-coverage-contract/task-2-example-coverage-report.json`

- Scenarios: 13/13 pass
- Stable capabilities: 16 mapped
- Stable release artifacts: 16 mapped
- Showcases: 5 mapped
- Overall coverage: `in-progress`
- Release certified: `false`

The first schema execution failed because root `$schema` metadata was not admitted by the closed schema. The schema was corrected to accept only the exact local schema identifier. A relationship-count audit also corrected the expected deterministic count from eight to seven. These failures were not suppressed.

## Gate receipts

| Gate | Result |
| --- | --- |
| `pnpm run verify:example-coverage -- --report ...` | pass, 13/13 |
| import verifier through ESM API | pass, zero errors |
| `pnpm exec eslint scripts/verify-example-coverage.mjs scripts/run-ci-gate.mjs` | pass |
| `pnpm run validate:release-contract` | pass, 16 artifacts / 12 npm / 1 Dart / 3 Rust / 5 showcases |
| `pnpm run validate` | pass |
| `pnpm run test:ci-baseline` | pass, 17/17 |
| parse the four contract and schema JSON files | pass, 4/4 |
| `pnpm exec openspec validate v3-example-coverage-contract --strict` | pass |
| scoped `git diff --check` | pass |

Machine-readable scenario results are in `task-2-example-coverage-report.json` beside this file.

## Fail-closed and future-state audit

- Missing capability, artifact, scenario, transport, command, or implemented evidence path is rejected.
- A planned showcase cannot claim implemented runtime or visual evidence.
- An implemented showcase requires both runtime and visual evidence to be implemented.
- Overall `complete` is rejected while any release evidence or showcase is incomplete.
- The validator itself permits a future truthful completed state; it does not hard-code today's `in-progress` state.
- Direct module import is supported even when `process.argv[1]` is absent.

## Explicit non-evidence

This task does **not** prove that any React, Next.js, A2UI, Flutter, or Tauri application implements the scenarios. It does not supply browser, device, accessibility, screenshot, trace, or video evidence. Those entries remain planned and owned by their named showcase changes. Therefore `examples/coverage.json` remains `in-progress` and `releaseCertified` remains `false`.

BDD mutation coverage belongs to task 3. Skills/public documentation synchronization belongs to task 4. Clean-state and broader platform gates belong to task 5. Final evidence refinement, verification, archive, and promotion belong to task 6.
