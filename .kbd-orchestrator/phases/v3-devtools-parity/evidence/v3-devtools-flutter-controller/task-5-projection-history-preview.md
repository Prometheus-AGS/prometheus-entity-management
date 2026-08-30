# Flutter controller task 5 — projections, history, preview, and time travel

Date: 2026-08-30

## Production implementation

- Added immutable public graph snapshots plus exact snapshot restoration through
  the existing nested-aware graph publication boundary.
- Added one-publication exact patch replacement so DevTools preview restore
  never exposes an intermediate cleared patch.
- Projected publication before/after snapshots into protocol-v1 entity, patch,
  entity-state, sync, and list changes with aggregate counts, affected
  entities/views, per-entity inspection revisions, and exact value revisions.
- Added metadata-only/include projection at the retention and inspection
  boundaries. Included values pass through the synchronous host redactor before
  entering event history or inspection results; redaction failures remain typed
  and do not interrupt the graph.
- Added canonical/patch/merged entity records, dirty reasons, entity/sync
  status, view membership, registered-view list statistics, and optional
  `EntityGraphIR` relationship projection.
- Added simultaneous event count/byte limits, per-event byte bounding, and an
  independent simultaneous snapshot count/byte ring for every attached graph.
  Defaults match the TypeScript controller: 500 events / 5 MiB, 256 KiB per
  event, and 50 snapshots / 10 MiB.
- Added local preview receipts and exact restore refusal whenever entity or
  patch value revision changed after preview.
- Added retained rewind, exact return-to-live, mutation-driven return-to-live
  ordering, expired cursor reasons, inert history-import inspection, and
  one-shot explicit import confirmation.
- Kept all DevTools implementation behind `package:entity_graph_flutter/devtools.dart`;
  the ordinary package root has no DevTools import or export.

## Security boundary

The controller is the actual entity-value and VM-service-preparation trust
boundary. Metadata-only remains the default. Host redaction occurs before
values enter retained event history or inspection payloads. Imported history
is store/version/shape/count/byte validated, recursively frozen, and remains
inert until an explicit matching candidate/cursor confirmation.

## Verification at this task boundary

- `dart format --output=none --set-exit-if-changed` passed for graph,
  controller, protocol, projection, history, and preview sources. This is a
  formatter/parser check, not test evidence.
- Static source-contract assertions passed for publication observation,
  rewind-before-mutation ordering, exact patch replacement, metadata-only
  policy, projection-failure revision protection, bounded snapshots, inert
  import inspection, and ordinary-root exclusion.
- Core and Flutter entity-inspection fixtures remain byte-identical at SHA-256
  `5b2654e1ee326b2309b6ceb786db95dcfc3912a015adba2379cafebbea849890`.
- Core and Flutter time-travel fixtures remain byte-identical at SHA-256
  `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5`.
- Both fixtures passed `jq` JSON validation; the scoped diff passed
  `git diff --check`.

No analyzer, compiler, test, or build ran. The complete assembled Flutter
integration/acceptance gate remains task 8 after VM-service implementation and
integration wiring are complete. Sovereign sync was not touched.
