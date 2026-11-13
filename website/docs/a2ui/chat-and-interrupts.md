---
title: Chat, runs and interrupts
sidebar_position: 7
description: How EntityChat and useChatSession run AG-UI 1.0 streams through the entity graph, cancel superseded runs, show tool calls, and decide interrupts through the action policy.
---

# A chat is a conversation in the graph, not component state

`@prometheus-ags/a2ui-react/ag-ui` turns an AG-UI 1.0 event stream into
entities. Every message is an `A2uiChatMessage` entity, every conversation an
`A2uiChatConversation` entity, and the order of a conversation's messages is a
graph list. A component that shows a conversation reads the graph, so two views
of the same conversation always agree, and a view of another conversation never
sees its messages.

```tsx
import { EntityChat } from "@prometheus-ags/a2ui-react/ag-ui";

<EntityChat
  sessionId="support"
  streamFactory={(messages, { signal, resume }) => agent.run(messages, { signal, resume })}
/>;
```

`useChatSession` is the same machinery without the UI. It returns `session`
(messages, `runStatus`, `runId`, `error`), `sendMessage`, `clearMessages`,
`interrupts` and `resolveInterrupt`.

## The stream contract

`streamFactory(messages, { signal, resume })` returns an
`AsyncIterable<AgUiEvent>` or a `ReadableStream<AgUiEvent>` for the next run.

| Event family | What lands in the graph |
| --- | --- |
| `RUN_STARTED`, `RUN_FINISHED`, `RUN_ERROR` | the conversation's `runStatus` (`running`, `finished`, `interrupted`, `error`) and `runId` |
| `TEXT_MESSAGE_*` | an assistant message, streamed (the cursor shows until `END`) |
| `REASONING_MESSAGE_*` | a `reasoning` message, rendered collapsed so the answer stays primary |
| `TOOL_CALL_START` / `ARGS` / `END` | a tool call (name and JSON arguments) on the assistant message; `EntityChat` lists it under the message |
| `TOOL_CALL_RESULT` | a `tool` message linked by `toolCallId` |
| `MESSAGES_SNAPSHOT` | replaces the conversation's messages, keeping tool calls |
| `STATE_SNAPSHOT` / `STATE_DELTA` | applied to entities through your `mappings` |

### Client-side tools

With a `toolProvider`, a tool call the agent leaves unanswered runs in the
browser when the run finishes (`RUN_FINISHED`), and its result is written as a
`tool` message. A call the agent answers itself with `TOOL_CALL_RESULT` never
runs in the browser. A run that ends paused on an interrupt runs no client
tools: nothing executes before a person decides, and the resumed run asks
again.

## Cancellation

`signal` is aborted when the run is superseded (a new message, a resume, or
`clearMessages`) or when the view that started it unmounts. Honour it so the
transport closes. The store also guards itself: once a run is superseded its
later events are dropped, even if the transport keeps delivering them.

Run ownership is shared by every view of one conversation on one graph. If a
second view of the same `sessionId` sends a message, the first view's run is
aborted and stops writing. A view that is only displaying the conversation can
unmount without cancelling the run another view started.

## Interrupts

AG-UI 1.0 pauses a run with `RUN_FINISHED` whose `outcome` is
`{ type: "interrupt", interrupts: [...] }`. The conversation becomes
`interrupted`, `EntityChat` shows `EntityInterruptApproval` for each interrupt,
and `useChatSession` exposes them as `interrupts`.

```ts
const { interrupts, resolveInterrupt } = useChatSession({
  sessionId: "billing",
  streamFactory,
  actionPolicy, // e.g. createEntityGraphA2uiActionPolicy({ ... })
  onInterruptDecision: (interrupt, entry, decision) => audit.record({ interrupt, entry, decision }),
});

await resolveInterrupt(interrupts[0].id, { approved: true, payload: { amount: 250 } });
```

- **Approve** sends the interrupt's action to your `actionPolicy`, exactly as an
  A2UI action: allowlist, authorization, execution and audit. By default the
  action is `interrupt.metadata["prometheus.action"]` (`{ name, context }`); an
  object `payload` (edit before approve) replaces the context. Override the
  mapping with `interruptToAction`.
- **Deny** never calls the policy; the interrupt resolves as `cancelled` with
  `denied-by-user`.
- It fails closed. With no policy, an unmapped interrupt, a refused action or a
  policy that throws, the interrupt resolves as `cancelled` with the reason.
- Each interrupt is claimed before its policy runs, so a second click, a
  second caller or a second view cannot run the same action twice.
- When every interrupt of the paused run is decided, the run resumes:
  `streamFactory` receives the decisions as `resume[]`
  (`{ interruptId, status: "resolved" | "cancelled", payload }`).

## Acceptance

`pnpm run verify:agui-run-stack -- --report <file>` drives real
`@ag-ui/client` and `@ag-ui/encoder` 1.0 streams into the built package in
Chromium. It checks rendering and graph sharing (UPG-10), that a superseded
stream makes zero writes while an unrelated one keeps writing (UPG-11), and
approve, edit, deny and policy-refused interrupts (UPG-12).

Next: [actions and policy](./actions.md), [migrating to 5.0](../operations/migration-5.md).
