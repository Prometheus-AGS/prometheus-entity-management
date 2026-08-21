# Design: v3-flint-portable-contracts

## Approach

Implement this as the independent vertical slice defined by the matching phase-plan section. Treat its listed dependencies as hard entry gates and its acceptance criteria as the archive boundary.

## Constraints

- Preserve the repository architecture and package-manager rules.
- Prefer packed/public-artifact evidence over local source aliases.
- Record new decisions or gaps instead of weakening an acceptance criterion.

## Decisions

### D-1: Default lane runs against a checked fixture — it never skips

The old `flint-live.test.ts` hard-coded absolute sibling paths
(`/Users/gqadonis/Projects/prometheus/flint-realtime-fabric/...`) and silently
skipped when they did not resolve. That is a machine-specific path in default CI
and a silent Flint no-op — the two things the plan acceptance forbids.

A new checked fixture, `packages/entity-graph-core/src/adapters/flint-live.fixture.ts`,
mirrors the real `@prometheusags/frf-entity-management` `RealtimeAdapter` semantics
over an in-memory loopback spine: `EventKind.ENTITY_CHANGE`-only decoding, malformed
JSON payload skip, `entityType` filter, `tenantId` from `envelope.channel`, and
`mutateEntity` envelope publishing. The round-trip test runs against this fixture by
default, so the watch/mutate wire contract is verified in every CI run with zero
external dependencies. The fixture is imported only by tests; the package ships only
`dist/`, so nothing new reaches consumers.

### D-2: Live lane is explicit opt-in and fails closed

`FLINT_EM_MODULE` and `FLINT_SDK_MODULE` env vars point at the sibling SDK build
outputs. When set, the suite dynamically imports the REAL SDK and runs the same
round-trip; if resolution fails while opted in, the suite FAILS. When unset, the
fixture lane runs and its receipts are labeled fixture-backed — never "live". No
absolute machine paths are committed anywhere in the default lane.

### D-3: Security contract tests pin the adapter seam, not a new auth layer

`flint-security.test.ts` tests the security-relevant data contract of the seam this
repo actually owns: `tenantId`/`channelId` propagation through watch queries, events,
and mutation records; checkpoint key separation (resume state scoped per
channel+consumer, so one tenant or consumer cannot inherit another's offset);
`entityType` scoping; fail-closed malformed-payload handling at the fixture seam;
correlation-id passthrough. JWT verification is NOT reimplemented here — the identity
plane belongs to `flint-gate`, and inventing an auth layer in this repo would violate
the observed-problems-only rule.

### D-4: Issuer/tenant/kid/JWKS/role/key-separation pinned as a checked claims fixture

`tests/fixtures/flint-auth/claims-contract.json` encodes the auth contract facts
verified against the fabric source (flint-gate `auth/jwt_verify.rs`, `auth/jwks.rs`;
flint-forge `ext-flint-auth/sql/flint_auth.sql`, migrations `0013`/`0014`;
`forge-cli` command surface; the anon/service-role key spec):

- issuer and audience are validated when configured;
- a token with no `kid` against a multi-key JWKS is rejected (never "pick first");
- an unknown `kid` forces at most one rate-limited JWKS refresh;
- only asymmetric keys are selected (symmetric-downgrade rejected);
- roles are `anon` / `authenticated` / `service_role` (NOLOGIN; `service_role`
  carries BYPASSRLS; internal tables are FORCE RLS);
- publishable keys are `flint_pk_...`, secret keys `flint_sk_...`; `service_role`
  secrets must never reach client code.

`tests/release/v3-flint-portable-contracts.test.mjs` asserts the docs cover every
section consistent with the fixture, the default lane contains no machine-specific
absolute paths, client examples expose no service-role secrets, and the live lane is
env-gated and fail-closed.

### D-5: Docs describe the real fabric surface and an explicit non-claims boundary

`docs/flint-integration.md` documents the seam architecture (the consumer constructs
the Flint client; this package's adapter orchestrates the stream), the watch/mutate
contract with offset/checkpoint resume semantics, the auth claims contract including
the strict-JWK compatibility caveat (clients must send a `kid` matching a published
JWK; JWKS consumers must not "pick first"), Forge provisioning as it actually exists
(`forge migrate` applies SQL migrations — there is no separate `plan` subcommand;
`forge token mint` mints operator JWTs; provisioning is service-role-only; RLS via
`ext-flint-auth` + FORCE RLS migrations), audit (flint-gate `AuthzAuditRecord`
decisions, including shadow-mode log-but-pass), and restart semantics (in-process
caches are cold after restart, so JWKS is refetched; clients resume from their
checkpoint at `fromOffset = lastSeen + 1`). A "not provided by this repo" section
states plainly that token verification and the Flint client itself live downstream,
so no unbuilt adapter is claimed.

### D-6: Verifier, coverage, and ledgers follow the phase precedent

`scripts/verify-flint-portable-contracts.mjs` runs every gate from a clean state and
writes `verification.json`. The two `coverage.json` entries owned by this change
(`graph.realtime-batching` integration, `security.tenant-actions-secrets` security)
flip from `planned` to `implemented` with the verifier command and evidence paths.
Public API is unchanged, so the exports ledger needs no edit.
