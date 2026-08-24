# Task 6 npm-view shape RED receipt

- Recorded: 2026-08-02
- Command: `pnpm run test:release-pipeline`
- Result: expected RED, exit 1
- Tests: 22 total; 21 passed; 1 failed
- Failure: the command adapter returned `integrity: undefined` for npm's actual
  `{"version":"…","dist.integrity":"sha512-…"}` multi-field JSON shape.

The actual public-registry CLI response was checked with npm 11.16.0 before the
test was changed. This failure was captured before production implementation.
