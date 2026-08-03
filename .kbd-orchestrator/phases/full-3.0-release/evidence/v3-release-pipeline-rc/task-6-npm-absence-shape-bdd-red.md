# Task 6 RED receipt — npm absence response shapes

## Regression contract

An exact npm version that is not yet published is a recoverable `absent` state.
The registry client must recognize npm's `E404` whether the CLI emits structured
JSON on stdout or plain text on stderr.

## Unit RED

```text
$ pnpm run test:release-pipeline
tests 24
pass 23
fail 1

✖ npm exact-version absence is recognized from JSON stdout and plain-text stderr
Error: @prometheus-ags/example@3.0.0-rc.1: registry lookup failed
```

## BDD RED

```text
$ pnpm run bdd:release-pipeline
6 hooks (6 passed)
13 scenarios (12 passed, 1 failed)
57 steps (54 passed, 2 skipped, 1 failed)

Failed step:
And absent npm versions are decoded from JSON or plain-text errors
```

Both failures occurred before implementation and directly exercise the
reviewer's valid recovery concern.
