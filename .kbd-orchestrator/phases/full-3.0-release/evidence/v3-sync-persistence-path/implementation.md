# Task 2 — mandatory path implementation receipt

Date: 2026-08-01  
Change: `v3-sync-persistence-path`  
Task verdict: **IMPLEMENTED**  
Change verdict: **IN PROGRESS — tasks 3–6 remain**

## Implemented behavior

- `SyncBridgeOptions` accepts an isolated core `GraphStore` and an isolated `SyncProviderRegistry`; the backwards-compatible default store and registry remain available.
- `createSyncProviderRegistry()` gives each client explicit provider ownership.
- Inbound peer writes are marked synchronously and excluded from outbound graph subscription dispatch, preventing remote-update echo/ping-pong.
- Loro documents accept deterministic numeric peer IDs and use `ensureMergeableMap` for stable child-container identity under concurrent first creation.
- Provider start failures roll back subscriptions/state; import and export failures are reported instead of silently discarded.
- `createLoroLoopbackNetwork()` provides deterministic disconnection, bidirectional reconnect resynchronization, and FIFO/reverse delivery control.
- `createWebSocketLoroChannel()` retains the latest snapshot and unsent write for every entity type, reconnects with bounded exponential delay, flushes offline writes, and uses a collision-free control frame to request peer snapshots missed during an outage.
- `@electric-sql/pglite` `0.5.4` is an exact core test dependency. `loro-crdt` is an exact `1.13.9` sync test dependency with consumer peer range `>=1.13.9 <2`.
- The mandatory PGlite receipt uses one real filesystem handle at a time, closes it, reopens it, and restores canonical entities, ID-only lists, and intentional local patches.
- The mandatory Loro receipts use two graph stores and two registries, make concurrent offline writes, reconnect, deliver updates in FIFO and reverse order, and inspect public graph reads.
- Same-field concurrent writes are explicitly Loro LWW-map behavior: when logical counters are equal, the higher deterministic peer ID wins and both replicas agree.

## BDD receipt

`pnpm run bdd:sync-persistence` passes:

- 3 scenarios;
- 15 steps; and
- no skipped or undefined mandatory step.

The feature covers real restart durability, ID-only list recovery, different-field preservation, same-field deterministic conflict resolution, both delivery orders, inbound echo suppression, disconnected WebSocket writes, reconnect resynchronization, and the no-skip rule.

## Focused verification

| Command | Result |
| --- | --- |
| `pnpm --filter @prometheus-ags/entity-graph-sync test` | 5 files, 26 tests passed |
| `pnpm --filter @prometheus-ags/entity-graph-core test` | 26 files, 173 passed; one unrelated Flint skip and one unrelated devtools todo |
| `pnpm --filter @prometheus-ags/entity-graph-core exec vitest run src/adapters/pglite-persistence.integration.test.ts --reporter verbose` | real close/reopen receipt passed |
| core and sync typechecks | passed |
| core and sync package builds | passed |
| targeted ESLint | passed with zero warnings |

## Explicit remaining ownership

- Task 3 owns additional integration/consumer checks, including the separately labeled real WebSocket relay lane and its enabled/disabled enforcement.
- Task 4 owns `examples/coverage.json`, public API ledgers, skill references, README/changelog/changeset synchronization, and the sibling `prometheus-entity-sync` opt-in boundary.
- Task 5 owns clean-state package, security, OpenSpec, full CI, and other applicable repository gates.
- Task 6 owns final evidence, limitations, release impact, OpenSpec archive, and promoted-spec verification.

This task changed no rendered UI. Its truthful receipts are database reopen, controlled CRDT transcripts/assertions, and BDD output. Browser/device screenshots, accessibility results, traces, video, and hash manifests remain mandatory in the later showcase and Docusaurus changes; none is claimed here.
