# Flutter controller task 2 — Dart v1 protocol contracts

Date: 2026-08-30

## Production contract

The optional `package:entity_graph_flutter/devtools.dart` entry now exports a
transport-independent Dart protocol surface without making DevTools reachable
from the ordinary `entity_graph_flutter.dart` library.

`lib/src/devtools/protocol.dart` defines the complete v1 wire vocabulary and
typed projections needed by the following controller tasks:

- protocol, command, success, and typed error envelopes;
- capabilities, limits, graph metrics, semantic changes, and five event kinds;
- bounded event and snapshot-history status plus retained/unavailable cursors;
- entity original/patch/merged state, dirty reasons, fetch errors, sync state,
  view membership, view subscriber counts, list health, and relationships;
- conflict-safe preview/apply/restore request and receipt contracts;
- rewind, return-to-live, five-field graph snapshots, inert import inspection,
  explicit confirmation, and import restore receipts;
- host-owned metadata-only/include policy and synchronous value-redaction
  context applied before retention or serialized transport.

The wire identifier is `prometheus.entity-graph.devtools`, the major version is
`1`, and Dart uses the same 15 command names, 12 feature names, field names,
status values, and error codes as the TypeScript v1 contract.

## Fixture evolution

TypeScript's production `GraphDevtoolsViewRecord` includes the active rendered
`subscriberCount`, while the older normative fixture omitted it. Both normative
copies were evolved together to include one active registration for each view:

| Fixture | SHA-256 |
| --- | --- |
| core `entity-inspection-v1.json` | `5b2654e1ee326b2309b6ceb786db95dcfc3912a015adba2379cafebbea849890` |
| Flutter `entity-inspection-v1.json` | `5b2654e1ee326b2309b6ceb786db95dcfc3912a015adba2379cafebbea849890` |
| core `time-travel-v1.json` | `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5` |
| Flutter `time-travel-v1.json` | `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5` |

`cmp` confirmed both cross-runtime pairs remain byte-identical, and `jq`
confirmed valid JSON plus the two required subscriber counts.

## Trust boundary

Entity values cross an actual serialized VM-service boundary in later tasks.
The public policy contract therefore defaults to metadata-only and accepts a
host-owned synchronous redactor before a value can enter retained history or a
serialized envelope. A transport may not elevate that policy. No secrets or
entity payloads are retained by this contracts-only task.

## Verification level

`dart format` parsed and formatted both Dart files. A static source-contract
probe confirmed all 15 command wire values, all 12 feature wire values, and 13
required contract families. `git diff --check`, fixture equality, SHA-256, and
JSON structure checks passed.

No analyzer, compiler, test, or build ran. The complete Flutter controller
production call graph is not implemented yet, so the full integration gate
remains deferred to task 8.
