# @prometheus-ags/a2ui-react changelog

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
    A2UI 1.0 for any catalog; a malformed `supportedCatalogIds` offers no catalog.
  - `@prometheus-ags/entity-graph-core`, `@prometheus-ags/entity-graph-react`: `@ag-ui/core` peer `^1.0.0`.

  See the A2UI 1.0 migration guide in the documentation.

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@5.0.0

## 5.0.0 (unreleased)

### Breaking

- A2UI 1.0 final (`version: "1.0"`) through the official processor's 1.0 adapter, beside v0.9/v0.9.1. Both
  runtimes hold a v0.9.1 and a 1.0 catalog (`PROMETHEUS_A2UI_V1_CATALOG_ID`,
  `createPrometheusA2uiCatalog({ protocolVersion: "1.0" })`). RC (`"v1.0"`) input is refused unless
  `acceptReleaseCandidateInput` is set.
- Official `@a2ui/web_core` / `@a2ui/react` 0.15.0 (bundled, types inlined: consumers no longer install
  `@a2ui/web_core`). The basic catalog renders as Custom Elements, client-only. Bundle ~48% larger.
- `PrometheusA2uiComponentImplementation` = official `ReactCatalogComponent`; `getClientCapabilities()` returns
  version-keyed capabilities (`PrometheusA2uiRendererCapabilities`); `onFunctionCall` removed,
  `callAgentFunction(surfaceId, call, { writeTo })` added; `onRendererMessage` receives official 1.0
  renderer-to-agent messages; processor errors → `PrometheusA2uiError` `protocol-error` + `protocolCode`.
- `./ag-ui`: AG-UI 1.0 events (`AgUiEvent`), `streamFactory(messages, { signal, resume })`, working
  cancellation, messages in the entity graph (`ChatConversationStore`), interrupts via `resolveInterrupt` /
  `EntityInterruptApproval` decided by the action policy. `@ag-ui/core` peer `^1.0.0`.

### Fixed

- Stream cancellation in `useChatSession` was a no-op (the abort signal was never used).
- AG-UI A2UI middleware lifecycle activities (`status` without operations) were refused; they are now accepted and
  a failed one requests a `producer-failed` resync.
- `dispose()` now rejects pending agent function calls; data-model path parsing matches the official parser.
- A2UI 1.0 accessibility attributes are applied to application-supplied React components.

## 4.4.0

### Security

- `zod` 3.25.76 → **4.6.7** (GHSA-mrhx-c7xc-m3w5). The bundled
  `@a2ui/web_core@0.12.0` is patched to import `zod/v3` from Zod 4, so published
  consumers execute A2UI upstream code on this package's `zod@4.6.7`. The
  `@a2ui/web_core` dependency remains for its types and brings its own
  `zod@3.25.76` into consumer installs, unused at runtime; override `zod` to
  `4.6.7` if your audit must be clean.
- Markdown is sanitised with this package's exact `dompurify@3.4.17` through a
  port of `@a2ui/markdown-it@0.2.0` (which pins 3.4.11). `@a2ui/markdown-it` is
  no longer a dependency; `@a2ui/react` (bundled) moves to `devDependencies`.

### Changed

- `A2uiActionRule.contextSchema` is typed structurally (`parse`, `safeParse`), accepting
  Zod 4, Zod 3 and other compatible validators.

## 4.3.0

### Minor Changes

- **Behavior change:** AG-UI activity redelivery is idempotent and `replace:true`
  no longer deletes surfaces. A surface is deleted only by an explicit
  `deleteSurface` operation, so a producer that relied on a restatement to remove
  a surface or its components must send `deleteSurface`. Redelivery, replay and
  duplicate streams no longer roll a surface back or lose typed input.
- Added a React-free `./headless` entry (`createPrometheusA2uiHeadlessRuntime`)
  that shares the runtime core and allowlists, and `exportSurfaceMessages()` on
  both runtimes, with orphan pruning and v1.0 action metadata preserved.
- Added `onActionEnvelope` (a globally unique UUIDv7 `actionId`, `heldVersion`
  and the data model for every executed action, v0.9.1 and v1.0), `retryAction()`
  and `applyStaleActionRejection()`; `ACTIVITY_DELTA` with `onResyncNeeded`,
  `getHeldVersions()` and `buildA2uiForwardedProps`; and the `maxBufferedDeltas`
  and `bufferTimeoutMs` limits. Oversize deltas are rejected before they can be
  buffered, and a redelivered waiting delta is held once.
