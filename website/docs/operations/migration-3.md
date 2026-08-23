---
title: Migrate from 2.x or an alpha
sidebar_position: 1
---

# Migrate to the 3.x package family

3.x separates a framework-neutral core from UI bindings, sync, schema, agent,
and native packages. The safest migration is a strangler sequence: establish
one graph, normalize one entity family, move readers, move mutations, then
remove the old query-owned copies.

## 1. Choose one application-owned graph

React applications add the core and React binding as one compatible candidate
set. Server-rendered applications create a graph per request and hydrate a
scoped `GraphStoreProvider`; browser-only applications may use the default
singleton. Svelte, Solid, Alpine, Web Components, and HTMX resolve the same core
peer rather than installing their own runtime graph.

## 2. Replace copied query data with IDs

Before, a mutation commonly rewrote detail and list caches separately:

```ts title="website/snippets/migration-before.ts"
cache.set(['task', next.id], next);
cache.set(['tasks'], list.map((task) => task.id === next.id ? next : task));
```

After, one canonical write is sufficient:

```ts title="website/snippets/migration-after.ts"
graph.getState().upsertEntity('Task', next.id, next);
```

The list stores `next.id`; list and detail readers join the current Task. Both
fixtures are compiled by the documentation TypeScript gate.

## 3. Move I/O below stores

Do not migrate a query hook by moving its `fetch` call into another component
hook. Services/adapters own REST, GraphQL, realtime, persistence, and native I/O.
Hooks/view models call typed store methods and expose UI state.

## 4. Separate edit buffers and optimistic patches

Keep unsaved form state in the view model. Use a graph patch only for an
explicit optimistic experience, record exact previous state, clear the patch on
confirmation, and restore the previous projection on failure.

## 5. Alpha-to-stable moves

- Consume the fixed twelve-package stable set; do not mix alpha and 3.x core
  peers.
- Use the official A2UI renderer at the package root; alpha AG-UI chat/state
  helpers live under the explicit `./ag-ui` subpath.
- Use the vanilla core store for non-React consumers and scoped server graphs.
- Regenerate Riverpod declarations after updating the Dart schema/package.
- Re-run packed module, singleton, export-ledger, example, and migration
  fixtures before removing the old dependency.

Keep a rollback commit until the new readers and mutation paths pass their
focused consumer tests. Never move `latest` merely because a source migration
compiled.
