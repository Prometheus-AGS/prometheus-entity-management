# Entity inspection security boundary

Date: 2026-08-29

Entity inspection is an explicit developer-tool boundary over one concrete
`GraphStore`. It is available only through the optional versioned
`@prometheus-ags/entity-graph-core/devtools` entry point. The controller has no
authentication or remote authority of its own; any browser, VM-service, socket,
or extension adapter must authenticate and authorize its transport before
forwarding commands or results.

## Values and metadata

- The default value policy is metadata-only. Canonical entities, local patches,
  merged values, and preview receipt values are replaced with an explicit
  `hidden-by-policy` marker.
- Metadata-only is not anonymity. Entity types/IDs, dirty field names, fetch and
  sync status/timestamps, errors, view IDs/labels/query keys, membership, list
  counts, relationship names, and relationship endpoints remain inspectable.
  A transport must treat that topology as developer data and expose it only to
  an authorized debugging client.
- A host must explicitly select `values.mode: "include"` before graph values
  may leave the store. The same whole-value redactor applies to retained history
  and on-demand inspection; `context.destination` identifies the boundary.
- A throwing redactor returns a marker. Neither the original value, the thrown
  exception, nor its message crosses the transport boundary.
- Projected values are normalized to JSON-safe data rather than forwarding live
  object references.

## Local preview mutation boundary

- `preview-entity-patch` accepts a non-empty object for an existing canonical
  entity and writes only through the graph's existing local patch action. It
  cannot write canonical entity storage or commit to an external service.
- The receipt retains the exact prior patch inside the owning controller. Only
  one active receipt exists per entity, and all receipts are cleared when that
  controller is disposed.
- Restore is atomic only when the canonical/patch revision equals the receipt's
  preview revision. An intervening canonical or patch publication returns a
  typed conflict and leaves current graph state unchanged. Fetch/sync metadata
  updates do not authorize or block a restore.
- If semantic event projection fails and the controller cannot determine which
  values changed, it advances a controller-wide failure epoch. Active previews
  then fail closed with a conflict instead of restoring across an unknown
  publication.
- Missing entities, missing receipts, malformed payloads, wrong-store commands,
  incompatible versions, closed clients, and disposed controllers return typed
  failures rather than executing a mutation.

## Store, view, and schema isolation

- Entity revisions, view registrations, preview receipts, history, events,
  clients, and lifecycle state belong to one controller keyed by one
  `GraphStore`; separate stores cannot observe or restore one another.
- Stable view IDs may have multiple token-scoped registrations. Removing one
  token does not remove another consumer; final unregister and controller
  disposal clear retained view membership.
- Relationships are read from the existing process schema registry and current
  selected graph. DevTools introduces no second schema or relationship source
  and does not materialize missing targets.
- The source fixture is conformance data, not persisted application state.

## Evidence

`task-9-packed-acceptance.json` records passing packed ESM, CommonJS, and strict
NodeNext consumption plus value-policy enforcement, preview propagation,
successful and metadata-only exact restore, patch/canonical conflict refusal,
view cleanup, relationship topology, missing targets, store isolation, package
payload, and byte-identical TypeScript/Flutter fixture parity.
