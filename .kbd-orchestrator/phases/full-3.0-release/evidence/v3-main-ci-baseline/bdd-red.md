# BDD red phase — v3-main-ci-baseline

Date: 2026-08-01

Command:

```text
pnpm exec cucumber-js --config cucumber.mjs --tags '@v3-main-ci-baseline'
```

Observed result before step definitions were added:

```text
5 scenarios (5 undefined)
25 steps (25 undefined)
0m 0.11s
```

The failing run establishes that the new hermetic-lock, compatible-dependency, CI-timeout, advisory-policy, and upgraded-example behaviors were not already satisfied by unrelated release-contract step definitions.
