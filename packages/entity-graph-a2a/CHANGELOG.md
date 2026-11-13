# @prometheus-ags/entity-graph-a2a

## 5.0.0

### Major Changes

- A2UI 1.0, AG-UI 1.0 and the official A2UI A2A extension.

  **Breaking.** The whole fixed group moves to 5.0.0.

  - `@prometheus-ags/a2ui-react`
    - A2UI 1.0 final (`version: "1.0"`) is accepted natively through the official processor's 1.0 adapter; v0.9 and
      v0.9.1 input still works. Both runtimes hold a v0.9.1 catalog and a 1.0 catalog
      (`PROMETHEUS_A2UI_V1_CATALOG_ID`); `createPrometheusA2uiCatalog({ protocolVersion: "1.0" })`.
    - The A2UI 1.0 release-candidate dialect (`"v1.0"`) is refused unless `acceptReleaseCandidateInput` is set (kept
      for one minor line). Response-aware actions are re-expressed as `callAgentFunction`.
    - Official `@a2ui/web_core` and `@a2ui/react` 0.15.0, bundled; their types are inlined into this package's
      declarations, so consumers no longer install `@a2ui/web_core` (or its zod 3). The basic catalog renders as Custom
      Elements and is client-only; the entries still import in Node and during server rendering (a patched
      `@a2ui/react` defines no DOM class at load). The bundle is about 48% larger.
    - `PrometheusA2uiComponentImplementation` is the official `ReactCatalogComponent`; `getClientCapabilities()`
      returns version-keyed renderer capabilities; `onFunctionCall` is removed and `callAgentFunction` added;
      `onRendererMessage` receives official 1.0 renderer-to-agent messages; processor errors surface as
      `PrometheusA2uiError` with code `protocol-error` and `protocolCode`.
    - `./ag-ui`: chat, copilot and stream components consume AG-UI 1.0 events (`AgUiEvent`);
      `streamFactory(messages, { signal, resume })`; cancellation stops superseded runs; messages live in the entity
      graph (`ChatConversationStore`); interrupts are decided through the action policy (`resolveInterrupt`,
      `EntityInterruptApproval`).
    - `EntityChat` lists an assistant message's tool calls (name and arguments). A client `toolProvider` now runs at
      `RUN_FINISHED`, and only for tool calls the agent did not answer with `TOOL_CALL_RESULT` (previously it ran at
      `TOOL_CALL_END`, so agent-run tools also ran in the browser). A run that pauses on an interrupt runs no client
      tools.
    - Views of one conversation on one graph share run ownership: a send from any view supersedes the others, and
      unmounting a passive view no longer cancels the run. Each interrupt is claimed before its policy runs and bound
      to the pause it belongs to, so its action executes at most once; a throwing mapping or policy resolves it as
      `cancelled`. `MESSAGES_SNAPSHOT` keeps tool calls; a `STATE_SNAPSHOT` replaces the agent state.
    - Errors raised on a 1.0 surface after it is loaded reach the agent through `onRendererMessage`.
    - AG-UI A2UI middleware lifecycle activities are accepted; a failed one requests a `producer-failed` resync.
  - `@prometheus-ags/entity-graph-a2a`: the official extension `https://a2ui.org/a2a-extension/a2ui/v1.0`,
    media type `application/a2ui+json`, the DataPart `data` is the message list, A2UI is sent only when the turn offers
    `a2uiRendererCapabilities`, inbound client actions go to `a2uiInbound` (deny by default), `@a2a-js/sdk` 1.3.0.
    An `a2uiInbound.handle` that returns a non-1.0 message fails the task; its replies are sent when the turn offers
    A2UI 1.0 for any catalog; a malformed `supportedCatalogIds` offers no catalog. `createDeterministicA2UIMessages`
    emits a valid 1.0 surface (no heading variant).
  - `@prometheus-ags/entity-graph-core`, `@prometheus-ags/entity-graph-react`: `@ag-ui/core` peer `^1.0.0`.

  See the A2UI 1.0 migration guide in the documentation.

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@5.0.0

