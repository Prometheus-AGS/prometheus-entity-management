---
title: Migrate to 5.0
sidebar_position: 2
description: Move agentic code to A2UI 1.0 final, AG-UI 1.0, @a2ui 0.15.0 and the official A2UI A2A extension.
---

# Migrate agent code to A2UI 1.0 and AG-UI 1.0

5.0.0 ships all thirteen packages in one fixed group. The core graph, React
hooks, schema and sync packages need only the version bump. The agentic
packages, `@prometheus-ags/a2ui-react` and `@prometheus-ags/entity-graph-a2a`,
change their wire formats and some public APIs. This page is a checklist for
those two packages.

You are affected if you send or store A2UI messages, read
`getClientCapabilities()` or `onRendererMessage`, use `onFunctionCall`, use the AG-UI
chat components, or send A2UI over A2A.

The Flutter showcase is part of the 5.0.0 work. It renders A2UI 1.0 natively
through the official `a2ui_flutter` 0.3.0 renderer, so it needs no separate
migration steps here.

## 1. Send A2UI 1.0 messages

Both runtimes (React and headless) now hold a v0.9.1 catalog and a 1.0 catalog
by default and process each surface in the version its messages declare. You can
migrate producers one at a time.

```ts
import {
  PROMETHEUS_A2UI_V1_CATALOG_ID,
  PROMETHEUS_A2UI_V1_PROTOCOL_VERSION,
  createPrometheusA2uiCatalog,
} from "@prometheus-ags/a2ui-react";

PROMETHEUS_A2UI_V1_PROTOCOL_VERSION; // "1.0"
PROMETHEUS_A2UI_V1_CATALOG_ID; // "urn:prometheus-ags:a2ui:catalog:a2ui-1.0"

const catalog = createPrometheusA2uiCatalog({ protocolVersion: "1.0" });
```

Before:

```json
{ "version": "v0.9.1", "createSurface": { "surfaceId": "s1", "catalogId": "urn:prometheus-ags:a2ui:catalog:v3", "theme": { "primaryColor": "#0b5fff" } } }
{ "version": "v0.9.1", "updateComponents": { "surfaceId": "s1", "components": [
  { "id": "root", "component": "Text", "text": { "path": "/title" } } ] } }
```

After:

```json
{ "version": "1.0", "createSurface": { "surfaceId": "s1", "catalogId": "urn:prometheus-ags:a2ui:catalog:a2ui-1.0" } }
{ "version": "1.0", "updateComponents": { "surfaceId": "s1", "components": [
  { "id": "root", "component": "Text", "text": { "@path": "/title" } } ] } }
```

- Set `version` to `"1.0"` and use the 1.0 catalog id.
- Bindings: `{ "path": ... }` becomes `{ "@path": ... }`; `{ "call": ..., "args": ... }`
  becomes `{ "@call": ..., "args": ... }`.
