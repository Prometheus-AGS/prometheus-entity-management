# Shared DevTools inspection fixture

`entity-inspection-v1.json` must remain byte-identical to
`packages/entity-graph-core/fixtures/devtools/entity-inspection-v1.json`.
React/TypeScript and Dart/Flutter conformance gates consume the same semantics;
neither runtime may extend its copy independently. The normative field contract
is documented beside the core fixture.

`time-travel-v1.json` must likewise remain byte-identical to the core fixture.
It is the future Dart controller's retention, rewind/live, branching,
expired-cursor, and confirmed-import conformance input; it does not imply that
the Flutter controller or DevTools extension is implemented yet. Its declared
`time-a` store ID is part of the conformance envelope and must be attached or
replaced consistently before import.
