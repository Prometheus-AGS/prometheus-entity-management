# Proposal: a2ui-hardening-acceptance

Phase `phase-v4-a2ui-runtime-hardening` · final change: example wiring, documentation, and the single integration boundary for the phase.

## Summary

No AG-UI producer or consumer exists in the repo: neither `examples/agentic-a2ui-app` (a Vite SPA served by `vite preview`) nor `examples/agentic-a2ui` (guarded by `tests/release/v3-agentic-a2ui-example.test.mjs`: required files, a secret regex, dependency pins) calls `processAgUiEvent`. Real-stream acceptance therefore needs a small real producer and consumer.

## Design

- New example package `examples/agui-activity-lab` (**Claude decision, pending operator confirmation**), registered in `pnpm-workspace.yaml` (examples are listed one by one), with the `src` aliases for `@prometheus-ags/a2ui-react` that the other examples use and an updated `pnpm-lock.yaml`: a Node `node:http` SSE server emitting AG-UI 1.0 snapshots, deltas and `MESSAGES_SNAPSHOT` with versions and epochs, recording the action envelopes it receives; and a page that feeds the stream to `PrometheusA2uiRuntime` through the package's hooks layer. `@ag-ui/core` is added for event types (already a peer of `a2ui-react`). Check `examples/coverage.json` and its schema for a registration requirement.
- Documentation: package README; `release/a2ui-protocol-bridge.md` (AG-UI 1.0 row, reconcile semantics, a new Flutter-contract section); and `prometheus-entity-skills/_shared/references/a2ui-protocol-bridge.md`, which `tests/release/v3-a2ui-protocol-bridge.test.mjs:80-90` also reads. Then the existing gates' expectations are reconciled once (the "honors replacement" assertion, the hard-coded export counts in `tests/release/v3-a2ui-protocol-bridge.test.mjs:56-57` and the bridge step, and the pins), followed by the single scoped `pnpm --filter @prometheus-ags/a2ui-react run refresh:exports` (it builds first) and the scoped `run verify:skills`.
- Per project policy nothing is authored or run until every production task above is complete and wired. Scenarios are then authored with the existing Cucumber and Playwright setup and run **once**: fix, rerun, no unit, mock-backed or partial evidence.
- Flutter: a documented contract section only; no Dart implementation (see `assessment.md`).

## Out of scope

Tagging or publishing (operator approval), Flutter implementation, server-side action arbitration.

## Acceptance

`verification.md` in this change maps scenarios AUI-1..14; authoring owner `a2ui-hardening-acceptance#6`, run owner `a2ui-hardening-acceptance#7`.
