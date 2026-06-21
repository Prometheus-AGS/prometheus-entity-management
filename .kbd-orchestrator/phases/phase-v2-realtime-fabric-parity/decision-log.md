# Decision Log — phase-v2-realtime-fabric-parity

## 2026-06-21 — Analyze stage decisions

| # | Decision | Verdict | Rationale | Evidence |
|---|---|---|---|---|
| D1 | Flint integration: build against unfrozen proto vs. stable facade | **Build against `frf-entity-management` facade now** | Flint already ships `RealtimeAdapter.watchEntities()` exposing plain `EntityEvent` (no proto leak); proto-v1 risk contained below the seam | `sdks/entity-management/src/adapter.ts` |
| D2 | Flint dependency posture | **Optional peer dep** | `@prometheusags/frf-sdk` not on npm (workspace-only); core bundle must stay lean — mirror existing `@tanstack/react-table` optional-peer precedent | npm:@prometheusags/frf-sdk (unpublished) |
| D3 | CRDT engine | **Loro reference impl behind a pluggable `MergeStrategy` port** | Loro wins 2026 crdt-benchmarks, Fugue algorithm, movable Tree + LWW-Map maps to entity model, Rust core aligns with Flint; but stay engine-agnostic | npm:loro-crdt 1.13.5; pkgpulse 2026 CRDT guide |
| D4 | Automerge / Yjs | **Reference, not adopt** | Automerge = heavier history model; Yjs = doc/collab data model with graph impedance; port keeps both reachable | pkgpulse 2026 CRDT guide |
| D5 | Incremental queries (d2ts / TanStack DB) | **Reference only; defer to v2.x spike** | d2ts is 0.1.8 pre-production; v2.0 path = documented scale ceiling + existing react-virtual; TanStack DB never a dep (moat) | npm:@electric-sql/d2ts 0.1.8; tanstack db blog |
| D6 | AG-UI ingestion | **Adopt @ag-ui/core types (optional peer) + build `applyAgUiDelta` bridge** | STATE_DELTA = RFC-6902 JSON Patch; our patchEntity is already JSON-Patch-shaped → smallest, highest-leverage win | docs.ag-ui.com/sdk/js/core/events; npm:@ag-ui/core 0.0.57 |
| D7 | AG-UI scope | **Ingestion bridge first, not a full client** | Resolves assessment Q4; substrate (graph + patch layer) already exists | assessment.md Q4 |
| D8 | A2A / A2UI | **Owned by Flint (`frf-agentproto`), consumed via Flint adapter** | Agent2Agent is agent↔agent, not agent→UI; belongs at the fabric layer | flint CLAUDE.md (frf-agentproto) |
| D9 | SQLite persistence | **Adopt @tauri-apps/plugin-sql + build adapter; reject wa-sqlite** | Browser SQL already covered by PGlite adapter; SQLite need is Tauri/native only | npm:@tauri-apps/plugin-sql 2.4.0; npm:wa-sqlite 1.0.0 (2024) |
| D10 | DevTools | **Extend EntityExplorer (time-travel + graph-viz); no external host** | Redux/TanStack DevTools don't fit Zustand-graph panel; action-log + snapshot-export + event-bus already in repo | in-repo: graph-actions.ts, devtools-event-bus.ts |
| D11 | Layering enforcement | **Start with eslint no-restricted-imports; custom plugin only if needed** | No off-the-shelf plugin for our Component→Hook→Store rule; cheapest path first | n/a (project-specific) |
| D12 | WebRTC/P2P | **Defer — owned by Flint fabric** | str0m/LiveKit signaling lives in the fabric; consume via adapter | flint CLAUDE.md |
