# Handoff: assess → plan

**From:** kbd-assess  
**To:** kbd-plan  
**Date:** 2026-06-22

## Key findings

The entity graph core (graph.ts, engine.ts, transport/, adapters/, merge/, ai-interop.ts,
local-first-runtime.ts, view/evaluator.ts, view/incremental.ts) is already React-free — the
core/react split is ~70% implicitly done and needs only to be formalized into a `packages/`
monorepo structure. Only 12 src/ files actually import React.

## Open questions for plan stage

1. Turborepo vs plain pnpm workspaces for the multi-package monorepo?
2. npm scope naming for framework bindings (`@prometheus-ags/entity-graph-svelte` vs shorter)?
3. Rust CLI distribution: standalone binary only, or also npx postinstall wrapper?
4. Flutter pub.dev package name (`entity_graph_flutter` — confirm acceptable)?
5. Can A2UI EntityChat be client-side only (pluggable tools) for early iteration, or does it require the Rust MCP server?

## Recommended plan entry point

1. P0-A: formalize `packages/entity-graph-core` + `packages/entity-graph-react` split
2. P0-B (parallel): SDL schema.json spec + Rust workspace init
3. P0-C: React parity quick wins (virtualization hook, useEntityQueries, column resizing, SSR dehydration)
4. P1-A: Svelte 5 + SolidJS bindings as first framework proof-of-concept