- Added the `maxComponentBytes` limit (1 MiB of serialized component properties
  per surface). A failing v1.0 `actionResponse` write is reported as a
  `batch-refused` producer fault instead of failing the batch that carried it.
- Added `MESSAGES_SNAPSHOT` handling, optional per-surface ordering through
  `content.surfaceVersions`, typed-input preservation with `onConflict`
  (producer wins), the `version-conflict` and `surface-config-mismatch`
  producer faults, and the `maxTrackedMessages` and `maxTombstones` limits.
- Added resource limits (`limits`, `onProducerFault`, `setLimits()`,
  `getLimitUsage()`), **enforced by default**: raise the relevant limits if you
  render surfaces larger than the defaults, or those calls are rejected with a
  `limit-exceeded` `PrometheusA2uiError`.

## 4.2.0

### Minor Changes

- Applications can supply their own catalog component implementations:
  `createPrometheusA2uiComponent`, `getPrometheusA2uiOfficialComponent` and the
  `implementations` option of `createPrometheusA2uiCatalog`. **4.2.0 is the
  first published version that ships this**: the published 4.2.0 package
  contains it, and its source commit is after 4.1.1's source commit
  (`c5a3a101`). Components must be built on the instance of `@a2ui/react` that
  this package bundles; one built with an application's own copy cannot share
  the surface context.
- Runs on official A2UI 0.12.0: `@a2ui/react` and `@a2ui/web_core` pinned
  exactly at 0.12.0, `@a2ui/markdown-it` at 0.2.0.

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

- Make provider-scoped imperative graph access explicit, correct Next.js
  hydration writes, add A2UI 1.0-RC compatibility for React and Flutter, and
  accept AG-UI 0.0.59 A2UI activity snapshots.
  - @prometheus-ags/entity-graph-core@3.0.4

## 3.0.3

### Patch Changes

- Updated dependencies
  - @prometheus-ags/entity-graph-core@3.0.3

## 3.0.0

### Patch Changes

- 7b64d76: Preserve caller ownership of official A2UI message inputs by cloning parsed
  messages separately for validation and processor commit, preventing later data
  model updates from mutating reusable fixtures or application-owned payloads.
- Updated dependencies [30fc348]
- Updated dependencies [7b64d76]
  - @prometheus-ags/entity-graph-core@3.0.0

## 3.0.0-rc.1

### Patch Changes

- @prometheus-ags/entity-graph-core@3.0.0-rc.1

## 3.0.0-alpha.0 — 3.0 release worktree

The full 3.0 release is not yet certified or published to npm `latest`.

### Breaking

- The package root is now the official A2UI v0.9.1 integration surface.
- Pre-3.0 `EntityChat`, `EntityCopilot`, `EntityStream`, `EntityDiff`,
  `EntityApproval`, tool-provider, and chat-session APIs move to
  `@prometheus-ags/a2ui-react/ag-ui`.
- React 19 is the supported peer line.

### Added

- Thin official `@a2ui/react/v0_9` and `@a2ui/web_core/v0_9` runtime bridge.
- Exact `v0.9.1` message enforcement with allowlisted official catalogs,
  components, and functions.
- `PrometheusA2uiProvider`, single/all-surface renderers, and subscription
  hooks with deterministic SSR fallback markup.
- Generic default-deny action policy with strict context validation,
  authorization, destructive approval, and auditable decisions.
- Entity-graph action policy with entity/action/field allowlists and
  application-owned tenant authorization.
- Root plus `./ag-ui` ESM/CommonJS/declaration exports and enforced public API
  ledger.

### Security

- `openUrl` is excluded from the default catalog.
- Unknown actions, tenants, entity types, and fields fail closed.
- Replace and remove require out-of-band approval; message context cannot
  self-authorize.

### Verification

- Official renderer and policy unit/integration tests.
- Tarball-only ESM, CommonJS, NodeNext, Node16, and server-render consumers.
- BDD acceptance scenarios.
- Built-artifact Chrome keyboard, responsive screenshot, accessibility, trace,
  video, and immutable-hash evidence.
