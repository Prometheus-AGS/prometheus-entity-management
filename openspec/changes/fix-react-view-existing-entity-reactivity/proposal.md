## Why

React view hooks project rendered items from normalized IDs but currently do
not subscribe to the entity snapshots behind those IDs. A realtime update to
an existing entity therefore changes the graph while `useEntityView` and
`useEntityQuery` consumers continue rendering stale fields.

## What Changes

- Subscribe rendered view items to cached normalized entity snapshots as well
  as list membership.
- Cover both the established `useEntityView` hook and its `useEntityQuery`
  replacement with regression tests for unchanged-ID entity updates.
- Record a patch release for the fixed npm version group.

## Capabilities

### New Capabilities

- `react-view-reactivity`: Defines how normalized entity changes propagate
  through React view projections when list membership is unchanged.

### Modified Capabilities

None.

## Impact

The change affects the React package's two view projection hooks, focused
Vitest coverage, and Changesets release metadata. It adds no public API,
dependency, persistence, or transport change.
