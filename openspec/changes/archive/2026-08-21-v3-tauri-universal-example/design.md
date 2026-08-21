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


## Implementation decisions (2026-08-21)

### D-1 — Shared domain, deterministic seed

The example reuses the release-wide Task/Project/User domain with the shared
deterministic seed identity (`task-sync`, `project-atlas`, `tenant-a`) used by
the Flutter and agentic showcases, and registers the same relation schemas as
`examples/vite-app/src/schema/index.ts` so cascade invalidation behavior is
identical across showcases.

### D-2 — Platform conditionals only at the adapter boundary

`src/platform/` is the single conditional seam: `tauri.ts` binds real
`@tauri-apps/api` invoke/listen plus the entity-graph plugin commands;
`web.ts` provides a deterministic in-browser fallback so the same frontend
runs under Playwright without a native shell. Detection happens once
(`"__TAURI_INTERNALS__" in window`). Feature components never import
`@tauri-apps/*` and never write the graph directly.

### D-3 — Persistence and offline restart

Durable restart uses the certified plugin snapshot commands
(`persistSnapshot`/`restoreSnapshot` with an explicit storage key) on native,
and the `GraphPersistenceAdapter` contract (`localStorage` on web fallback).
Offline restart is proven by a Rust MockRuntime test that persists, clears,
and restores through real commands, plus a frontend round-trip unit test.
Native snapshot storage is documented as in-memory in the plugin contract;
the SQL adapter seam remains available but is not required for this slice.

### D-4 — Deep links and lifecycle

Deep links use the official `tauri-plugin-deep-link` (plan requirement), with
a `prometheus-tasks://task/<id>` handler at the adapter boundary navigating to
task detail. Lifecycle (focus/resume) triggers graph revalidation through the
bridge so mobile suspend/resume and desktop refocus share one code path.

### D-5 — Least-privilege capabilities

The main window capability grants `entity-graph-tauri:default` (read-only)
plus explicit `allow-graph-*` mutation/snapshot commands and the deep-link
default. A `denied` capability and a mobile-denied config mirror the plugin
fixture so fail-closed denial is provable on desktop and mobile. Undeclared
commands are rejected by the platform, not by app code.

### D-6 — Visual evidence honesty

Pinned screenshots and axe scans run in Chromium against the production
frontend build at desktop (1280×800) and mobile (390×844) viewports. These
are browser-rendered receipts of the shared frontend, not native captures;
native receipts are recorded separately at compile level (desktop debug
build, Android/iOS compile smoke where the host toolchain allows).

### D-7 — Mobile scaffolding

`tauri android init` / `tauri ios init` output is committed under
`src-tauri/gen/` per Tauri convention. Android/iOS builds are attempted on
this runner (Android SDK 36 + NDK 28, Xcode 26.6 present); any lane that
cannot complete is recorded as a retained limit in verification evidence,
not waived silently.
