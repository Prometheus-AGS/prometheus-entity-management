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

## Development tooling and debugger rules

DevTools are local debugging capabilities, not application authorization or a
production administration API. Keep ordinary application entries independent
of optional tooling entries, activate tooling only under an explicit host-owned
development condition, and remove it from production artifacts.

For Flutter, `package:entity_graph_flutter/devtools.dart` registers store-
explicit methods and events through the Dart VM service only when service
extensions are available. Treat the VM-service URI and its authentication token
as secrets. Do not proxy it onto an untrusted network, record it in evidence, or
expose it from an application endpoint. Every graph uses an explicit store ID;
there is no implicit default graph across the isolate.

Flutter DevTools values are metadata-only by default. A host may enable values
only with an application-owned policy and required redactor. Commands cannot
escalate that policy, replace the redactor, or commit a preview. Requests,
responses, events, history, and snapshots retain simultaneous byte/count
ceilings. Detach every retained binding so a disposed application graph is
removed from debugger discovery.

The controller, bridge, and official Flutter DevTools extension are published
in pub.dev `3.0.5`. The assembled acceptance proves the real VM-service and
Riverpod boundary; official extension build validation is recorded separately.

## Secret and evidence handling

Release workflows use GitHub OIDC and stage-only npm authority. `NPM_TOKEN` and
`NODE_AUTH_TOKEN` are prohibited in the RC stage. Documentation text is scanned
for token-shaped strings and internal absolute paths. Image publication is
fail-closed on exact source and receipt hashes, exact successful receipt values,
minimum dimensions, nonblank entropy, and a hash-bound human review for visible
secrets and internal paths. Published originals are re-encoded to remove source
metadata; only allowlisted assets enter the gallery.

Flutter/Xcode child processes must also remove inherited
`CARGO_REGISTRY_TOKEN`, `NPM_TOKEN`, and `NODE_AUTH_TOKEN` before diagnostic
capture. Acceptance receipts retain bounded structured assertions and hashes,
never raw tool output, VM-service URIs, debugger tokens, entity values, or
host-local absolute paths.
