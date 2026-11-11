---
"@prometheus-ags/entity-graph-core": minor
---

Streaming-store hardening for agentic UIs.

**Atomic batched writes without a graph copy.** New `batchGraphWrites(fn)`
applies any number of writes across entity types on one immer draft and
publishes once; a throw writes nothing. `applyGraphChanges(changes)` is its
serialisable, idempotent form. `createGraphTransaction` no longer
`structuredClone`s the whole graph when it opens: its rollback baseline is the
set of references to the current immutable state, so opening is O(1).

**Render-only live layer.** `createLiveLayer()` holds ephemeral field values
(streaming text) beside the graph: per-entity subscriptions, a merged
`read()`, and explicit `commit()` / `commitAll()` / `discard()`. Live values are
not graph writes, are not persisted and do not reach devtools.

**Lossless, ordered AG-UI bridge.** `applyAgUiSnapshot` / `applyAgUiDelta` now
store the whole agent state document (`readAgUiState`, so plain fields and
root pointers survive), keep collection order in a list (`agUiListKey`), apply
RFC 6902 `remove` / `replace` / `move` as entity removals and reorders, publish
once per event, never freeze the caller's event objects, and skip an `eventId`
that was already applied. Both functions now return `{ applied, state }`
instead of `void`.

**No devtools events in production browsers.** The transaction op-site stream
emitted in every browser bundle (`typeof process === "undefined" || ...`). It is
now off where `process` is absent unless Vite's `import.meta.env.DEV` is set or
`setGraphDevtoolsEmission(true)` is called; Node/SSR keep the
`NODE_ENV !== "production"` rule. Defining `__PROMETHEUS_ENTITY_GRAPH_DEVTOOLS__`
as `false` removes the emission code from bundles.
