# Task 1 dependency gate — `v3-flint-portable-contracts`

Date: 2026-08-04

## Verdict

**PASS.** Both plan dependencies are strictly verified, promoted, and archived.
The Flint portability implementation may proceed without weakening the explicit
exclusions in the phase plan.

## Dependency proof

| Dependency | Archived change | Promoted specification | Direct verification | Result |
| --- | --- | --- | --- | --- |
| `v3-framework-neutral-core` | `openspec/changes/archive/2026-08-01-v3-framework-neutral-core/` | `openspec/specs/v3-framework-neutral-core/spec.md` | `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-framework-neutral-core/verification.md`; `pnpm exec openspec validate v3-framework-neutral-core --type spec --strict --no-interactive` | Pass |
| `v3-example-coverage-contract` | `openspec/changes/archive/2026-08-01-v3-example-coverage-contract/` | `openspec/specs/v3-example-coverage-contract/spec.md` | `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-example-coverage-contract/verification.md`; `pnpm exec openspec validate v3-example-coverage-contract --type spec --strict --no-interactive` | Pass |

The framework-neutral verification explicitly assigns the remaining absolute-
path Flint live test to this change. The example-coverage verification retains
Flint live integration as unclaimed downstream work, so neither prerequisite
silently claims the portability or live-integration acceptance criteria owned
here.

The signed KBD ledger is authoritative for current execution state. Legacy
pending projections for imported dependency changes are not completion proof;
the archived OpenSpec changes, promoted strict specifications, and retained
verification receipts above are the dependency-completion evidence.
Signed revision 131 records task 1 complete. The task transition reproduced the
known parent-status reset, so a typed, signed transition restored the parent
change to `in_progress` at revision 132; no projection file was hand-edited.

## Refreshed implementation inputs

The user-requested sibling repositories were fetched and inspected before this
gate. These revisions define the current external contract baselines; they are
inputs to the remaining tasks, not vendored dependencies or evidence that this
change is already implemented.

| Repository | Inspected local revision | Fetched `origin/main` |
| --- | --- | --- |
| `flint-realtime-fabric` | `ce021c8c1f3e7cf93f9371539552278cc3a5f4bb` | `cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89` |
| `flint-gate` | `7ed6834b0a621847a3b252bf3c6bfdb78bfb2a88` | `2438892dfc7177c568bf57f3339a206d728f4ff2` |
| `flint-forge` | `aca94224faafdc466b05d3944e06a5873efa0d42` | `2289d1527f13f7b72c317ec374f4dc0ff366a136` |

The inspected realtime SDK still exposes the structural contract already used
by the local adapter: `watchEntities(query): AsyncIterable<EntityEvent>` and
`mutateEntity(record): Promise<void>`. No runtime adapter signature change is
required by task 1. Later tasks must still replace the machine-specific live
test, fail closed when an explicitly enabled live lane is unavailable, and add
the auth, provisioning, and security evidence required by the plan.

Official-source web research was refreshed through Firecrawl for the external
security model:

- Supabase JWT/RLS guidance: <https://supabase.com/docs/guides/auth/jwts>
- Supabase asymmetric signing-key and rotation guidance: <https://supabase.com/docs/guides/auth/signing-keys>
- Auth0 JWT validation guidance: <https://auth0.com/docs/secure/tokens/json-web-tokens/validate-json-web-tokens>
- Auth0 RBAC overview: <https://auth0.com/intro-to-iam/what-is-role-based-access-control-rbac>

Forge plan/apply, service-role-only provisioning, RLS, audit, and restart
semantics will be documented from the fetched Forge source and its current
`docs/api/schema-provisioning.md`; task 1 does not claim an unbuilt Forge
adapter.

## Preserved React-first boundary

Remote `main` remains the frozen React RC source at
`1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. This dependency gate changes no
package source, version, npm dist-tag, release workflow authority, or registry
state.

## Remaining task boundary

- Task 2: portable checked fixture plus explicit fail-closed live integration
  lane; no absolute sibling paths or silent success.
- Task 3: deterministic watch/mutate, issuer, tenant, `kid`, JWKS, role, and
  client/server key-separation tests.
- Task 4: coverage, public ledgers, skills, and provisioning/security docs.
- Task 5: clean pnpm/OpenSpec/security/integration gates at the designated phase
  boundary.
- Task 6: evidence reconciliation, artifact-refiner QA, isolated adversarial
  review, promotion, and archive.
