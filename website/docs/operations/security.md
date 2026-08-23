---
title: Security and tenant boundaries
sidebar_position: 2
---

# Name the authority at every external boundary

The graph is application state, not an authorization system. A client-visible
entity never proves that the current actor may read, mutate, subscribe to, or
publish it. Enforce authorization in the service and persistence boundaries
that own those operations.

## Tenant and transport rules

- Derive tenant scope from a validated identity claim; do not accept a client
  tenant ID as authority.
- Apply row-level security and service validation independently of client
  filters. A local `FilterSpec` is presentation, not access control.
- Scope realtime subscriptions by tenant, channel, and consumer. Persist
  checkpoints with that identity so offsets cannot cross tenants.
- Validate issuer, audience, expiry, algorithm, `kid`, JWKS source, and role at
  the Flint/Gate boundary. Keep signing, verification, and service-role keys
  separate.
- Never expose Forge provisioning or Supabase service-role credentials in web,
  Flutter, Tauri frontend, documentation, screenshots, or agent prompts.

## Agent and generated UI rules

A2A protocol validity and A2UI schema validity do not grant graph authority.
Render only an allowlisted widget catalog. Map actions through an
application-owned catalog with argument validation, tenant/actor policy, and
human approval where the action has consequential effects. Unknown, malformed,
cancelled, or denied actions fail before store mutation.

## Native rules

Tauri capabilities grant the minimum command/event surface. Validate every
native response before projection. Flutter FFI is a transport seam, not a way
to hide a second graph or bypass Dart-side policy. Signing, notarization, and
store distribution are independent release authorities.

## Secret and evidence handling

Release workflows use GitHub OIDC and stage-only npm authority. `NPM_TOKEN` and
`NODE_AUTH_TOKEN` are prohibited in the RC stage. Documentation text is scanned
for token-shaped strings and internal absolute paths. Image publication is
fail-closed on exact source and receipt hashes, exact successful receipt values,
minimum dimensions, nonblank entropy, and a hash-bound human review for visible
secrets and internal paths. Published originals are re-encoded to remove source
metadata; only allowlisted assets enter the gallery.
