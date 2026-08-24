# Task 3 BDD red receipt — `v3-vite-react19-example`

**Recorded:** 2026-08-03  
**Command:** `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --config cucumber.mjs --tags '@v3-vite-react19-example'`  
**Exit:** `1` (expected red)

The feature was executed before any matching step definitions existed.

```text
Undefined scenarios:
  1) The entity-query source contract is regression tested
  2) Every declared browser scenario executes against a production build
  3) The evidence preserves the prerelease boundary

6 hooks (6 passed)
3 scenarios (3 undefined)
14 steps (14 undefined)
```

This receipt proves the task began with executable acceptance language that
failed for the intended missing implementation. It is not evidence that the
React showcase passes.
