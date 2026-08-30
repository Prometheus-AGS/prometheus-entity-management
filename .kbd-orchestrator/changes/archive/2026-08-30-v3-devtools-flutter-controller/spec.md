# v3-devtools-flutter-controller

## Goal

Deliver Dart parity for the versioned entity-graph DevTools protocol through an
optional Flutter package entry. One reference-counted controller observes each
`EntityGraph`, Riverpod providers register logical rendered views, and one
isolate-wide VM-service router exposes bounded store-specific discovery,
commands, and semantic events without moving business state out of the graph.

## Prerequisite contracts

The archived core observability, entity-inspection, and time-travel changes own
the normative version-1 semantics and cross-language fixtures. This change
implements their Dart equivalents; it does not create a second protocol,
snapshot owner, or UI-owned entity store.

The ordinary `package:entity_graph_flutter/entity_graph_flutter.dart` entry
must remain usable without importing Flutter DevTools APIs. The optional
`package:entity_graph_flutter/devtools.dart` entry owns the tooling surface.

## Production requirements

- Define typed version-1 envelopes, capabilities, metrics, semantic events,
  entity/view/relation/error projections, preview receipts, history cursors,
  rewind/live receipts, import inspection, and data-policy contracts.
- Reference-count exactly one controller per graph. Disabled attachment is
  inert; repeated attachment shares the controller; only the final detach
  disposes listeners, histories, previews, and the active VM-service entry.
- Observe the shared graph publication boundary so public mutations, compound
  operations, rollback, invalidation, adapters, and Riverpod/list lifecycles
  produce ordered, deduplicated semantic records.
- Keep controller snapshots and event histories bounded. Stable identifiers
  are not reused, expired history is explicit, preview restore refuses a value
  revision conflict, and return-to-live restores the protected live head.
- Register one versioned discovery method and one versioned command method per
  isolate. Every command names an active store and validates the protocol,
  envelope, payload, confirmation, and transport ceilings.
- Preserve host ownership of value exposure. Metadata-only is the default;
  included values pass through the host redactor before retention or
  serialization; remote commands cannot escalate that policy.

## Security boundary

The Dart VM service is a debugger trust boundary. Its URI and authentication
token are secrets and must not be recorded in receipts or public diagnostics.
The bridge is debug-mode tooling, not an application authorization boundary.
Requests, responses, events, histories, snapshots, and imports are bounded;
included values are explicitly host-enabled and redacted before crossing the
boundary. Detach deterministically removes active stores even though
isolate-global service-extension method registration itself cannot be undone.

## Acceptance boundary

One external assembled Flutter/Riverpod/VM-service acceptance flow launches a
real debug application, discovers its VM service, invokes the production
serialized methods, observes Extension-stream events, mounts real Riverpod
entity/list providers, and drives two graph controllers. It must prove fixture
parity, store isolation, semantic projections, view lifecycles, redaction and
policy refusal, transport/event bounds, preview conflict refusal, rewind/live
ordering, history clearing, and deterministic disposal.

The accepted receipt must remain sanitized and identify the tested source
commit. Unit, widget, component, isolated, mock-backed, snapshot, golden, and
partial-integration evidence is excluded.

## Publication and documentation truth

Source-derived public declaration ledgers cover both Dart entries and fail
closed through the package/skills/API verification chain. Public guidance must
distinguish the repository controller source from the already-published
pub.dev `3.0.1` archive, which does not yet contain `devtools.dart`, and from
the separate Flutter DevTools extension UI, which is a later phase. This
change neither publishes a package nor claims extension/release certification.

## Architecture impact

- **UI:** none in this change; the separate official Flutter DevTools extension
  consumes this controller later.
- **State:** `EntityGraph` remains the sole business-state owner; the controller
  retains only bounded debug projections, histories, and receipts.
- **View model:** generated Riverpod entity/list providers register logical
  views and membership with the graph tooling boundary.
- **Service:** one isolate-wide VM-service router dispatches explicitly by
  stable store ID.
- **Persistence:** none; history/import candidates are bounded in-memory debug
  state and are released on controller disposal.
