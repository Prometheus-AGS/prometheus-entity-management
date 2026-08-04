# Prometheus universal Tauri example

One React 19/Vite 8 application targets macOS, Windows, Linux, Android, and
iOS through Tauri 2. Its declared showcase evidence is implemented with five
Chromium flows, a packaged macOS runtime, Android API 36 emulator execution,
and iOS 26.5 simulator execution.

This is deliberately different from the already-certified Tauri plugin. The
plugin receipts prove the packaged Kotlin/Swift command bridge and capability
denial; this example must prove the complete application on each target.

## Architecture

```text
React components
  -> application hooks
       -> canonical entity graph store (reactive reads)
       -> platform store (intents and platform state)
            -> platform service
                 -> canonical entity graph writes
                 -> local-first persistence runtime
                 -> Tauri graph, SQL, deep-link, and lifecycle APIs
```

- Components import hooks only; they do not import the graph or Tauri APIs.
- Hooks select normalized entity projections from the canonical graph store
  and submit intents through the platform store; they do not call the platform
  service or native APIs directly.
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
| Normalized graph and ID-only list | Unit, Chromium, and native runtime receipts | Physical-device certification is separate |
| Project/User relationship joins | Chromium cascade invalidates old/new Project and Task list | Hosted data is not exercised |
| Optimistic status mutation | Unit and rendered confirmation flows | Hosted mutation APIs are not exercised |
| Durable offline queue | Browser reload/reconnect plus packaged macOS process restart | Mobile durable restart is not claimed |
| Native graph commands | Stable-Rust MockRuntime and packaged macOS round trip | Windows/Linux bundles are not executed |
| Capability denial | MockRuntime, packaged macOS, and Android deny `graph_clear` | Portable issuer/RLS policy is separate |
| Deep links and lifecycle | Fail-closed parser plus generated mobile deep-link state | External universal-link hosting is not claimed |
| Realtime coalescing | Three changes collapse to one graph write | Hosted realtime is not exercised |
| Responsive UI and accessibility | Five screenshots/traces; zero serious/critical axe findings | Native assistive-technology certification is separate |
| Android and iOS shells | Android API 36 emulator and iOS 26.5 simulator build/runtime | Physical devices, signing, and stores are not claimed |

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

Run the browser evidence gate with:

```bash
pnpm run test:tauri-universal:browser
```

The hash-verified platform receipt is retained under
`.kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example/`.
Signing, physical-device certification, app-store configuration, registry
publication, and npm `latest` remain separate release authorities.

See [`../../release/tauri-universal-example.md`](../../release/tauri-universal-example.md)
for the release disposition and exact evidence boundary.
