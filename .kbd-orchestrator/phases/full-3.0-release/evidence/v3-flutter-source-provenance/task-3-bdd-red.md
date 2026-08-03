# Task 3 adversarial BDD red receipt

Date: 2026-08-01  
Feature: `tests/features/release/v3-flutter-source-provenance-tamper.feature`  
Tag: `@provenance-tamper`  
Verdict: **EXPECTED RED**

The tamper behaviors were specified before the portable validator or step
definitions existed. The first no-retry execution reported:

- 6 scenarios undefined
- 22 steps undefined
- 4 hooks passed

The scenarios required fail-closed behavior for generated/unapproved paths,
missing retained metadata, duplicate canonical Dart artifacts, unauthorized
pub.dev publication, and substituted license or visual hashes.

Command:

```text
node --import tsx ./node_modules/@cucumber/cucumber/bin/cucumber.js --config cucumber.mjs --tags '@provenance-tamper'
```
