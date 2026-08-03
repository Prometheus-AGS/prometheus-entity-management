# Task 6 staging-evidence RED receipt

- Recorded: 2026-08-02
- Command: `pnpm run test:release-pipeline`
- Result: expected RED, exit 1
- Tests: 20 total; 18 passed; 2 failed
- Missing behaviors:
  - `validateRehearsalForStaging` was undefined, proving staging had no complete rehearsal-proof validator.
  - `validateStagedNpmResult` was undefined, proving the stage path did not require a registry-issued stage ID and authoritative integrity.

The failures were captured before production implementation.
