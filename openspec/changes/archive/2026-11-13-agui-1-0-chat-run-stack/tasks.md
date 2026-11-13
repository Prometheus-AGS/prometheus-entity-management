## Tasks

Model assignments for these tasks: see the **Task model assignments** table in `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`,
rows keyed `phase-a2ui-1-0-agui-upgrade` / `agui-1-0-chat-run-stack` / `agui-1-0-chat-run-stack#<n>`.

- [x] 6.1 Replace the bespoke `StreamEvent` union with AG-UI 1.0 events (run lifecycle including `RUN_ERROR`, text messages, tool calls and results, reasoning, state, `MESSAGES_SNAPSHOT`) in `use-chat-session` and `entity-stream`, and pass an `AbortSignal` to `streamFactory`
- [x] 6.2 Record a reproduction of the no-op abort against the current code in design.md (implementation probe, not evidence), then make cancellation stop earlier streams on send, clear and unmount and drop events that arrive after abort
- [x] 6.3 Move chat messages into the entity graph through a store-owned adapter that the hooks read from
- [x] 6.4 Update `EntityChat`, `EntityCopilot` and `EntityStream` to the new hook contract, including reasoning and tool-result rendering, and update the `StreamEvent` uses in the `verify-a2ui-protocol-bridge.mjs` consumer fixtures
- [x] 6.5 Write the `agui-run-stack` spec
