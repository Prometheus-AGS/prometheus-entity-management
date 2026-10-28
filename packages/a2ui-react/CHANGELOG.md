# @prometheus-ags/a2ui-react changelog

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
