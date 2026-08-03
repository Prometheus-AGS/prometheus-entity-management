# Task 4 BDD red receipt

- Command: `pnpm run bdd:a2ui-bridge`
- Expected phase: red after adding the documentation/ledger acceptance scenario
- Result: 6 scenarios; 5 passed and 1 failed, with 30 passed, 3 skipped, and 1 failed step
- Failure: `release.protocol.a2ui-official` was absent from `examples/coverage.json`
- Meaning: implementation receipts existed, but release coverage, export ledgers, skills, package docs, and migration documentation had not yet declared the new public boundary
- Resolution rule: keep the scenario unchanged while adding fail-closed ledgers and truthful documentation

