## Why

AG-UI 1.0 events including `RUN_ERROR` and `MESSAGES_SNAPSHOT`; `streamFactory` receives an `AbortSignal` (breaking, fits 5.0.0). The abort defect (G5) is read from code; it is demonstrated, and its fix shown, by a recorded reproduction before the change (task 2, a probe, not evidence) and by UPG-11 in the boundary run. Messages move into the graph through a store (G6, layering).

Part of KBD phase `phase-a2ui-1-0-agui-upgrade`, change 6 of 11. Source: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`
(decisions D1–D8 adopted 2026-11-12 in `assessment.md` §9).

## What Changes

- Replace the bespoke `StreamEvent` union with AG-UI 1.0 events (run lifecycle including `RUN_ERROR`, text messages, tool calls and results, reasoning, state, `MESSAGES_SNAPSHOT`) in `use-chat-session` and `entity-stream`, and pass an `AbortSignal` to `streamFactory`
- Record a reproduction of the no-op abort against the current code in design.md (implementation probe, not evidence), then make cancellation stop earlier streams on send, clear and unmount and drop events that arrive after abort
- Move chat messages into the entity graph through a store-owned adapter that the hooks read from
- Update `EntityChat`, `EntityCopilot` and `EntityStream` to the new hook contract, including reasoning and tool-result rendering, and update the `StreamEvent` uses in the `verify-a2ui-protocol-bridge.mjs` consumer fixtures
- Write the `agui-run-stack` spec

## Impact

- Scope: `use-chat-session`, `entity-stream`, `EntityChat`/`EntityCopilot`/`EntityStream`, a store-owned message adapter
- Depends on: 4 · Est. L · Complexity High · frontier · HIGH
- Acceptance: the scenarios owned by this change in `adopted-contract.json`, exercised only in the
  phase's single post-implementation boundary run (no unit tests as evidence).
