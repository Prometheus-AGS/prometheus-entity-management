# Prometheus universal Tauri example

One React 19/Vite 8 application targets macOS, Windows, Linux, Android, and
iOS through Tauri 2. The application is implemented in the workspace, but its
release showcase status remains `planned` until task 5 produces the clean
desktop, browser, Android, iOS, accessibility, screenshot, and trace receipts.

This is deliberately different from the already-certified Tauri plugin. The
plugin receipts prove the packaged Kotlin/Swift command bridge and capability
denial; this example must prove the complete application on each target.

## Architecture

```text
React components
  -> application hooks
  -> platform store
  -> platform service
       -> canonical entity graph
       -> local-first persistence runtime
       -> Tauri graph, SQL, deep-link, and lifecycle APIs
```

- Components import hooks only; they do not import the graph or Tauri APIs.
- Tasks, Projects, and Users live once in the canonical normalized graph.
  The task list stores ordered task IDs, and task views join related Project
  and User entities at read time.
- Browser preview uses localStorage. Tauri uses the core SQLite persistence
  adapter over the official SQL plugin.
- Offline task-status mutations use graph patches for cross-view optimistic
  visibility and a separately durable queue for restart/reconnect recovery.
- The platform service is the only conditional boundary. Application and UI
  logic are shared across browser preview, desktop, Android, and iOS.

## Run from the repository root

Install with the repository's only supported package manager:

```bash
pnpm install --frozen-lockfile
```

Run the browser preview or desktop host:

```bash
pnpm --filter prometheus-tauri-universal-example dev
pnpm run dev:tauri-universal
```

Run a mobile development target after installing the normal Tauri platform
prerequisites:

```bash
pnpm --filter prometheus-tauri-universal-example tauri:android
pnpm --filter prometheus-tauri-universal-example tauri:ios
```

The example resolves Prometheus packages through workspace dependencies. It is
not evidence that `3.0.0-rc.1` is available from npm; registry consumers must
wait for the protected `next` publication and then install the published core,
React, and Tauri packages.

## Current feature and evidence matrix

| Surface | Current evidence | Remaining release evidence |
| --- | --- | --- |
| Normalized graph and ID-only list | Vitest unit and source-contract checks | Clean browser/desktop receipt |
| Project/User relationship joins | Source and rendered component implementation | Cascade-invalidation application scenario |
| Optimistic status mutation | Unit test covers graph patch and confirmation | Clean browser interaction |
| Durable offline queue | Unit test covers dispose, reload, reconnect, and convergence | Native SQLite restart on a packaged host |
| Native graph commands | Stable-Rust Tauri MockRuntime upsert/read round trip | Packaged desktop command E2E |
| Capability denial | Stable-Rust MockRuntime denies `graph_clear` | Packaged application denial on required targets |
| Deep links and lifecycle | Fail-closed parser tests and source contract | Real host open/focus/background/restore flows |
| Realtime coalescing | Shared semantic mapping only | Universal application event/coalescing scenario |
| Responsive UI and accessibility | Three Playwright flows authored and discovered | Executed screenshots, traces, and axe receipt |
| Android and iOS shells | Official generated projects are checked in | Clean build and application smoke per platform |

The checked-in generated shells are source artifacts, not platform-build
evidence. Browser preview cannot fabricate a native IPC denial, and the source
verifier records `countsAsPlatformBuildEvidence: false`.

## Focused checks

```bash
pnpm run typecheck:tauri-universal
pnpm run test:tauri-universal:unit
pnpm run test:tauri-universal:rust
pnpm run test:tauri-universal:contract
pnpm run verify:tauri-universal
```

The browser command is a later clean gate:

```bash
pnpm run test:tauri-universal:browser
```

Do not report it as passing from test discovery alone. Desktop bundle,
Android/iOS build and smoke, signing, app-store configuration, registry
publication, and npm `latest` are separate release authorities.

See [`../../release/tauri-universal-example.md`](../../release/tauri-universal-example.md)
for the release disposition and exact evidence boundary.
