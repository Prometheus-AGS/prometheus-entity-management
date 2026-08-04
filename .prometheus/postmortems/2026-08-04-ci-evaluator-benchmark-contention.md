# CI evaluator benchmark measured runner contention

Date: 2026-08-04

## Symptom

Two Node 22 CI matrix runs failed evaluator scale assertions despite correct
results: the 10k case took 306 ms against its 250 ms ceiling, then the 1k case
took 59.7 ms against its 50 ms ceiling.

## Root cause

The test measures wall-clock time inside the full parallel workspace test gate.
On the failing runner it overlapped the core package's 100k incremental proof,
which occupied the same suite for more than ten seconds. The assertion therefore
included shared-runner scheduling delay as though it were evaluator execution
time.

## Fix

Retain the documented 50 ms and 250 ms ceilings for focused/local execution and
apply an explicit 2× multiplier only when `CI` is exactly `true`. The result-size
correctness assertions remain unchanged, and the CI ceilings still detect
material scale regressions.

## Prevention

Performance evidence that runs inside a parallel correctness suite must separate
the product target from an explicitly documented CI scheduling allowance.
