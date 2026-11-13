## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G1 (function messages, wantResponse forbidden), G10 findings 6–10, G12 (three specs).

## Decisions

Adopted operator decisions that bind this change: D2a (response-aware actions → 1.0 function calls), D3 (opt-in RC shim for one minor line).

## Open design records

Recorded here during execution, before dependent code: RC action → callAgentFunction mapping; which carried findings survive the rewrite.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: implementation (tasks 3.1–3.7, 2026-11-12)

**Correction to the plan's wording.** In A2UI 1.0, `callAgentFunction` (renderer → agent) is answered by
`agentFunctionResponse` (agent → renderer); `rendererFunctionResponse` answers the agent's `callRendererFunction`.
The plan and two spec deltas had the pair crossed; the deltas are corrected.

- **3.1 `callRendererFunction`** is handled natively by the official processor (`rpc.handleCallRendererFunction`):
  the function must resolve in a registered catalog and pass `checkExecutionPermissions` (`allowedCallers`, user
  activation), otherwise the answer is an `INVALID_FUNCTION_CALL` error. The core now passes the processor an
  `outboundListener`, so `rendererFunctionResponse` and `callAgentFunction` reach `onRendererMessage`.
- **3.2** `runtime.callAgentFunction(surfaceId, { call, args?, catalogId? }, { writeTo?, timeoutMs? })` wraps the
  official `callAgentFunction`; with `writeTo` the answer is written through `processMessages` (limits apply; a
  failed write is a producer fault, not a rejected call). New public types `PrometheusA2uiAgentFunctionCall`,
  `PrometheusA2uiAgentFunctionOptions`. `onFunctionCall` (RC app-owned function calls) is **removed** (breaking):
  1.0 agent-initiated calls run catalog functions.
- **3.3** Executed actions still pass the action policy (and through it the entity-graph policy) and still produce
  the UUIDv7 envelope. On a 1.0 surface an executed action is also sent as a 1.0 `action` message
  (`onRendererMessage`). The policy keeps the 1.0-only `userMessage`, `catalogId` and `metadata` fields the v0.9
  schema would strip. User activation: enforced natively (bindings and `callRendererFunction`); `openUrl` stays out
  of the default allowlist.
- **3.4 RC shim** (`rc-shim.ts`, option `acceptReleaseCandidateInput`, off by default; needs a 1.0 catalog):
  RC envelopes → 1.0 (bindings to `@path`/`@call`, `callFunction` → `callRendererFunction`, `actionResponse` →
  `agentFunctionResponse` with `functionCallId = actionId`); response-aware actions are stripped and recorded, and
  when one fires it becomes `callAgentFunction` with `writeTo = responsePath`. Without the option an RC envelope is
  refused with `unsupported-protocol-version`. `PROMETHEUS_A2UI_RC_PROTOCOL_VERSION` keeps its public name, now
  exported from `rc-shim.ts`. `v1-compat.ts` and its legacy test are deleted.
- **3.5 carried findings:** `keysOf` mirrors the official `DataModel.parsePath` (empty segments dropped, one-pass
  unescape); action keys are a JSON tuple (`:` in ids cannot collide); `pendingActions` no longer exists;
  `dispose()` now calls `processor.dispose()`, which rejects pending RPC calls (it used to dispose only the model);
  per-component `catalogId` in the shadow seed was fixed in change 2. **Not addressed (no observed failure):**
  per-call cost proportional to held state (shadow seeding), ledger cleanup, the false `version-conflict` note.
- A refused call that carried a 1.0 message also sends the agent a 1.0 `error` (official
  `mapErrorToRendererMessage`) through `onRendererMessage`, so a producer can repair its output.
- **3.6 headless parity:** the headless runtime shares the core, so it has `callAgentFunction`, the outbound
  channel, the RC shim and per-version export; its entry now also exports the new types and the RC constant.
- **3.7** spec deltas validated (`openspec validate --strict`).

**Execution finding (2026-11-12, from the conformance harness).** Errors a 1.0 surface raises outside message
processing (for example `EXPRESSION_ERROR` from a refused activation-gated function in an action) reached only
`surface.onError`; nothing was sent to the agent, contrary to the `onRendererMessage` documentation. The runtime now
subscribes to each 1.0 surface's `onError` and sends a 1.0 `error` (code, message, surfaceId, path when present);
errors raised while `processMessages` runs are still reported once, by `reportV1Failure`. This relies on the runtime's
subscription being the surface's first `onError` listener (it is registered at surface creation), because web_core
0.15.0 invokes listeners in order and awaits each. Not yet exercised; the boundary run is the first execution.
