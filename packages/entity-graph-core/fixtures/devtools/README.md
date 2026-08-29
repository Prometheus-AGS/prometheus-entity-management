# DevTools inspection fixtures

`entity-inspection-v1.json` is the normative, versioned conformance fixture for
the transport-independent entity-inspection projection. The byte-identical copy
under `packages/entity_graph_flutter/fixtures/devtools/` is consumed by the
Dart/Flutter implementation. The assembled integration gate must reject drift
between the two copies.

The fixture freezes these cross-runtime semantics:

- `canonical` is the server-confirmed original, `patch` is the local overlay,
  and `merged` is the live value rendered by graph consumers.
- `dirtyReasons` explains field-level local changes and entity-level sync state;
  `dirty` is true when that array is non-empty.
- All wire timestamps are UTC ISO-8601 strings. Missing values are explicit
  `null`; omitted fields are not interchangeable with `null`.
- View identities are stable host-provided strings. Membership is represented
  in both view-to-entity and entity-to-view directions and must agree.
- Relationships come only from the existing entity schema registry and expose
  unresolved foreign keys as `missing-target` rather than inventing entities.
- A preview receipt owns the exact prior patch and the entity revision produced
  by preview application. Restore succeeds only at that revision; any later
  canonical or patch mutation returns the typed conflict receipt unchanged.

The JSON document is data, not a second graph state or a persistence format.
Production projections are derived on demand from the owning graph store.

`time-travel-v1.json` is the normative cross-runtime contract for controller-
owned snapshot history. Its byte-identical Flutter copy freezes the complete
five-field graph data shape, stable cursor and expiry semantics, rewind/live
receipts, mutation-while-rewound ordering, and inert/confirmed import flow.
The conformance harness attaches the fixture to the declared `time-a` store;
consumers must attach that store ID or replace it consistently before import.
Snapshot values remain local controller data; the fixture is conformance input,
not a persistence or unbounded history format.
