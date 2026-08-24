# Prometheus Tasks — Tauri Universal Showcase

One React 19 / Vite 8 frontend running as a Tauri 2 application on desktop
(macOS/Windows/Linux) and mobile (Android/iOS), built on the certified
`@prometheus-ags/entity-graph-tauri` plugin.

## What it demonstrates

- **Shared domain** — the release-wide Task/Project/User model with the
  deterministic `task-sync` / `project-atlas` / `tenant-a` seed.
- **Normalized graph** — lists store ordered IDs; every view joins against one
  canonical entity copy at render time.
- **Native command channel** — every mutation is mirrored through the plugin's
  Rust commands (`upsertEntity`/`removeEntity`/snapshot commands) with
  least-privilege capabilities: the `main` window gets read-only default plus
  explicit mutation grants; the `denied` window/probe gets nothing and fails
  closed.
- **Offline restart** — durable persistence via `@tauri-apps/plugin-sql`
  (SQLite) behind `createTauriSqlPersistenceAdapter`; the web fallback uses
  `localStorage` behind the same `GraphPersistenceAdapter` contract.
- **Deep links + lifecycle** — `prometheus-tasks://task/<id>` via the official
  deep-link plugin (fail-closed parsing); focus/resume revalidation through
  the bridge.
- **Responsive layout** — two-pane desktop, stacked mobile (720px breakpoint).

## Architecture boundary

All platform conditionals live in `src/platform/` (`tauri-bridge.ts` /
`web-bridge.ts` behind `PlatformBridge`). Feature components never import
`@tauri-apps/*` and never write the graph directly — they call
`src/features/task-service.ts`.

## Commands

```bash
pnpm install                       # workspace root
pnpm --filter prometheus-entity-management-tauri dev          # browser lane
pnpm --filter prometheus-entity-management-tauri tauri dev    # desktop shell
pnpm --filter prometheus-entity-management-tauri test         # bridge contract tests
pnpm run verify:tauri-universal    # full certification lane (workspace root)
```

Native builds (debug smoke):

```bash
pnpm --filter prometheus-entity-management-tauri tauri build --debug --no-bundle
pnpm --filter prometheus-entity-management-tauri tauri android build --debug --apk
pnpm --filter prometheus-entity-management-tauri tauri ios build --debug -t aarch64-sim
```

## Retained limits

- iOS evidence is a simulator build (`aarch64-sim`, unsigned); device-signed
  IPA requires an Apple development team, which this runner does not have.
- Android evidence is a debug APK; no booted emulator runtime pass.
- Browser screenshots evidence the shared frontend render, not native shells.
