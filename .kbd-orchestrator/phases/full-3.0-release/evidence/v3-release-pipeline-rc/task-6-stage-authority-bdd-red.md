# Task 6 stage-authority RED receipt

- Recorded: 2026-08-02
- Command: `pnpm run test:release-pipeline`
- Result: expected RED, exit 1
- Tests: 22 total; 21 passed; 1 failed
- Failure: `stage authority is checked before registry reads, including matching retries` reported `Missing expected rejection`.

This proves the pre-fix state machine could complete an all-matching retry
without invoking the protected GitHub/OIDC authority check. The failure was
captured before production implementation.
