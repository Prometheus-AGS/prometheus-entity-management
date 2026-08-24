# Task 6 — BDD red receipt

Date: 2026-08-02

The final archive/publication state scenario was added before its evidence
artifacts existed.

## Permanent unit contract

`node --test tests/release/v3-release-pipeline-rc.test.mjs` produced 13 passes
and 2 intentional failures:

- coverage was missing `final-verification.json` from the RC evidence ledger;
- the final verification receipt did not exist.

## Operator BDD contract

`pnpm run bdd:release-pipeline` produced 10 scenarios: 9 passed and the new
`Archive readiness remains independent from stable publication` scenario
failed because `final-verification.json` did not exist. The run had 41 steps:
38 passed, 1 failed, and 2 downstream steps were skipped after the failure.

This proves the final state-vector scenario cannot pass from the earlier task-3
pipeline report alone. It requires the task-6 archive, external-authority,
release-impact, and visual evidence bundle.

