# Tasks: a2ui-action-ids

Model assignments: see the Task model assignments table in `.kbd-orchestrator/phases/phase-v4-a2ui-runtime-hardening/plan.md`.
Constraint: source under `official/`, `react/`, `policy/` must not contain, in any case, `STATE_SNAPSHOT`, `STATE_DELTA`, `MESSAGE_START`, `JSON.parse` or `jsonl`; `runtime.ts` must not contain `getState(`.

- [x] 1 Implement RFC 9562 UUIDv7 generation inline, adding no dependency
- [x] 2 Emit the action envelope for executed actions of both v0.9.1 and v1 and never for policy-denied actions, leaving the v1 correlation id inside the action untouched
- [x] 3 Extend the shared `forwardedProps` builder with `actionId`, `heldVersion` and the client data model when `sendDataModel` is set
- [x] 4 Add `retryAction(actionId)` reusing the id
- [x] 5 Apply the operations returned with a stale-action rejection and record the wire shape as a decision
- [x] 6 Document the correlation id and the idempotency id and their separate roles
