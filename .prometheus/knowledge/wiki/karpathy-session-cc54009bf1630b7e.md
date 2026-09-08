---
type: SessionRecord
id: karpathy-session-cc54009bf1630b7e
title: Karpathy session cc54009bf163
tags:
- karpathy
- session-learning
sources:
- session:0dd25317-b732-4041-8f48-50d0a63c2906
timestamp: 2026-08-28T23:59:35.534885+00:00
created_at: 2026-08-28T23:59:35.534885+00:00
updated_at: 2026-08-28T23:59:35.534885+00:00
revision: 0
---

## Delta

No — the Flutter side is not at feature parity with the React/TS side, and A2UI specifically is the largest gap. Here's what the code actually shows.

## The size delta

| Surface | TS/React | Flutter/Dart |
|---|---|---|
| Core graph + engine | `entity-graph-core` — 75 files, ~11.9k lines | `entity_graph_flutter` — 8 files, ~3.4k lines (965 of which are generated `providers.g.dart`) |
| Framework bindings | `entity-graph-react` — 74 files, ~13.3k lines | (same package) |
| A2UI | `a2ui-react` — 19 files, ~3.6k lines | **no package** |
| Sync/CRDT | `entity-graph-sync` + `core/merge` (loro, lww, registry) | absent |
| A2A agent protocol | `entity-graph-a2a` — 11 files, ~2.9k lines | absent |
| Other bindings | alpine, htmx, solid, svelte, web-components, tauri, cli, mcp, sdl | — |

Roughly 2.4k hand-written Dart lines against ~25k+ TS lines for the equivalent core+bindings scope.

## What Flutter *does* have (real, not stubbed)

The graph core is a genuine port, not a veneer. [graph.dart](packages/entity_graph_flutter/lib/src/graph.dart) implements the full canonical structure — `entities`/`patches`/`lists` with ID-only lists, sync metadata, `removeEntityOptimistically` + `restoreRemovedEntity` for exact rollback, sorted `insertIdInList`, and the invalidation family. [providers.dart](packages/entity_graph_flutter/lib/src/providers.dart) gives you `Entity`, `EntityList`, `EntityCrud` (with an `EditBuffer` mirroring the React edit-buffer isolation), and `EntityMutations`. Transport registry, typed `TerminalError`/`TransientError`, SDL→IR parsing, and local/remote/hybrid view evaluation are all present.

So the *layer-1 contract* is faithful. That's the part that matters most for cross-view reactivity, and it's there.

## The actual gaps

**A2UI is the big one.** There is no Flutter A2UI package. The only A2UI code in the repo's Dart side lives in the example app — 975 lines under [examples/flutter-riverpod/lib/a2ui/](examples/flutter-riverpod/lib/a2ui/) and `lib/features/a2ui/`. Against `a2ui-react`'s shipped `entity-chat`, `entity-copilot`, `entity-approval`, `entity-diff`, `entity-stream`, `entity-tool-provider`, an `ag-ui` module, a `policy` module, and an `official` A2UI component-implementation layer — Flutter has a demo surface with an action policy and a deterministic fixture. That's an example proving the protocol shape works, not a reusable library a consumer can depend on.

**Engine machinery is missing.** Keyword scan across the Flutter package returns zero files for: `gcTime`/garbage collection, subscriber ref-counting, in-flight deduplication, and change coalescing. These are exactly the pieces `engine.ts` and `realtime-manager.ts` provide on the TS side — the 16ms coalescing window, the process-global in-flight `Map`, the ref-counted revalidation skip. `staleTime` exists as a transport property, but the engine that acts on it doesn't.

**Realtime is an interface, not an implementation.** `EntityTransport.subscribe()` exists and returns `null` by default ([transport.dart:252](packages/entity_graph_flutter/lib/src/transport.dart:252)). There are no adapters behind it. TS ships ElectricSQL (plus tenant-scoped), PGlite persistence, SurrealDB live, Tauri SQL persistence, Flint, and the generic WebSocket/Supabase/Convex set.

**Also absent:** CRDT merge and the sync package, the A2A agent protocol server, cascade invalidation via relation schemas (`crud/relations.ts` has no Dart counterpart — `relation` matches one file only), incremental view evaluation, Suspense/SSR-hydration equivalents, devtools time-travel and event bus, and the entire UI component layer (`entity-graph-react/src/ui/` is 23 files — table, filters, presets, gallery/list views, inline editing).

## How to read this

The Flutter package is best described as a **faithful port of Layer 1 plus Riverpod bindings**, which is a defensible scope for a 3.0. What it isn't is a mirror of the full TS ecosystem, and `pubspec.yaml` sharing version `3.0.0` with the T

## Root Cause

No explicit root-cause section was captured; preserve this as a session record, not an inferred diagnosis.

## Corrective Actions

Review and promote only reusable findings.

## Session Metadata

- Harness: claude-code
- Session: 0dd25317-b732-4041-8f48-50d0a63c2906
- Captured: 2026-08-28T23:33:11.700333Z
- Project: /Users/gqadonis/Projects/prometheus/prometheus-entity-management

## Changed Paths

- .prometheus/events.jsonl
- security/advisory-policy.json
- tests/ci/hermetic-workspace.test.mjs
