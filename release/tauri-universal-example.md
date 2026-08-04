# Universal Tauri desktop/mobile showcase

`v3-tauri-universal-example` owns the complete application proof for one
React 19/Vite 8 frontend running through Tauri 2 on desktop, Android, and iOS.
It builds on the independently certified `@prometheus-ags/entity-graph-tauri`
plugin; it does not reuse plugin bridge receipts as application certification.

## Current disposition

The showcase is `implemented` at its declared evidence boundary. Five Chromium
flows, a packaged macOS runtime, an Android API 36 emulator build/runtime, and
an unsigned iOS 26.5 simulator archive/runtime passed. The retained receipt
hash-binds screenshots and traces and separately records package executable
hashes.

This is application evidence, not release certification. Windows/Linux
bundles, physical devices, distribution signing, app stores, npm publication,
and stable 3.0.0 remain outside this change.

## Ownership boundary

| Layer | Owner |
| --- | --- |
| Components | Rendering, accessible interaction, responsive layout |
| Hooks | Task-board and platform orchestration |
| Platform store | Application-facing runtime state and intent methods |
| Platform service | Graph hydration, persistence, queueing, native commands, deep links, lifecycle |
| Canonical graph | Entities once, ID-only task list, optimistic patches, sync metadata |
| Tauri host | Plugin registration, SQL/deep-link plugins, capabilities, platform packaging |

All platform conditionals remain inside the service. Browser preview uses
localStorage while Tauri uses `createTauriSqlPersistenceAdapter`; both feed the
same graph and React projection. The Rust plugin's in-memory mirror is not
described as restart durability.

## Trust boundaries

- `universal-main.json` grants only the graph commands required by the main
  webview. Clear, remove, and in-memory snapshot permissions remain withheld.
- Deep links are untrusted. The application accepts only
  `prometheus-entity://task/<known-id>?tenant=prometheus-labs` after scheme,
  route, tenant, decoding, and known-entity checks.
- The persisted mutation queue is untrusted durable input. Invalid structure
  fails before it can mutate the graph.
- Browser preview reports that it cannot prove native IPC authorization rather
  than returning a synthetic denial receipt.

## Evidence matrix

| Claim | Status | Evidence |
| --- | --- | --- |
| Normalized graph with ID-only task list | Implemented source/focused test | Five Vitest tests and source verifier |
| Offline queue survives restart and converges | Implemented browser-runtime test | Dispose/reinitialize/reconnect unit |
| Native command registration and allowed round trip | Implemented mock host | Stable-Rust Tauri MockRuntime |
| Destructive command denied | Implemented mock host | Main webview `graph_clear` denial |
| Deep-link policy fails closed | Implemented unit | Scheme, tenant, known ID, malformed encoding |
| One desktop/mobile Tauri configuration | Implemented source | Config/capability/generated-shell verifier |
| Responsive browser flows | Passed | Five Chromium flows and screenshots |
| Desktop package and command E2E | Passed on macOS | Real WebView, native SQLite, IPC denial, offline restart, reconnect |
| Android application build/smoke | Passed on emulator | API 36 arm64 APK, runtime, native SQLite, capability denial |
| iOS application build/smoke | Passed on simulator | iOS 26.5 arm64 unsigned archive and runtime |
| Relationship cascade invalidation | Passed | Old/new Project plus Task-list invalidation receipt |
| Realtime coalesced cross-view update | Passed | Three changes, one graph write, final cross-view state |
| Accessibility, screenshots, and traces | Passed at declared level | Zero serious/critical axe findings; hash-bound browser/native artifacts |

## Commands

Focused source/test boundary:

```bash
pnpm run typecheck:tauri-universal
pnpm run test:tauri-universal:unit
pnpm run test:tauri-universal:rust
pnpm run test:tauri-universal:contract
pnpm run verify:tauri-universal
```

The source verifier deliberately remains
`countsAsPlatformBuildEvidence: false`; it validates the separate
`task-5-platform-evidence.json` receipt rather than recasting source inspection
as platform execution. The receipt records the exact target limits.

## Public API and release impact

This example adds no `@prometheus-ags/entity-graph-tauri` exports. The existing
Tauri public ledger remains 26 runtime exports and 57 declaration exports and
must continue to pass the package `verify:skills` gate.

The worktree does not move the frozen React `3.0.0-rc.1` candidate on `main`,
publish npm `next`, change `latest`, configure app stores, or authorize stable
3.0.0. The React RC can be staged independently through the protected release
workflow while this showcase is completed.
