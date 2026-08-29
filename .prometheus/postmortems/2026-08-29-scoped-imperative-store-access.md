# Scoped imperative store access defect

Date: 2026-08-29
Issue: https://github.com/Prometheus-AGS/prometheus-entity-management/issues/42

## Symptom

`useGraphStore(selector)` resolved the nearest `GraphStoreProvider`, while the
four StoreApi methods attached to the same callable export always referenced
the default singleton. Provider-mounted code could therefore appear scoped
while imperative writes landed in process-global state.

## Root cause

`Object.assign(useBoundGraphStore, graphStore)` copied the singleton's method
references onto the hook at module initialization. React context exists only
during component or hook execution and cannot select a graph for arbitrary
module-level calls.

## Fix

The attached methods remain singleton delegates for 3.x compatibility, but are
individually deprecated and emit bounded development diagnostics. React
effects and callbacks capture `useGraphStoreApi()`; non-React and server code
receive or create an explicit `GraphStore`. The Next.js hydration boundary now
writes through the provider-resolved store.

## Prevention

Focused tests distinguish the provider graph from the singleton for selector
reads, captured callback writes, each compatibility delegate, and hydration.
Documentation names the Client Component, Server Component, and module-level
ownership boundaries explicitly.
