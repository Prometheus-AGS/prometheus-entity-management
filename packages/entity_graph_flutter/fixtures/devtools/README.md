# Shared DevTools inspection fixture

`entity-inspection-v1.json` must remain byte-identical to
`packages/entity-graph-core/fixtures/devtools/entity-inspection-v1.json`.
React/TypeScript and Dart/Flutter conformance gates consume the same semantics;
neither runtime may extend its copy independently. The normative field contract
is documented beside the core fixture.
