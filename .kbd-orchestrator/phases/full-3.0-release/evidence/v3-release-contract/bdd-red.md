# BDD red evidence — v3-release-contract

**Recorded:** 2026-08-01  
**Command:** `pnpm exec cucumber-js tests/features/release/v3-release-contract.feature --format progress`  
**Exit code:** 1 (expected red phase)

## Result

- 4 scenarios undefined
- 26 steps undefined
- No scenario passed accidentally
- The earlier `--publish-quiet` invocation was discarded as runner-configuration drift because Cucumber 13 removed that option; it was not counted as the behavioral red phase.

The undefined result proves the feature contract existed before its step definitions and machine-readable release contract.
