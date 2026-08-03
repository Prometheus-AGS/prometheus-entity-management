# Design: v3-tauri-universal-example

## Candidate reuse decisions

### cand-011 — Tauri 2 + create-tauri-app React template

- **Verdict:** adopt
- **Decision:** Scaffold a clean universal example from the official template, then integrate the local plugin and prove each platform lane.
- **Evidence:**
  - Tier 1: Tauri officially targets major desktop and mobile platforms. (https://github.com/tauri-apps/tauri)
  - Tier 4: create-tauri-app provides an officially maintained React template and pnpm workflow. (https://v2.tauri.app/start/create-project/)
  - Tier 4: Mobile-capable plugins require explicit Android/iOS initialization, native modules when needed, permissions, and capabilities. (https://v2.tauri.app/develop/plugins/develop-mobile/)

### cand-012 — Existing @prometheus-ags/entity-graph-tauri alpha

- **Verdict:** adapt
- **Decision:** Use it as the subject of the universal Tauri example, but require generated bindings and real desktop/mobile runtime tests.
- **Evidence:**
  - Tier 1: The package has TS command/event wrappers and a Rust plugin but checked-in generated bindings are currently a stub and no runnable Tauri example exists. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/entity-graph-tauri)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

