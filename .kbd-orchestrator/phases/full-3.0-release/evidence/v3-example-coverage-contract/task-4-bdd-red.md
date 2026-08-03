# Task 4 ledger synchronization red receipt

Command: `pnpm run test:example-coverage`  
Recorded: 2026-08-01  
Result: expected failure, exit 1

Twelve tests passed and one failed because `examples/coverage.json` did not yet register `v3-example-coverage-contract` as an implemented quality gate. The failing assertion requires the gate identity, owning change, BDD feature, and canonical verification command.

The test is retained. The ledger and validator must be synchronized rather than weakening the declaration requirement.
