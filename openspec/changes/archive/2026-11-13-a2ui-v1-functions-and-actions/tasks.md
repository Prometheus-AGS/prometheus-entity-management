## Tasks

Model assignments for these tasks: see the **Task model assignments** table in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`,
rows keyed `phase-a2ui-1-0-agui-upgrade` / `a2ui-v1-functions-and-actions` / `a2ui-v1-functions-and-actions#<n>`.

- [x] 3.1 Implement `callRendererFunction` → `agentFunctionResponse` for agent-callable functions only, refusing others with `INVALID_FUNCTION_CALL`
- [x] 3.2 Implement `callAgentFunction` → `rendererFunctionResponse`, re-express response-aware actions as function calls, and bound response writes by the resource limits
- [x] 3.3 Emit the action envelope for 1.0 actions through the action policy and entity-graph policy, and refuse functions that require user activation when no gesture occurred
- [x] 3.4 Add the opt-in RC-input shim, off by default for one minor line, translating RC envelopes and RC response-aware actions to 1.0 messages and function calls
- [x] 3.5 Close the carried review findings 6–10 that survive the rewrite (`keysOf` versus `parsePath`, unpruned `pendingActions`, `dispose()` leaving promises live, shadow-seed `catalogId`, action-key collisions)
- [x] 3.6 Bring the headless runtime and surface export to parity for 1.0 functions and actions
- [x] 3.7 Write spec deltas for `a2ui-action-envelope`, `a2ui-headless-runtime` and `a2ui-resource-limits`
