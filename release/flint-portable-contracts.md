# Portable Flint realtime, security, and provisioning contract

This release gate keeps the Prometheus Flint integration portable while the
Flint repositories evolve independently. It certifies the boundary consumed by
this monorepo; it does not copy Flint runtime ownership into this package or
claim a Forge adapter that has not been implemented.

## Supported boundary

`@prometheus-ags/entity-graph-core` exports two Flint integration functions:

- `createFlintAdapter(options)` consumes a client with
  `watchEntities(query)` and projects decoded entity events through
  `RealtimeManager` into the normalized graph.
- `publishFlintMutation(client, record)` delegates an entity mutation to the
  client's `mutateEntity(record)` method.

The library owns only minimal structural TypeScript interfaces. Consumers own
construction, authentication, lifecycle, and installation of the current Flint
entity-management client. No Flint SDK is bundled into the core or React
package.

```ts
import {
  createFlintAdapter,
  getRealtimeManager,
  publishFlintMutation,
  type FlintClientLike,
} from "@prometheus-ags/prometheus-entity-management";

export function registerFlint(client: FlintClientLike) {
  const adapter = createFlintAdapter({
    client,
    channelId: "tenant-events",
    consumerId: "web-dashboard",
    entityType: "Task",
  });

  return getRealtimeManager().register(adapter);
}

export async function publishTask(client: FlintClientLike) {
  await publishFlintMutation(client, {
    entityType: "Task",
    entityId: "task-42",
    tenantId: "018f5f3a-44a8-7c52-8c76-31b799845aa1",
    channelId: "tenant-events",
    data: { status: "done" },
  });
}
```

The caller must retain the unsubscribe function returned by
`RealtimeManager.register` and invoke it during logout, route teardown, or HMR
replacement.

## Authentication and tenant boundary

The pinned Flint source contract requires:

- a production `iss` claim;
- a UUID `tenant_id` claim;
- publish tenant equality with the authenticated channel tenant;
- removal of foreign-tenant events before subscriber delivery;
- a `kid` header for asymmetric JWTs;
- `X-Flint-Role` and `X-Flint-Tenant-Id` forwarding after verification.

`FLINT_ANON_KEY` is the publishable client credential. The service-role key is
server-only and must never be embedded in browser, Flutter, or Tauri webview
bundles. Browser-like clients reject `flint_sk_` server keys.

Current Gate RSA JWKS entries contain standard RFC 7517 `n` and `e` members,
plus a PEM compatibility extension, so strict RSA consumers are supported. The
current EC publication still lacks standard `crv`, `x`, and `y`; strict EC JWK
consumers are therefore not certified. Symmetric/HMAC keys are not published.

## Forge provisioning boundary

Forge provisioning remains an external operator workflow under `/schema/v1`:

1. submit a typed JSON specification to `plan`;
2. review the generated DDL and plan hash;
3. submit that exact hash to `apply` with service-role authority;
4. inspect `status` and `ddl` for audit and operational state.

Raw SQL is not accepted through this contract. Apply is namespace-allowlisted
and transactional, enables and forces RLS, creates per-verb tenant policies,
and records an audit ledger. Newly provisioned REST routes report that a
restart is required. Provisioning is disabled by default.

This repository does not implement a Prometheus Forge provisioning adapter.
Applications should keep provisioning in server/operator infrastructure rather
than calling it from components, hooks, or client bundles.

## Verification

Default, machine-portable checks:

```bash
pnpm run test:flint-contracts
pnpm run bdd:flint-contracts
pnpm run verify:flint-contracts
```

The manual `Flint live contract` GitHub workflow checks out Realtime Fabric,
Gate, and Forge at exact 40-character revisions. The verifier first requires
each supplied Git worktree's `HEAD` to equal its declared pinned revision, then
verifies both the pinned commit blobs and the working-tree bytes against the
checked SHA-256 file set, builds the real entity-management SDK, and runs the
fail-closed live adapter test. Enabling the lane without all required
repositories, at a different commit, with a dirty pinned file, or with a
mismatched committed source file fails; it never silently skips.

The authoritative checked fixture is
`tests/fixtures/flint/portable-contract.json`. Coverage and task receipts are
recorded under
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-flint-portable-contracts/`.

## Evidence limits

- The default lane proves the checked structural contract and security policy;
  it does not claim network availability or deploy Flint services.
- The opt-in lane proves compatibility with its pinned revisions only.
- No repository-owned text-like client example file or generated example
  output contains service-role credentials. The scan traverses `.next`,
  `build`, `dist`, and `target`, includes dot-env files, YAML, TOML, native
  configuration, and extensionless text, and explicitly identifies binary
  artifacts. Third-party `node_modules`, Git metadata, and `.gradle` caches are
  excluded by name and listed in the machine receipt rather than silently
  counted as inspected example code. Generic assignments such as
  `SUPABASE_SERVICE_ROLE_KEY=...` are rejected alongside Flint-specific server
  keys. Token values are also inspected: a JWT whose decoded payload contains
  a `service_role` role is rejected even when assigned to a public-looking
  variable name.
- No Forge adapter, hosted identity provider, deployment, npm publication, or
  full 3.0 certification is implied by this gate.
