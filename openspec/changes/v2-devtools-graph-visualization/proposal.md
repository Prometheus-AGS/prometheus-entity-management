# Proposal: Graph-visualization DevTools tab

> Part of umbrella `v2-0-realtime-fabric-parity` · Change C6 · addresses GAP-5 · depends on C5

## Summary

Add a **Graph** tab to the EntityExplorer that draws entities as nodes and relations as edges — we store a graph but never visualize it. A clear differentiator over flat state inspectors.

## Motivation

Debugging cross-view reactivity and cascade invalidation is far easier when you can see the relationship graph. The `crud/relations` registry already holds the schema; lists hold membership.

## Library reuse

- None adopted by default. Keep dependency-light (SVG/canvas first). A graph lib is justified in Spec only if hand-rolled layout proves inadequate.

## Non-goals

- A full graph-editing surface (read-only visualization for v2.0).
- Heavy WebGL rendering (entity counts in dev are modest; SVG suffices).

## Design

- New `src/ui/entity-explorer/tabs/graph-tab.tsx`: nodes from `entities`, edges from `crud/relations` registry, membership hints from `lists`.
- Click a node → existing detail pane (selection context shared with C5).
- Simple force/tree layout; cap node count with a clear "showing N of M" notice.

## Success criteria

- [ ] Renders entities + relation edges from the registry.
- [ ] Node click opens the detail pane (reuses selection context).
- [ ] Degrades gracefully past a node cap (logs what was truncated — no silent cap).
- [ ] Dependency-light (no heavy graph lib unless Spec-justified).
