---
type: Reference
id: universal-platform-evolution-phase-goals-and-commit-guidance
title: Universal Platform Evolution Phase Goals and Commit Guidance
tags:
- entity-graph
- platform-evolution
- multi-framework
- zustand
- ssr
- code-generation
- git-workflow
sources:
- stdin
- manual:prometheus-entity-management/phase-v3-universal-platform-evolution
- docs/evolution/STRATEGIC-ROADMAP.md
- docs/evolution/COMPARATIVE-REIVEW-06222026.md
timestamp: 2026-07-17T01:30:43.529981+00:00
created_at: 2026-07-17T01:30:43.529981+00:00
updated_at: 2026-07-17T01:30:43.529981+00:00
revision: 0
---

## Context

Phase `phase-v3-universal-platform-evolution` for `prometheus-entity-management` targets evolution of `@prometheus-ags/prometheus-entity-management` from a React-only entity graph into a cross-platform, multi-framework, AI-native, local-first, peer-syncing, code-generating ecosystem.

Research inputs noted in the phase context:

- `docs/evolution/STRATEGIC-ROADMAP.md`
- `docs/evolution/COMPARATIVE-REIVEW-06222026.md`

## P0 Foundation Requirements

Must land first:

- Extract `entity-graph-core`:
  - Framework-agnostic Zustand store
  - Engine, transports, adapters, CRUD relations
  - Zero React dependencies
- Migrate existing React bindings to `entity-graph-react` as a peer consumer.
- Reduce bundle size and improve tree-shaking:
  - `sideEffects: false`
  - Optional sub-packages for `table/`, `view/`, and `crud/`
- Add list virtualization using `@tanstack/react-virtual`:
  - `useVirtualizedEntityList`
- Add parallel query support:
  - `useEntityQueries`
- Implement column resizing to unblock the stubbed `getResizeHandler`.
- Add SSR dehydration/rehydration pipeline compatible with Next.js 15+ App Router streaming:
  - `dehydrateGraph()`
  - `rehydrateGraph()`
- Define a Schema Definition Language consumed by all code generators:
  - `schema.json`
  - `entity-graph.toml`

## P1 Multi-Framework Web Bindings

Planned bindings:

- `entity-graph-svelte` for Svelte 5:
  - Runes-based reactive wrappers around the vanilla Zustand store
  - Uses `$state`, `$derived`, and `$effect`
- `entity-graph-solid` for SolidJS:
  - `createResource`-based bindings
  - Fine-grained reactivity

## Live Repository State and Commit Guidance

A concurrent autonomous process was actively modifying the repository during review. Observed live changes included:

- `docs/sync-rules-reference.md`
- `crates/pes-rules/Cargo.toml`
- New `uuid_column_integration.rs`
- Diff growth from 4 files to 13+ files across repeated status checks

Recommendation: **do not commit this work from an unrelated assistant/session while the autonomous process is still writing.** Either wait for the concurrent process to finish and commit its own work, or have a human explicitly choose a mid-flight snapshot and run `git add -A && git commit` manually.

Rationale:

1. The pending `v4-pes-gateway` work is a large separate unit of work not authored or fully verified by the reviewer.
2. The target state was moving during verification, so any commit could be stale or inconsistent before landing.
3. Concurrent `git add`/`git commit` operations risk partial commits, lock conflicts, or interleaved state.
4. The reviewer’s actual security hardening fixes were already committed and pushed as `524856a`, confirmed in sync with `origin/main`.

## Operational Decision

- Do not force a commit through a reviewer who did not author the live-changing work.
- Let the autonomous process finish and commit its own phase output, or have a human make an explicit snapshot decision.
- Treat commit `524856a` as safe and already synchronized with `origin/main`.

# Citations

1. stdin
2. manual:prometheus-entity-management/phase-v3-universal-platform-evolution
3. docs/evolution/STRATEGIC-ROADMAP.md
4. docs/evolution/COMPARATIVE-REIVEW-06222026.md