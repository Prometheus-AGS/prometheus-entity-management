# Task 3 BDD/TDD red receipt

Command: `pnpm run test:example-coverage`  
Recorded: 2026-08-01  
Result: expected failure, exit 1

The first meaningful adversarial run executed twelve tests: eight passed and four failed.

## Uncovered fail-closed requirements

1. An implemented semantic-contract report could point to a missing file without rejection.
2. Five showcase rows could contain a duplicate identity while omitting another required showcase.
3. A purported completed showcase could reference a missing visual-evidence file.
4. Near-complete malformed coverage with no `showcases` array threw `TypeError` instead of returning schema diagnostics.

These failures were retained as requirements. The production validator must be corrected; the tests will not be relaxed or removed.

An earlier exploratory source-integrity assertion failed because its selector matched the scenario-ID inventory rather than the executor body. That selector was corrected and the check passed, so it is not counted as product red evidence.
