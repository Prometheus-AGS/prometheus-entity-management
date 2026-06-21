# Proposal: v2.0 — Realtime Fabric Parity (umbrella)

## Summary

Evolve `@prometheus-ags/prometheus-entity-management` from a normalized entity-graph store into the **best-in-class, ecosystem-agnostic global entity-state layer for realtime + agentic applications**. Ship first-class integration with the **Flint Realtime Fabric**, **AG-UI agent-state ingestion**, **pluggable CRDT conflict resolution**, **Tauri/SQLite local-first persistence**, **time-travel + graph-visualization DevTools**, and **enforced Component→Hook→Store layering**.

Umbrella for 8 child changes derived from `.kbd-orchestrator/phases/phase-v2-realtime-fabric-parity/` (assessment → analysis → plan).

## Motivation

- The 2026 frontier (TanStack DB, Zero, AG-UI) has moved to incremental queries, real sync protocols, and standardized agent-state sync. We lead on normalization + transport-agnosticism + realtime-adapter breadth + AI surface, but lag on CRDT merge, agent-protocol ingestion, and time-travel devtools.
- Non-trivial agentic applications (AG-UI / A2A / A2UI + traditional UI) need agent state to land in the same reactive graph every view reads.
- The Flint Realtime Fabric is the named strategic backend; its `frf-entity-management` SDK seam already exists.

## Non-goals

- Direct WebRTC/P2P entity sync — owned by the Flint fabric (str0m/LiveKit), consumed via the Flint adapter.
- Replacing Zustand or migrating off the existing graph model.
- A full AG-UI client — this ships the **ingestion bridge** only.

## Child changes (dependency-ordered)

1. `v2-crdt-merge-strategy-port` — pluggable MergeStrategy + Loro reference impl (foundation)
2. `v2-agui-ingestion-bridge` — applyAgUiDelta/Snapshot into the graph (← 1)
3. `v2-flint-realtime-adapter` — createFlintAdapter() over frf-entity-management (← 1)
4. `v2-tauri-sqlite-persistence` — GraphPersistenceAdapter over Tauri SQL
5. `v2-devtools-time-travel` — timeline + diff + snapshot import/export
6. `v2-devtools-graph-visualization` — relationship/graph viz tab (← 5)
7. `v2-incremental-query-spike` — differential-dataflow spike (gated; may slip)
8. `v2-eslint-layering-rule` — enforce Component→Hook→Store

## Success criteria

- [ ] AG-UI STATE_DELTA/SNAPSHOT updates land in the graph and propagate to all views.
- [ ] `createFlintAdapter()` streams Flint entity events into the graph via RealtimeManager.
- [ ] Concurrent writes resolve through a pluggable MergeStrategy (LWW default; Loro optional).
- [ ] Tauri desktop persists/hydrates the graph via SQLite.
- [ ] EntityExplorer offers time-travel, state diff, snapshot import/export, and a graph view.
- [ ] Layering rule blocks direct store imports in component files.
- [ ] All new integrations ship as **optional peer deps**; core bundle stays zustand+immer.
- [ ] `pnpm run verify:skills` green (skills↔exports sync) for every export-touching change.
- [ ] CI green; typecheck + tests pass.

## Trade-offs surfaced

- `v2-incremental-query-spike` is research-flavored with a decision gate; it may slip to v2.1 with a "documented scale ceiling + virtualization" outcome rather than block the release.
- `@prometheusags/frf-sdk` is not on npm → Flint integration is an optional peer with graceful degradation.
- CRDT engine choice tracks Flint's pending Loro-vs-Automerge decision; a second strategy impl may follow.
