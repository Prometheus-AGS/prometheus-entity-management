# @prometheus-ags/a2ui-react changelog

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
