# Flint Integration — Portable Security and Data Contracts

How `@prometheus-ags/prometheus-entity-management` connects to the Prometheus
Flint fabric, which contracts this repository owns, and which contracts it
depends on downstream.

Authoritative machine-readable copy of the auth facts:
[`tests/fixtures/flint-auth/claims-contract.json`](../tests/fixtures/flint-auth/claims-contract.json).
The release gate `pnpm run verify:flint-contracts` checks this document against
that fixture.

## 1. The seam

```text
flint-gate (identity plane: JWT verify/mint, JWKS)
flint-forge (data plane: Postgres roles, RLS, forge-cli)
flint-realtime-fabric (event spine + @prometheusags/frf-entity-management SDK)
        │  watchEntities() / mutateEntity()
        ▼
createFlintAdapter()  ←  THIS repository's seam (packages/entity-graph-core)
        │  ChangeSet stream
        ▼
RealtimeManager → normalized entity graph
```

The consumer constructs the Flint client (from the sibling
`flint-realtime-fabric` workspace) and passes it to `createFlintAdapter`. This
package imports nothing from the Flint SDK; `@prometheusags/frf-sdk` stays an
optional peer.

## 2. Watch/mutate data contract (owned and tested here)

Mirrors `sdks/entity-management/src/{types,adapter}.ts` in
`flint-realtime-fabric`:

- `watchEntities({ channelId, consumerId, entityType?, fromOffset? })` yields
  decoded `EntityEvent`s: `{ entityType, entityId, tenantId, channelId, data,
  offset, correlationId? }`.
- Only `EventKind.ENTITY_CHANGE` envelopes decode; malformed JSON payloads are
  skipped, never forwarded; `tenantId` arrives on `envelope.channel.tenantId`.
- `mutateEntity({ entityType, entityId, tenantId, channelId, data,
  correlationId? })` publishes a JSON payload on channel
  `entity/<entityType>`.
- `offset` (bigint) is checkpointed per `channelId + consumerId`; reconnects
  resume at `fromOffset = lastSeen + 1`.

Default CI verifies this contract against a checked fixture
(`packages/entity-graph-core/src/adapters/flint-live.fixture.ts`) that mirrors
the SDK's encode/decode semantics line-for-line. Fixture evidence is always
labeled fixture-backed — never reported as live interop.

### Live lane (explicit opt-in, fail-closed)

Set both env vars to the sibling SDK build outputs and re-run the suite:

```bash
export FLINT_EM_MODULE=<flint-realtime-fabric>/sdks/entity-management/dist/index.js
export FLINT_SDK_MODULE=<flint-realtime-fabric>/sdks/ts/dist/index.js
pnpm --filter @prometheus-ags/entity-graph-core exec vitest run src/adapters/flint-live.test.ts
```

When opted in, resolution or shape failures FAIL the suite (no silent skip).
The sibling workspace must have its dependencies installed for the live lane to
resolve `@prometheusags/frf-sdk`.

## 3. Auth claims contract (depended upon; owned by flint-gate)

This repository does not verify tokens. The adapter consumes an
already-authenticated channel. The contract it relies on, verified against
`flint-gate` `auth/jwt_verify.rs` and `auth/jwks.rs`:

- **Issuer / audience** — `iss` validated when an issuer is configured; `aud`
  validated when configured (disabled otherwise).
- **Tenant** — tenant identity rides the channel envelope
  (`channel.tenantId`); subscriptions and mutations carry `tenantId` +
  `channelId`, and this repo's seam forwards them unchanged.
- **kid / JWKS (strict-JWK compatibility caveat)** — a token with no `kid`
  against a multi-key JWKS is rejected as ambiguous; consumers must never
  "pick the first key". An unknown `kid` forces at most ONE rate-limited JWKS
  refresh (`MIN_REFRESH_INTERVAL`), so a burst of bogus `kid`s cannot exceed
  one fetch per interval. Only asymmetric keys are selected;
  symmetric-downgrade / alg-confusion is rejected. **Clients integrating with
  the fabric MUST send a `kid` header matching a published JWK.**
- **Role / key separation** — roles: `anon`, `authenticated`, `service_role`
  (all `NOLOGIN`). Publishable keys are prefixed `flint_pk_...`; secret keys
  `flint_sk_...`. Ed25519 is the default for new keys. `service_role` secrets
  must never reach client code — client examples in this repo are scanned for
  secret material by the release gate.

## 4. Forge provisioning (owned by flint-forge)

- **Apply** — `forge migrate --source <migrations-dir>` applies SQL
  migrations. There is no separate `plan` subcommand: review the migration
  files, then apply. (`forge-cli` also provides `fn register`, `hook add`,
  `token mint`, `version`.)
- **Service-role-only provisioning** — DDL/provisioning runs as
  `service_role`, the fabric's BYPASSRLS "GOD" role (migration
  `0014_service_role_bypassrls.sql`). Never provision from an `anon` or
  `authenticated` context.
- **RLS** — `ext-flint-auth` creates the three roles; internal tables carry
  `FORCE ROW LEVEL SECURITY` (migration `0013_force_rls.sql`). Operators MUST
  apply `FORCE ROW LEVEL SECURITY` to their own tables — table ownership
  otherwise bypasses RLS predicates.
- **Audit** — flint-gate's middleware pipeline writes `AuthzAuditRecord`
  decisions (allow / deny / step-up). Shadow mode logs the deny but lets the
  request pass — do not confuse shadow-mode logs with enforcement.
- **Restart semantics** — gate caches are in-process (moka) with
  LISTEN/NOTIFY invalidation (optional Redis L2); a restart starts cold, so
  JWKS and route config are refetched on first use. Clients resume from their
  checkpoint (`fromOffset = lastSeen + 1`) after reconnect.

## 5. Not provided by this repository

- No JWT verification, JWKS fetching, or token minting (flint-gate).
- No Postgres roles, RLS policies, or migrations (flint-forge).
- No bundled Flint client; the consumer constructs it.
- No claim of live Flint interop from default CI — default-lane evidence is
  fixture-backed and labeled as such.
