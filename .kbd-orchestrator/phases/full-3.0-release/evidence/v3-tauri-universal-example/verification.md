# Verification — `v3-tauri-universal-example`

Date: 2026-08-21
Runner: macOS (Apple Silicon), Node workspace, cargo 1.97.1, tauri-cli 2.11.4,
Xcode 26.6, Android SDK 36 + NDK 28.2.13676358, JDK Temurin 21.

## Acceptance matrix (plan section 18)

| Acceptance criterion | Evidence | Status |
| --- | --- | --- |
| Desktop build passes | `tauri build --debug --no-bundle` → `src-tauri/target/debug/prometheus-tauri-universal` (sha256 in verification.json) | pass |
| Command E2E passes | `cargo test --lib`: 3/3 — entity/list round-trip through real plugin commands on MockRuntime | pass |
| Denied permissions tested | `webview_without_the_capability_is_denied_fail_closed` (Rust) + `denied`/`mobile-denied` capability fixtures granting zero permissions + `tauri.mobile-denied.conf.json` lane | pass |
| Offline restart tested | `offline_restart_persist_clear_restore_round_trip` (Rust: persist → clear → get null → restore → snapshot equality) + browser persist/reload/restore receipt + bridge unit round-trip | pass |
| Android build/smoke recorded | `tauri android build --debug --apk` → `app-universal-debug.apk` (198 MB universal debug APK, sha256 pinned); no booted emulator runtime — retained limit | pass (compile-level) |
| iOS build/smoke recorded | `tauri ios build --debug -t aarch64-sim` → `Prometheus Tasks.app` simulator bundle (unsigned, sha256 pinned); device-signed IPA needs an Apple development team absent on this runner — retained limit | pass (compile-level) |
| Shared domain, native commands, offline/reconnect, capabilities, deep links/lifecycle, responsive layouts | Chromium desktop (1280×800) and mobile (390×844) lanes: 7/7 scenarios each, zero serious/critical axe, zero console errors; receipts in `browser-evidence-chromium-{desktop,mobile}.json` | pass |
| Platform conditionals at the adapter boundary | Structural pin in verifier + release test: features never import `@tauri-apps/*`, never write the graph directly | pass |
| Coverage manifest entries satisfied | `pnpm run verify:example-coverage` → errors: [] (showcase + 2 capability entries implemented) | pass |

## Gates run (all observed green this session)

- `pnpm run typecheck` (turbo, 23/23 packages+examples)
- `pnpm --filter prometheus-entity-management-tauri test` — 5/5 bridge contract tests
- `pnpm --filter prometheus-entity-management-tauri build` — production Vite build
- `cargo test --lib` (src-tauri) — 3/3 MockRuntime E2E
- `npx playwright test --config tests/browser/v3-tauri-universal-example.playwright.config.ts` — 2/2 lanes
- `pnpm run verify:tauri-universal` — PASS, report at `verification.json`
- `pnpm run test:v3-tauri-universal-example` — 8/8
- `pnpm run bdd:tauri-universal` — 3 scenarios / 14 steps
- `pnpm run validate` (release-contract + example-coverage) — errors: []
- `openspec validate v3-tauri-universal-example --strict` — valid
- `eslint` on all new surfaces — clean, zero warnings

## Defects found and fixed by the evidence loop (all example-local)

1. **Rust test payload drift** — `graph_set_list` requires `hasNextPage`; added to the
   test payload.
2. **Generated mobile scaffolding assumes `node tauri` module resolution**, broken in
   this pnpm workspace — pointed the iOS Xcode phase (`gen/apple/project.yml`) and the
   Android `BuildTask.kt` at the workspace CLI entry
   (`node_modules/@tauri-apps/cli/tauri.js`).
3. **`tauri ios init` fails when `$USER` is unset** in a non-login shell — recorded;
   rerun with `USER` set.
4. **Gradle 8.14.3 crashes on Java 25** (`class file major version 69`) — Android lane
   pins `JAVA_HOME` to Temurin 21.
5. **One-tap Advance hit a stale React edit-buffer closure** (`setField` + `save` in
   the same tick) — moved to a service-layer optimistic action with exact rollback
   (`advanceTaskStatus`).
6. **`useEntityCRUD`'s view list does not live-join entity writes** — the board list
   now reads `useEntityList` as a pure graph subscription (Tier-A pattern), so every
   canonical write re-renders joined views without imperative refetch.
7. **List fetch served the frozen seed**, reverting optimistic writes on
   revalidation — an in-memory backend map is now authoritative for the fetch path.
8. **Storage key collision** between the web bridge mirror and the local-first
   runtime snapshot crashed hydration on reload — the mirror moved to a distinct key.
9. **Playwright `afterAll` clobbered the shared evidence receipt** across worker
   processes — receipts are written per project from inside the test.

## Evidence boundary

`countsAsPackedPackageEvidence: false`; kind `source-workspace`. Browser
screenshots evidence the shared frontend render at desktop/mobile viewports —
they are not native shell captures. Native receipts are compile-level (desktop
binary, APK, unsigned simulator app); booted-device runtime sessions remain
retained limits, not waived acceptance.
