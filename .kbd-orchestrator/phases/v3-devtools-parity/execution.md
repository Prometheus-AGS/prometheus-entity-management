# EXECUTION: v3-devtools-parity

**Recovered:** 2026-08-29
**Selected backend:** native-kbd
**Dispatched to:** SELF through `/kbd-apply`
**Backend entrypoint:** `/kbd-apply <change-id>`
**Source plan:** `.kbd-orchestrator/phases/v3-devtools-parity/plan.md`
**Canonical authority:** signed KBD runtime revision 439, plan revision 10
**Current position:** change 4 of 9, task 12; implementation and automated acceptance complete
**Exact next command:** `/kbd-apply v3-devtools-react-inspector`

## Execution contract

1. Read the signed waypoint and phase-local `progress.json` at every turn boundary.
2. Drive one change through `/kbd-apply`; use its typed begin/end task transitions so hooks, signed status, waypoint, and projections stay aligned.
3. Implement the complete production call graph before test execution.
4. Run no unit, component, isolated, mock-backed, snapshot, or partial tests. Run the declared assembled integration/acceptance gate only after implementation is complete.
5. After each change, update public ledgers/docs/evidence, run artifact-refiner, run an artifact-only isolated adversarial review, verify, and archive.
6. Start no downstream change before its dependencies are complete and archived.
7. Report `phase -> change -> task` progress at the end of every turn.

## Dispatch contracts

| # | Change | Entry | Dependency gate | Completion evidence |
|---|---|---|---|---|
| 1 | `v3-devtools-core-observability` | `/kbd-apply v3-devtools-core-observability` | none | complete core/React/packed-consumer integration plus docs/refiner/review/archive |
| 2 | `v3-devtools-entity-inspection` | `/kbd-apply v3-devtools-entity-inspection` | core archived | assembled projection/preview integration plus docs/refiner/review/archive |
| 3 | `v3-devtools-time-travel` | `/kbd-apply v3-devtools-time-travel` | core archived | assembled multi-store rewind/live integration plus docs/refiner/review/archive |
| 4 | `v3-devtools-react-inspector` | `/kbd-apply v3-devtools-react-inspector` | inspection and time travel archived | `ui-spec.md` implementation plus packed Vite/Next browser activation, hide/restore, dirty/original/view/history, responsive, keyboard, screen-reader, and 500-event acceptance; then docs/refiner/review/sycophancy/archive |
| 5 | `v3-devtools-flutter-controller` | `/kbd-apply v3-devtools-flutter-controller` | core, inspection, and time travel archived | assembled Dart/Flutter parity and VM-service acceptance plus docs/refiner/review/archive |
| 6 | `v3-devtools-chrome-extension` | `/kbd-apply v3-devtools-chrome-extension` | React inspector archived | packaged MV3 multi-tab/panel browser acceptance plus security/refiner/review/archive |
| 7 | `v3-devtools-flutter-extension` | `/kbd-apply v3-devtools-flutter-extension` | Flutter controller archived | official extension build/connection acceptance plus refiner/review/archive |
| 8 | `v3-devtools-docs-examples` | `/kbd-apply v3-devtools-docs-examples` | all product surfaces archived | docs/example/README parity and accessible browser acceptance plus refiner/review/archive |
| 9 | `v3-devtools-release-certification` | `/kbd-apply v3-devtools-release-certification` | changes 1–8 archived | immutable-SHA packed/security/performance/browser/Flutter/docs certification |

## Model routing

The project contains no KBD model-policy registry, so all changes resolve to the active frontier session model. No unavailable concrete model identifier is inferred.

## Current recovery disposition

Historical signed tasks 2–5 for core observability are not accepted as implementation evidence because the claimed `./devtools` and per-store controller surface is absent from the current branch. Tasks 6–8 are cancelled. Native task 9 re-audits and implements the full production contract; task 10 owns the single full integration/acceptance run; task 11 owns public records and archive gates.

## Blockers and authority gates

- The React inspector implementation and automated acceptance are complete.
  At signed revision 437 and plan revision 10, the operator removed the
  unstarted 12-person study as an archive/release blocker and retained it as
  optional post-release research. The zero-participant report remains retained
  evidence and is not represented as a pass; no human-study or “world class”
  certification claim is made.
- The phase resumed at signed revision 439. React task 12 may close after its
  revised documentation and isolated-review record are complete, after which
  the ordered Chrome change may start.
- Chrome Web Store submission, npm/pub.dev publication, tag movement, signing, and protected-environment operations require their explicit release task and external authority; this phase does not silently perform them.
