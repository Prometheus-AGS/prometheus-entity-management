## Why

Prometheus Entity Management 3.0.2 publishes N+2 successful Zustand updates when a fetched list contains N rows: one bulk entity write, N per-row fetched-state writes, and one list write. Large valid responses can therefore monopolize the browser thread even when consumers use narrow selectors.

## What Changes

- Add one core fetched-list ingestion action that merges normalized rows, marks every row and sync record fetched with one timestamp, and applies replace or append list metadata in one store publication.
- Route core `fetchList`, React `useEntities`, `useEntityQuery`, legacy `useEntityView`, GraphQL list normalization, and list adapters that reproduce the per-row lifecycle loop through the atomic action.
- Update view-backed base projections inside the same action so pagination and remote-view subscribers do not recreate one publication per matching row.
- Preserve merge strategy, entity lifecycle, sync lifecycle, list pagination, replace, append, stale, and error semantics.
- Add an observed 3.0.2 negative control and a 7,248-row regression proving success publication count is constant with row count.
- Version every affected npm package in the fixed 3.x group for the next patch release after verification.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `v3-framework-neutral-core`: Require atomic fetched-list graph ingestion as the shared framework-neutral primitive used by bindings and adapters.

## Impact

- Affects the core graph store/engine and React, GraphQL, and list-adapter paths that currently split one successful fetch across multiple writes.
- Keeps public entity/list results compatible; the new primitive may be public only if downstream packages need to call it without bypassing the core engine.
- Requires package-level tests, packed-consumer compatibility where the public export changes, a changeset for the next patch release, and an upstream commit/push/PR.
