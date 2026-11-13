## Why

`callRendererFunction` → `agentFunctionResponse` for agent-callable functions only; `callAgentFunction` → `rendererFunctionResponse`; D2a re-expression; UUIDv7 envelope kept; `requiresUserActivation`. The opt-in RC-input shim lives here because it must translate RC response-aware actions to the 1.0 function mechanism (D2a, D3). Carried review findings 6–10 that survive the rewrite are closed here (G10). Spec deltas for the three specs that require `wantResponse`/`responsePath`.

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 3 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Implement `callRendererFunction` → `agentFunctionResponse` for agent-callable functions only, refusing others with `INVALID_FUNCTION_CALL`
- Implement `callAgentFunction` → `rendererFunctionResponse`, re-express response-aware actions as function calls, and bound response writes by the resource limits
- Emit the action envelope for 1.0 actions through the action policy and entity-graph policy, and refuse functions that require user activation when no gesture occurred
- Add the opt-in RC-input shim, off by default for one minor line, translating RC envelopes and RC response-aware actions to 1.0 messages and function calls
- Close the carried review findings 6–10 that survive the rewrite (`keysOf` versus `parsePath`, unpruned `pendingActions`, `dispose()` leaving promises live, shadow-seed `catalogId`, action-key collisions)
- Bring the headless runtime and surface export to parity for 1.0 functions and actions
- Write spec deltas for `a2ui-action-envelope`, `a2ui-headless-runtime` and `a2ui-resource-limits`

## Impact

- Scope: runtime + headless runtime, action policy, entity-graph policy, limits, RC shim
- Depends on: 2 · Est. L · Complexity High · frontier · HIGH
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
