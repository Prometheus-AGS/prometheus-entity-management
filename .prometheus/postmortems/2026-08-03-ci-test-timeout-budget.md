# CI aggregate test timeout was shorter than its child workload

Date: 2026-08-03

## Symptom

The immutable `3.0.0-rc.1` candidate reached the full Cucumber portfolio and
then terminated the active Tauri verifier with exit code 143. The parent gate
reported `CI gate test timed out after 600000ms` while Cargo was still compiling
the certified Tauri host. No test assertion had failed.

## Root cause

The aggregate `test` gate allowed 10 minutes even though it runs all workspace
tests followed by one full BDD portfolio. That portfolio contains individual
release, Tauri, and browser steps with 10- to 15-minute timeout budgets. The
parent budget could therefore expire before a valid cold-run child budget.

## Fix

- Increased the aggregate test gate budget to 30 minutes.
- Increased the GitHub CI job budget to 60 minutes so install and the remaining
  gates can run around the aggregate test gate.
- Added unit and BDD assertions that reject a test budget below 30 minutes.

## Prevention

Any new long-running runtime or platform lane must fit inside both its aggregate
gate and the enclosing workflow job. A child timeout must never be equal to or
longer than the parent gate that owns it.

## Verification

- Targeted ESLint passed for the runner and regression files.
- `node --test tests/ci/run-ci-gate.test.mjs`: 7/7 passed.
- `pnpm run bdd:ci-baseline`: 5/5 scenarios and 25/25 steps passed.
