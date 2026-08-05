# Task 3 verification — Flint portable contracts

Date: 2026-08-04

Task: Add or update checks required by the plan acceptance criteria.

Verdict: **PASS — task-scoped checks complete**

## Delivered checks

- Added a versioned portable contract fixture bound to immutable revisions of
  Flint Realtime Fabric, Flint Gate, and Flint Forge and to SHA-256 digests for
  14 source files.
- Added six Node regression tests and five BDD scenarios covering the consumed
  `watchEntities`/`mutateEntity` surface, fail-closed source drift, issuer and
  tenant isolation, asymmetric `kid`, JWKS publication, role/key separation,
  Forge plan/apply semantics, RLS/audit/restart requirements, and the absence
  of a locally implemented Forge adapter claim.
- Added repository scanning that rejects machine-specific integration paths,
  silent live-test skips, and service-role credentials in client examples.
- Extended the manual live workflow to check out all three Flint repositories
  by exact 40-character commits and run the hash-bound verifier before the real
  Realtime SDK contract.

## Verification receipts

| Check | Result |
| --- | --- |
| `pnpm run test:flint-contracts` | PASS — 6/6 tests |
| `pnpm run bdd:flint-contracts` | PASS — 5/5 scenarios, 16/16 steps |
| portable verifier/report | PASS — 24 repository files, 297 client-example files, zero exposed credentials |
| immutable external-source verifier | PASS — 14/14 files at the three pinned commits |
| focused ESLint | PASS — zero warnings |
| entity-graph-core typecheck | PASS |
| `actionlint .github/workflows/flint-live-contract.yml` | PASS |
| JSON parsing and `git diff --check` | PASS |

The first BDD run exposed a real CommonJS-loader incompatibility with the
verifier's CLI top-level `await`. The CLI boundary now calls an async `main()`
without top-level await; the affected unit, BDD, verifier, and lint gates pass
after that correction.

## Exact external sources

- Realtime Fabric: `cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89`
- Gate: `2438892dfc7177c568bf57f3339a206d728f4ff2`
- Forge: `2289d1527f13f7b72c317ec374f4dc0ff366a136`

Verification used clean detached worktrees at those exact commits. The
retained machine-readable receipts are `task-3-verification.json` and
`task-3-external-source-verification.json`.

## Sycophancy correction and security boundary

The earlier blanket strict-JWK caveat is stale for current Gate RSA keys. Gate
now publishes standard RFC 7517 RSA `n` and `e` members, so strict RSA consumers
are compatible. The caveat remains for current EC publication, which lacks
standard `crv`, `x`, and `y` coordinates. No unbuilt compatibility adapter is
claimed.

The credential scan and tenant equality checks protect actual boundaries:
service-role credentials are server-only, browser-like examples may not embed
them, publishes must match the authenticated tenant, and foreign-tenant events
are not delivered to subscribers.

## Remaining change work

- Task 4 owns coverage, public API, skills, and documentation synchronization.
- Task 5 owns aggregate clean-state verification; this task intentionally ran
  only its scoped Tier 0/Tier 1 checks.
- Task 6 owns final evidence, QA, isolated review, verification, and archive.
- The frozen React `3.0.0-rc.1` candidate remains remote `main` commit
  `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; this task did not mutate npm or
  any dist-tag.

## Signed KBD receipt

Task 3 completed at signed revision 137. Both `task:after` hooks exited zero.
The task transition reproduced the known parent-projection reset, so the parent
change was restored to `in_progress` with a typed transition at revision 138;
tasks 1–3 remain complete and tasks 4–6 remain pending.
