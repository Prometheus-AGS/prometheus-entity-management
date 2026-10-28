# Tasks: a2ui-versioned-deltas

Model assignments: see the Task model assignments table in `.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/plan.md`.
Constraint: source under `official/`, `react/`, `policy/` must not contain, in any case, `STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGE_START`, `JSON.parse` or `jsonl`; `runtime.ts` must not contain `getState(`.

- [x] 1 Declare `@ag-ui/core` 1.0.3 as a dev dependency and widen the peer range to `>=0.0.59 <0.1.0 || ^1.0.0`
- [x] 2 Handle `ACTIVITY_DELTA` with a per-message content copy, accepting only `add` to the operations list and `test` on the held version and rejecting versionless deltas
- [x] 3 Buffer early or gapped deltas within the runtime limits, call `onResyncNeeded`, and clear buffers and timers in `dispose()`
- [x] 4 Add `getHeldVersions()` and a single `forwardedProps` builder module with the resync request
- [x] 5 Report a refused batch as an A2UI validation error together with a resync request
