# Stale Tauri coverage expectation blocked CI

Date: 2026-08-04

## Symptom

The Node 22 CI matrix leg failed `tests/release/v3-sync-persistence-path.test.mjs`
after the universal Tauri evidence had already passed its dedicated verification
and platform gates.

## Root cause

The sync/persistence release-path test still expected the platform evidence entry
for `graph.offline-persistence-sync` to be `planned`. The canonical coverage ledger
had correctly promoted that entry to `implemented` with
`pnpm run verify:tauri-universal`, but this exact-array assertion was not updated
with the promotion.

## Fix

Update the stale expected entry to match the certified Tauri evidence in
`examples/coverage.json`.

## Prevention

When an evidence owner promotes a coverage-ledger entry, search release-contract
tests for exact status/command expectations tied to that capability and update
them in the same change.
