# Verification: v3-flint-portable-contracts

**Date:** 2026-08-21
**Evidence boundary:** source-workspace (`countsAsPackedPackageEvidence: false`)
**Verifier:** `pnpm run verify:flint-contracts` →
`scripts/verify-flint-portable-contracts.mjs` → `verification.json` (result: **pass**)

## Acceptance matrix (plan section 19)

| Acceptance criterion | Evidence | Status |
|---|---|---|
| Default CI contains no machine-specific paths | Release test scans `packages/ tests/ scripts/ examples/` + root configs for `/Users/<name>/` and `/home/<name>/` patterns; the old hard-coded sibling paths in `flint-live.test.ts` are gone. Single allowlisted file: `tests/release/v3-package-module-contracts.test.mjs` (deliberate negative fixtures the manifest validator must reject). | pass |
| No silent Flint success | Default lane runs the round-trip against the checked fixture (`flint-live.fixture.ts`) — it executes, never skips. Receipts label the lane `fixture`; coverage.json applicability states fixture-backed, never "live". `ctx.skip` removed. | pass |
| Enabled live integration fails if unavailable | Opt-in via `FLINT_EM_MODULE` + `FLINT_SDK_MODULE`; partial config throws; unresolvable modules fail the suite. Verifier probe lane opts in with bogus paths and REQUIRES a non-zero exit (`liveLaneFailClosed: pass`). | pass |
| Issuer/tenant/kid/JWKS/role/key-separation tests | `tests/fixtures/flint-auth/claims-contract.json` pins the contract verified against flint-gate `jwt_verify.rs`/`jwks.rs` and flint-forge `ext-flint-auth`/migrations 0013/0014; release test asserts fixture contents and docs consistency. Seam-level behavior tested in `flint-security.test.ts` (tenant/channel propagation, per-channel+consumer checkpoint key separation, entityType scoping, fail-closed malformed/wrong-kind envelopes). | pass |
| Watch/mutate contract verified | `flint.test.ts` (7) + `flint-live.test.ts` fixture round-trip (2) + `flint-security.test.ts` (5) — 14 tests pass; full core suite 182 passed / 1 todo. | pass |
| Forge plan/apply, service-role-only provisioning, RLS, audit, restart semantics, strict-JWK caveat documented | `docs/flint-integration.md` sections 3–5; documents the real surface (`forge migrate` apply — no separate plan subcommand; `forge token mint`; service_role BYPASSRLS; FORCE RLS; `AuthzAuditRecord`; cold-cache restart + checkpoint resume) with an explicit "not provided by this repository" boundary — no unbuilt adapter claimed. Docs↔fixture consistency enforced by the release test. | pass |
| Client examples never expose service-role credentials | Release test scans `examples/` for `flint_sk_*`, JWT literals, and assigned `SERVICE_ROLE_KEY` values: zero findings. | pass |

## Gates run (all green)

| Gate | Result |
|---|---|
| `pnpm run verify:flint-contracts` (4 lanes: core contract, release gate, fail-closed probe, core typecheck) | pass |
| core vitest: flint.test + flint-live + flint-security | 14/14 pass |
| full `entity-graph-core` suite | 182 passed, 1 todo |
| release test `node --test tests/release/v3-flint-portable-contracts.test.mjs` | 6/6 pass |
| BDD `pnpm run bdd:flint-contracts` | 3 scenarios / 15 steps pass |
| `pnpm run typecheck` | 23/23 |
| `pnpm run validate` | errors: [] |
| `pnpm run verify:example-coverage` | errors: [] |
| eslint on new/changed files | clean |
| `openspec validate v3-flint-portable-contracts --strict` | valid |

## Live-lane verification detail

- Fixture lane: green (default).
- Live opt-in against the real sibling SDK (`flint-realtime-fabric/sdks/*/dist`):
  fails closed on this machine because the sibling workspace has no installed
  `node_modules` (`@prometheusags/frf-sdk` unresolvable from the sibling dist).
  This is exactly the acceptance behavior: **enabled live integration fails if
  unavailable** instead of silently skipping. Live interop itself is retained
  as a limit below.

## Defects found and fixed during this change

1. **Machine-specific paths in default lane** — `flint-live.test.ts` hard-coded
   `/Users/gqadonis/...` sibling build paths → replaced with env-gated opt-in +
   checked fixture (D-1/D-2).
2. **Silent skip masquerading as a green lane** — old suite skipped when the
   sibling SDK was unresolvable → default lane now always executes against the
   fixture; opt-in failure is hard.
3. **Release-test self-match** — the machine-path scanner matched its own
   allowlist comment containing an example path → comment reworded.
4. **Framework build caches embed machine paths** — `examples/nextjs-app/.next/`
   (untracked build output) tripped the scanner → walk now skips dot-directories
   (build caches legitimately embed build-machine paths).

## Retained limits

- **Live Flint interop** remains opt-in: requires the sibling
  `flint-realtime-fabric` workspace with installed dependencies and built SDK
  dists, plus `FLINT_EM_MODULE`/`FLINT_SDK_MODULE`. Not exercised green on this
  machine (sibling deps not installed); fail-closed behavior verified instead.
- **Token verification** is not reimplemented in this repo (identity plane is
  flint-gate); the claims contract is pinned as a fixture + docs, enforced by
  the release gate.
- Booted-device / live-network lanes are out of scope for this change.
