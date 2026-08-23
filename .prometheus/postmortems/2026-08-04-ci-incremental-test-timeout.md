# CI incremental parity timeout — 2026-08-04

## Symptom

PR #10's Node 22 and Node 24 CI jobs failed in
`src/view/incremental.test.ts` while the 100k-row parity test was still running.
The same repository gate passed on the development machine.

## Root cause

The deliberately large parity proof used Vitest's 5-second default timeout.
Shared GitHub runners completed the correct calculation in about 6.4 seconds,
so the harness timed out before the assertion could finish.

## Fix

Retain the 100k-row coverage and give that single test an explicit 15-second
timeout. The adjacent sub-linear work assertion remains unchanged.

## Prevention

Large deterministic certification tests must declare a bounded timeout based
on observed CI runtime rather than inheriting the unit-test default.
