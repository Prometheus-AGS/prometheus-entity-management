# Task 4 — coverage, API, skills, and documentation synchronization

Date: 2026-08-04

Verdict: **PASS — declared Flint surfaces are synchronized**

## Coverage ledger

The two `v3-flint-portable-contracts` entries in `examples/coverage.json` now
record implemented evidence:

- `graph.realtime-batching` points to the portable adapter test, explicit live
  integration, immutable workflow, checked contract, and external-source
  receipt.
- `security.tenant-actions-secrets` points to the contract fixture, verifier,
  regression tests, and security receipt.

Both entries use `pnpm run verify:flint-contracts` and retain the distinction
between portable default CI and the opt-in real-SDK workflow.

## Public API ledgers

No publishable TypeScript entry point changed. The existing machine runtime
ledger already contains `createFlintAdapter` and `publishFlintMutation`, so it
was deliberately not regenerated. `pnpm run verify:skills` confirms all 203
React-facade runtime exports still match that ledger, along with the separate
sync, A2UI, A2A, Tauri, and Dart ledgers.

The human API reference and both React-facing README tables now document the
two Flint functions and the structural client/checkpoint/event types.

## Skills and documentation

- Added `release/flint-portable-contracts.md` for runtime usage, JWT/JWKS,
  tenant/key separation, Forge plan/apply/RLS/audit/restart semantics, commands,
  and evidence limits.
- Added the shared Flint agent reference and linked it from the root and
  realtime skills.
- Extended the realtime adapter catalog, selector, activation keywords, and
  agent rules with the structural client and actual security boundary.
- Recorded current strict-JWK behavior precisely: RSA has standard `n`/`e`;
  EC still lacks `crv`/`x`/`y`.
- Preserved the explicit exclusion: this repository does not implement a Forge
  provisioning adapter.

## Verification

| Check | Result |
| --- | --- |
| `pnpm run test:flint-contracts` | PASS — 7/7 tests |
| `pnpm run bdd:flint-contracts` | PASS — 6/6 scenarios, 20/20 steps |
| `pnpm run verify:flint-contracts` | PASS — documentation, coverage, API ledger, and client-secret checks |
| `pnpm run verify:example-coverage` | PASS — 13 scenarios, 16 capabilities, 16 stable artifacts |
| `pnpm run verify:skills` | PASS — React 203 plus sync, A2UI, A2A, Tauri, and Dart ledgers |
| focused ESLint | PASS — zero warnings |
| JSON parsing, Node syntax, and `git diff --check` | PASS |

The machine-readable receipt is `task-4-verification.json`.

## Remaining boundary

Task 5 owns aggregate clean-state verification. Task 6 owns final evidence,
artifact refinement, isolated adversarial review, OpenSpec verification, and
archive. The frozen React `3.0.0-rc.1` candidate remains remote
`main@1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; this task performs no registry
or dist-tag mutation.

## Signed KBD receipt

Task 4 completed at signed revision 140 with both `task:after` hooks successful.
The known task-transition projection reset recurred, so a typed revision-141
transition restored the parent change to `in_progress`; tasks 1–4 remain
complete and tasks 5–6 remain pending.
