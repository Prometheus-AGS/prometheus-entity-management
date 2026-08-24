# Task 2 outside-in BDD red receipt

Date: 2026-08-01  
Feature: `tests/features/release/v3-flutter-source-provenance.feature`  
Tag: `@v3-flutter-source-provenance`  
Verdict: **EXPECTED RED**

The release behavior was specified before its verifier or step definitions
existed. The first no-retry Cucumber execution exited 1 with:

- 5 scenarios undefined
- 24 steps undefined
- 4 hooks passed

Undefined steps were intentional outside-in failure evidence. No implementation
or source migration had been accepted as green at this point.

Command:

```text
node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --config cucumber.mjs --tags '@v3-flutter-source-provenance'
```
