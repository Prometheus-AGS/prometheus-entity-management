# Task 1 — dependency readiness

Date: 2026-08-03  
Change: `v3-flutter-riverpod-a2ui-example`  
Task: Confirm dependencies are complete: `v3-dart-graph-riverpod`; `v3-a2ui-protocol-bridge`; `v3-example-coverage-contract`.

## Verdict

**Pass for starting the Flutter example implementation.** All three declared
OpenSpec prerequisites are archived with six of six tasks complete, retain
change-specific verification evidence, have promoted canonical specifications,
and pass fresh strict OpenSpec validation.

This receipt does not claim that the Flutter application, device builds,
platform certification, registry publication, or the full Prometheus 3.0
release is complete.

## Dependency evidence

| Dependency | Canonical evidence | Fresh check | Boundary retained |
| --- | --- | --- | --- |
| `v3-dart-graph-riverpod` | `openspec/changes/archive/2026-08-02-v3-dart-graph-riverpod/tasks.md`; `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-dart-graph-riverpod/final-verification.json`; `openspec/specs/v3-dart-graph-riverpod/spec.md` | `openspec validate v3-dart-graph-riverpod --strict` passed | `EntityGraph` remains the one canonical normalized graph; Riverpod projects graph state; native transport stays optional |
| `v3-a2ui-protocol-bridge` | `openspec/changes/archive/2026-08-01-v3-a2ui-protocol-bridge/tasks.md`; `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-a2ui-protocol-bridge/final-verification.json`; `openspec/specs/v3-a2ui-protocol-bridge/spec.md` | `openspec validate v3-a2ui-protocol-bridge --strict` passed | The official A2UI protocol bridge and catalog/action policy remain the protocol authority; the Flutter example must not introduce a second parser or bypass path |
| `v3-example-coverage-contract` | `openspec/changes/archive/2026-08-01-v3-example-coverage-contract/tasks.md`; `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-example-coverage-contract/clean-example-coverage-report.json`; `openspec/specs/v3-example-coverage-contract/spec.md` | `openspec validate v3-example-coverage-contract --strict` passed | Scenario claims require deterministic evidence and must distinguish planned, source, runtime, visual, and live-integration coverage |

## Control-plane provenance

The signed KBD authority reports these three pre-control-plane work items as
`pending` with empty task maps because legacy import revision 2 carried the
aggregate implementation count without backfilling individual task events.
That projection is not used as proof of their implementation. The dependency
decision instead relies on the committed archived task surfaces, promoted
specifications, and retained verification artifacts listed above. No signed
dependency state was rewritten or fabricated during this task.

## Task 2 handoff

- Build the branded example on the canonical Dart graph and generated Riverpod
  provider/controller surface.
- Reuse the official `genui` protocol engine behind a safe widget and action
  catalog; do not create a second Flutter protocol parser.
- Demonstrate optimistic/offline CRUD, relationships, realtime invalidation,
  loading/error/empty states, and deterministic A2UI fixtures.
- Keep Rust/native integration an optional transport adapter with no ownership
  of the core graph.

Publication authorized: **no**.
