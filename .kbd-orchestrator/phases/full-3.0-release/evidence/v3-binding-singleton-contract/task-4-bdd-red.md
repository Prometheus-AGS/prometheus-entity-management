# Task 4 documentation BDD red evidence

- Command: `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --config cucumber.mjs --tags '@v3-binding-singleton-contract'`
- Exit: `1`
- Result after adding the documentation scenario but before its step definitions: `5 scenarios (4 passed, 1 undefined)` and `25 steps (20 passed, 5 undefined)`.
- Undefined assertions covered the coverage ledger, release contract, six binding READMEs, non-React `graphStore` terminology, and skill readiness limits.

This second red run is distinct from the task 3 behavioral red run. It proves the public-guidance acceptance layer did not pass merely because the packed runtime verifier was already green.