- Drop `theme`. The 1.0 schema has none.
- Component ids must be Unicode identifiers (UAX #31): letters, digits and
  underscores, so `update_button`, not `update-button`. A hyphenated id is
  refused with `protocolCode: "VALIDATION_ERROR"`.
- The envelope keys `@catalogId`, `@metadata`, `@accessibility` and `@checks` are
  accepted and translated to bare keys. Using both forms on one component is
  rejected as `invalid-message`.
- A 1.0 surface naming a catalog declared for another protocol version fails
  with `protocol-error` and `protocolCode: "CATALOG_ERROR"`.
- `exportSurfaceMessages` exports a 1.0 surface as one inline `createSurface`
  with no theme.

### Functions and actions

| RC message | 1.0 message |
| --- | --- |
| `callFunction` | `callRendererFunction` (agent to renderer), answered by `rendererFunctionResponse` |
| (none) | `callAgentFunction` (renderer to agent), answered by `agentFunctionResponse` |
| `actionResponse` | `agentFunctionResponse` |
| `wantResponse` / `responsePath` on actions | forbidden |

`onFunctionCall` is removed. A response-aware action becomes an explicit call:

```ts
await runtime.callAgentFunction(
  "order-review",
  { call: "refreshOrders", args: { status: "open" } },
  { writeTo: "/orders" },
);
```

`writeTo` writes the answer into the data model through `processMessages`, so the
resource limits apply. Supply `onRendererMessage` so the call reaches the agent.
`callRendererFunction` runs only catalog functions that pass `allowedCallers` and
user-activation checks; `openUrl` stays out of the default allowlist.

### Opt-in release-candidate shim

Messages with `version: "v1.0"` (the release candidate) are refused with
`unsupported-protocol-version`. To keep an old producer running while you move
it:

```ts
const runtime = createPrometheusA2uiRuntime({ acceptReleaseCandidateInput: true });
```

The option is off by default, needs a 1.0 catalog, translates RC input to 1.0,
and turns a response-aware action into `callAgentFunction` with `writeTo` set to
its `responsePath`. It is kept for one minor line after 5.0.0.

## 2. Plan for client-only basic-catalog rendering

`@a2ui/react` 0.15.0 renders the official basic catalog as Custom Elements. They
render only in the browser, so there is no server rendering of basic-catalog
components. `PrometheusA2uiSurface` still emits deterministic fallback markup
during SSR and takes over after hydration, so keep a useful `fallback`.

Other visible changes: basic-catalog CSS classes gained an `a2ui-` prefix,
missing components render nothing (no `[Loading id...]`), parent and child rules
now apply to custom components, and the ESM output grew by about 48% raw (709 KB
to 1,051 KB; 155 KB to 227 KB gzip).

## 3. Update public API use

| Change | What to do |
| --- | --- |
| `PrometheusA2uiComponentImplementation` is the official `ReactCatalogComponent` (a React or Web Component implementation) | Narrow the type before reading `.render` |
| `getClientCapabilities()` returns `PrometheusA2uiRendererCapabilities`, keyed by protocol version | Send it to the agent as is; `getClientDataModel("1.0")` returns the 1.0 data model |
| `onRendererMessage` receives official 1.0 renderer-to-agent messages | Stop handling RC messages |
| Processor errors are `PrometheusA2uiError` with code `protocol-error` and `protocolCode` | Branch on `protocolCode`; the raw error is `cause` |
| `@a2ui/web_core` is no longer installed by consumers; types are inlined | Remove it from your own dependencies if it was only there for types |

## 4. Move chat to AG-UI 1.0

`@ag-ui/core` is a `^1.0.0` peer of `entity-graph-core`, `entity-graph-react`
and `a2ui-react`.

```ts
import { useChatSession } from "@prometheus-ags/a2ui-react/ag-ui";

const session = useChatSession({
  sessionId: "support",
  streamFactory: (messages, { signal, resume }) => myStream(messages, signal, resume),
});
```

- Emit AG-UI 1.0 events (`AgUiEvent`). The bespoke names `MESSAGE_DELTA`,
  `TOOL_CALL_DELTA`, `ERROR` and `DONE` are gone.
- `streamFactory` receives `{ signal, resume }`. Cancellation is real: sending a
  new message, clearing, or unmounting aborts the previous run and drops its
  events.
- Messages are stored in the entity graph by `ChatConversationStore`; sessions
  with the same `sessionId` share them. Reasoning messages render collapsed.
- Interrupts: `resolveInterrupt(id, { approved, payload? })` decides each one,
  and `EntityInterruptApproval` is rendered by `EntityChat`. An approval is
  decided by the installed `actionPolicy`; with no policy, or an interrupt that
  maps to no action, it is `cancelled` (fail closed). Denial never calls the
  policy. Audit with `onInterruptDecision`.
- `EntityChat` lists an assistant message's tool calls. A client `toolProvider`
  runs at `RUN_FINISHED`, only for calls the agent did not answer with
  `TOOL_CALL_RESULT`, and never on a run that pauses on an interrupt.
- Views of the same `sessionId` on one graph share run ownership: a send from
  any view supersedes the others, and unmounting a passive view does not cancel
  the run. Each interrupt is claimed before its policy runs, so its action
  executes at most once. See [chat, runs and interrupts](../a2ui/chat-and-interrupts.md).
- The A2UI activity runtime accepts the `@ag-ui/a2ui-middleware` lifecycle
  activities. A `failed` one raises `onResyncNeeded` with the new reason
  `producer-failed`.

## 5. Move A2A to the official extension

| | Before | After |
| --- | --- | --- |
| `PROMETHEUS_A2UI_EXTENSION_URI` | Prometheus-owned URI | `https://a2ui.org/a2a-extension/a2ui/v1.0` |
| `PROMETHEUS_A2UI_MEDIA_TYPE` | `application/json+a2ui` | `application/a2ui+json` |
| `PROMETHEUS_A2UI_PROTOCOL_VERSION` | `"v0.9.1"` | `"1.0"` |
| DataPart `data` | `{ protocol, extensionUri, messages }` | the message list |
| `@a2a-js/sdk` | 1.0.1 | 1.3.0 |

```ts
import { createA2UIDataPart, extractA2UIMessages } from "@prometheus-ags/entity-graph-a2a";

const part = createA2UIDataPart(messages);
const received = extractA2UIMessages({ parts: [part] });
```

- Clients attach `a2uiRendererCapabilities` (with a `1.0` entry) to every user
  message; `runtime.getClientCapabilities()` produces it. An agent sends A2UI only
  in reply to a turn that offers it (`offersA2UICatalog`).
- Renderer-to-agent messages arriving in DataParts are refused unless the server
  has an `a2uiInbound` handler (`{ authorize, handle }`). Each message is decided
  on its own; if there is no handler, or all are refused, the request is rejected.
  `handle` must return 1.0 messages; any other version fails the task instead of
  being dropped. Its replies are sent when the turn offers A2UI 1.0 for any
  catalog.
- A malformed `supportedCatalogIds` (present but not a list) offers no catalog.

## 6. Verify your migration

The repository's own 5.0 acceptance commands are listed in
[testing and troubleshooting](./testing-troubleshooting.md#a2ui-10-and-ag-ui-10-acceptance-50).

Next: [A2UI and AG-UI](../a2ui/index.md), [chat, runs and interrupts](../a2ui/chat-and-interrupts.md), [agent protocol integrations](../integrations/agent-protocols.md).
