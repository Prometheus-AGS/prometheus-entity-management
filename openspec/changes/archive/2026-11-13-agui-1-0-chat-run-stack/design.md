## Context

KBD phase `phase-a2ui-1-0-agui-upgrade`. Plan: `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/plan.md`.
Assessment items addressed: G4, G5, G6; W3, W7.

## Decisions

Adopted operator decisions that bind this change: D4 (W3, W7; G6 folded into W3; SUBAGENT_* and multimodal excluded, flagged in plan).

## Open design records

Recorded here during execution, before dependent code: Pre-fix reproduction of the no-op abort; graph schema for conversations and messages; the breaking hook contract.

## Notes

The spec deltas in `specs/` were written at plan time from the adopted decisions. The change's "write spec
deltas" task finalizes them against the shipped behaviour. Acceptance evidence comes only from the phase's single
post-implementation boundary run defined in `adopted-contract.json`.

## Record: implementation (tasks 6.1–6.5, 2026-11-12)

- **6.1** `AgUiEvent` / `AgUiEventType` (types.ts): the AG-UI 1.0 events this package consumes, named as
  `@ag-ui/core` 1.0's `EventType`, typed structurally so the published declarations do not require the optional
  `@ag-ui/core` peer (an `@ag-ui/core` event object is assignable). `StreamEvent`/`StreamEventType` remain as
  deprecated aliases; the pre-5.0 bespoke names (`MESSAGE_DELTA`, `TOOL_CALL_DELTA`, `ERROR`, `DONE`, …) are gone
  (**breaking**). `streamFactory(messages, { signal })` (**breaking**: new second argument). Handled: run
  lifecycle incl. `RUN_ERROR`, text and reasoning messages (start/content/end/chunk), tool calls (start/args/end/
  chunk) and `TOOL_CALL_RESULT`, `STATE_SNAPSHOT`/`STATE_DELTA` (graph bridge), `MESSAGES_SNAPSHOT`; other types are
  ignored as AG-UI 1.0 requires. `SUBAGENT_*` and multimodal parts are excluded (D4 narrowing, accepted).
- **6.2 Cancellation.** `sendMessage`, `clearMessages` and unmount abort the previous run's signal; the store's run
  token drops every event of a superseded run, and leaving the `for await` loop closes the iterator.
  **Deviation:** the plan asked for a recorded reproduction of the no-op abort against the old code before the
  change; it was not executed. The defect is shown from the HEAD source only: `use-chat-session.ts:67,270-271,312`
  create and abort an `AbortController` whose signal is never read and never passed to `streamFactory(...)` (line
  293). UPG-11 in the boundary run is the evidence for the fix. The PLAUSIBLE stale-history read disappears with
  the rewrite, because history is now read synchronously from the graph.
- **6.3 Messages in the graph.** `chat/conversation-store.ts` (`ChatConversationStore`) consumes the stream and
  writes `A2uiChatMessage` entities (id = JSON tuple of conversation and message id), the ordered id list
  `a2ui-chat:<conversationId>`, and an `A2uiChatConversation` record (run status, run id, error, loading). The hook
  reads it through `useSyncExternalStore` on the active graph (`resolveActiveGraphStore`, or `graphStore` option);
  two sessions with the same `sessionId` share messages. `ChatSession` gains `runStatus` and `runId`.
- **6.4 Components.** `EntityChat` renders reasoning messages collapsed (`<details>`), with new class slot
  `messageReasoning`; `EntityCopilot` keys classes off the role as before; `EntityStream` reads AG-UI 1.0 events
  (`TEXT_MESSAGE_CONTENT|CHUNK`, `TOOL_CALL_ARGS|CHUNK`, `STATE_DELTA.delta`, `RUN_ERROR.message`). The packed
  bridge fixtures in `verify-a2ui-protocol-bridge.mjs` use `AgUiEvent` and `PrometheusA2uiRendererCapabilities`.
  The store and its types are exported from `./ag-ui`.
- **6.5** `agui-run-stack` spec delta validated.
- Note: `EntityStream` still consumes its stream inside the component, as before this phase (a layering debt this
  change does not widen; not tasked).

## Execution findings (acceptance authoring, 2026-11-12)

Found from source while writing `verify:agui-run-stack`, fixed before the boundary run:

- `EntityChat`'s `MessageBubble` rendered only `content`, so `TOOL_CALL_*` never appeared in the chat even though the
  store wrote `toolCalls` onto the assistant message (UPG-10 requires them to render). It now lists each tool call
  (name and arguments) under the message, in `ul.a2ui-msg__tool-calls`.
- `toolCallEnd` ran the client `toolProvider` at `TOOL_CALL_END`. An agent that runs the tool itself sends
  `TOOL_CALL_RESULT` after `TOOL_CALL_END`, so such tools also ran in the browser and produced a second tool message.
  `TOOL_CALL_END` now only marks the call ended; at `RUN_FINISHED` the store runs, through the provider, only the ended
  calls the agent did not answer. A stream that ends without `RUN_FINISHED` runs no client tools.

## Review-driven hardening (11.5, 2026-11-12)

The isolated review (14 rounds, see `.kbd-orchestrator/phases/phase-a2ui-1-0-agui-upgrade/review/final/`) led to:
run ownership shared per graph and conversation, cancel only by the owner, one store per graph; interrupts claimed
atomically and bound to their pause (epoch), fail-closed on throwing mappings/policies and on unreadable outcomes,
decided-but-unresumed pauses resumed by any mounted view; no client tools on interrupted or aborted runs; chunk
identity carried across continuation chunks and closed like the AG-UI client; snapshot tool calls kept; agent state
replaced per snapshot and reset per run; streaming flags settled when a run ends, errs, is cancelled or superseded.