## 5.0.0 (unreleased)

### Breaking

- Official A2UI A2A extension v1.0: `PROMETHEUS_A2UI_EXTENSION_URI` = `https://a2ui.org/a2a-extension/a2ui/v1.0`,
  `PROMETHEUS_A2UI_MEDIA_TYPE` = `application/a2ui+json`, A2UI 1.0 payloads, the DataPart `data` is the message
  list (the `{ protocol, extensionUri, messages }` wrapper is gone).
- The reference agent sends A2UI only when the turn's `message.metadata.a2uiRendererCapabilities` offers 1.0.
- Inbound client A2UI messages go to the new `a2uiInbound` handler (`authorize` + `handle`); refused by default.
- `@a2a-js/sdk` 1.3.0.

## 4.0.0

### Patch Changes

- Updated dependencies [d1588d8]
- Updated dependencies
  - @prometheus-ags/entity-graph-core@4.0.0

## 3.2.0

### Minor Changes

- Release the complete DevTools distribution with the synchronized 3.2.0 workspace, including bounded core event metadata and responsive React inspector search during continuous graph updates.

## 3.1.0

### Patch Changes

- @prometheus-ags/entity-graph-core@3.1.0

## 3.0.5

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.5

## 3.0.4

### Patch Changes

- @prometheus-ags/entity-graph-core@3.0.4

## 3.0.3

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.3

## 3.0.0

### Patch Changes

- Updated dependencies [30fc348]
- Updated dependencies [7b64d76]
  - @prometheus-ags/entity-graph-core@3.0.0

## 3.0.0-rc.1

### Patch Changes

- @prometheus-ags/entity-graph-core@3.0.0-rc.1

## 3.0.0

### Major Changes

- v3.0.0 — Universal Platform Evolution

  Evolves the React-only entity graph into a cross-platform, multi-framework,
  AI-native, local-first ecosystem.

  - **Monorepo split (breaking, but consumer-safe):** the framework-agnostic core
    is extracted into `@prometheus-ags/entity-graph-core` (zero React). The
    published `@prometheus-ags/prometheus-entity-management` package is the React
    binding over the vanilla core. Existing React hook names remain available,
    while core-only imperative consumers migrate from `useGraphStore.getState()`
    to `graphStore.getState()`; the deprecated core alias remains through the
    next-major removal window.
  - **New framework bindings:** `entity-graph-svelte` (Svelte 5 runes),
    `entity-graph-solid`, `entity-graph-web-components` (Lit 3), `entity-graph-alpine`,
    `entity-graph-htmx` (Node SSE fragment server).
  - **Peer sync:** `entity-graph-sync` with a pluggable SyncProvider — Yjs (default)
    and Loro (reusing the 2.2.0 merge seam).
  - **AI-native:** `entity-graph-a2a` plus `a2ui-react` with official A2UI
    v0.9.1 rendering and default-deny graph actions; legacy
    EntityChat/Copilot/Stream/Diff/Approval APIs live under `./ag-ui`.
  - **A2A v1 (breaking):** the package root now serves the official A2A v1
    JSON-RPC discovery, task, streaming, subscription, and cancellation
    lifecycle through `@a2a-js/sdk@1.0.1`. Authentication and a caller-scoped
    default-deny application policy run before graph mutation. Pre-v3
    `/tasks/*` slash methods and alpha handler shapes move to the explicit
    `@prometheus-ags/entity-graph-a2a/legacy` migration subpath. REST, gRPC,
    push notifications, and extension signing are not declared capabilities.
  - **Codegen contract:** `entity-graph-sdl` (schema → validated IR).
  - **Native (published outside npm):** `entity-graph-cli` + `entity-graph-mcp`
    (Rust, via crates.io), `entity-graph-tauri` (Tauri v2 plugin), and
    `entity_graph_flutter` (Riverpod 3, via pub.dev).

  All integrations ship as optional peer dependencies; the core bundle stays
  `zustand + immer`.

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.0
