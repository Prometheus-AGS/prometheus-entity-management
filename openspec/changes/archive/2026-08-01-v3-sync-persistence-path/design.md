# Design: v3-sync-persistence-path

## Candidate reuse decisions

### cand-020 — Existing @prometheus-ags/entity-graph-sync with Loro + PGlite persistence

- **Verdict:** adapt
- **Decision:** Use PGlite for deterministic local persistence and Loro with an in-process/loopback channel for mandatory two-client convergence; add WebSocket/reconnect as an integration lane. Keep Yjs as a secondary consumer fixture, not the sole stable example path.
- **Evidence:**
  - Tier 1: The package defines SyncProvider, a graph bridge, Yjs WebSocket/WebRTC providers, and a Loro provider/channel with registry and bridge tests. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/entity-graph-sync)
  - Tier 1: Core already exports PGlite persistence and Electric adapters, so persistence can be certified separately from peer convergence. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/entity-graph-core/src/adapters)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

