## Why

The React binding's callable `useGraphStore` hook resolves the nearest
`GraphStoreProvider`, but its attached imperative `StoreApi` methods are copied
from the default singleton. Consumers can therefore mount an isolated store
while callbacks and infrastructure code silently continue writing to the
process-global graph, defeating the advertised SSR/client isolation boundary.

## What Changes

- Keep the hook form of `useGraphStore(selector)` scoped to the nearest provider.
- Deprecate and diagnose the attached singleton-only imperative methods when a
  provider-owned tree is mounted, without changing their 3.x compatibility
  target.
- Require provider-aware callbacks and infrastructure components to capture
  `useGraphStoreApi()` and require non-React/module-level code to receive an
  explicit `GraphStore` dependency.
- Correct the Next.js hydration example so request payloads are written to the
  provider-owned browser graph rather than the default singleton.
- Document that React context cannot scope Server Components or arbitrary
  module-level functions, and add regression coverage for the diagnostic and
  the corrected hydration path.
- Upgrade the React and Flutter A2UI boundaries to accept the A2UI 1.0 release
  candidate while retaining the verified published v0.9 renderer engines.
- Accept AG-UI 0.0.59 `a2ui-surface` activity snapshots at the React transport
  boundary without merging AG-UI authority into the A2UI renderer.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `v3-binding-singleton-contract`: Clarify and enforce the boundary between
  provider-scoped React access and the compatibility singleton's imperative
  methods.
- `v3-nextjs-app-router-example`: Require hydration infrastructure to write
  through the provider-resolved graph and state the Server Component boundary.
- `v3-a2ui-protocol-bridge`: Add an explicit A2UI 1.0-RC compatibility adapter
  and AG-UI 0.0.59 activity transport contract.
- `v3-flutter-riverpod-a2ui-example`: Validate A2UI 1.0-RC surfaces before
  adapting them to the currently published GenUI v0.9 renderer.

## Impact

The change affects `packages/entity-graph-react` types/runtime diagnostics,
the Next.js example hydration boundary, the A2UI React runtime, the Flutter
showcase boundary, related tests and documentation, and package changelogs. It
adds only an optional AG-UI peer contract and preserves the 3.x
runtime behavior of the legacy attached methods while making unsafe scoped
usage visible and migratable.
