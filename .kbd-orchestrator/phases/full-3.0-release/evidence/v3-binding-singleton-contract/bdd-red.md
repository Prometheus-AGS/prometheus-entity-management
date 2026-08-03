# BDD red evidence

- Command: `node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --config cucumber.mjs --tags '@v3-binding-singleton-contract'`
- Exit: `1`
- Result before step definitions: `4 scenarios (4 undefined)`, `19 steps (19 undefined)`
- Purpose: prove the singleton-contract acceptance language failed before its executable step layer existed.
- Failure shape: Cucumber listed each new scenario and generated undefined-step snippets; no implementation assertion ran or passed accidentally.

An earlier invocation through `pnpm run bdd -- --tags ...` was rejected because the script separator caused Cucumber 13 to interpret the tag value as a feature path. The direct focused command above is the canonical red run and is the form wired into the dedicated package script.
