# Design: v3-tauri-mobile-plugin

## Candidate reuse decisions

### cand-012 — Existing @prometheus-ags/entity-graph-tauri alpha

- **Verdict:** adapt
- **Decision:** Use it as the subject of the universal Tauri example, but require generated bindings and real desktop/mobile runtime tests.
- **Evidence:**
  - Tier 1: The package has TS command/event wrappers and a Rust plugin but checked-in generated bindings are currently a stub and no runnable Tauri example exists. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/entity-graph-tauri)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

