# Flutter controller task 1 — dependency and fixture contract

Date: 2026-08-30

## Dependency state

Canonical KBD revision 389 records all three production dependencies as
implementation-complete with no dependency blocker:

- `v3-devtools-core-observability`
- `v3-devtools-entity-inspection`
- `v3-devtools-time-travel`

The React inspector's separate formative-usability certification gate is not a
dependency of the Flutter controller and is not treated as one.

## Imported cross-language fixtures

The normative core fixtures and the copies already imported into
`packages/entity_graph_flutter/fixtures/devtools/` are byte-identical:

| Fixture | SHA-256 |
| --- | --- |
| `entity-inspection-v1.json` | `d07ecda2402b801889b4bf7b6bac5f92eb8434d3db3883b16bfa2d15eb1176ab` |
| `time-travel-v1.json` | `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5` |

The inspection fixture entered both runtimes in `dd574d24`; the time-travel
fixture entered both runtimes in `91fa67cf`. The Flutter fixture README names
the core copies as normative and prohibits runtime-specific extension.

Task 1 therefore required no fixture rewrite. `cmp` returned success for both
pairs and SHA-256 confirmed their identities. No test, analyzer, compiler, or
build ran; those gates remain deferred until the complete Dart controller path
is implemented.
