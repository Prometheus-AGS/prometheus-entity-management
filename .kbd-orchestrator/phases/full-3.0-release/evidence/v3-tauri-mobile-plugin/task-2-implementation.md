# v3-tauri-mobile-plugin task 2 — implementation

Date: 2026-08-02  
Candidate revision: `eb3c9802da5ff10ad6db135fed761bd23ea80b3f` plus the disclosed dirty phase worktree

## Result

Pass. The alpha Tauri crate has been converted into a Tauri 2 plugin-shaped package with generated command permissions, reproducible Rust-derived TypeScript bindings, desktop/mobile registration, and a real native bridge command.

## Implemented scope

- Replaced the application-style `tauri-build` manifest with `tauri_plugin::Builder`, a plugin `links` value, ten declared commands, and Android/iOS source paths.
- Added a read-only default permission set. Entity mutations, snapshots, and graph clearing remain explicit grants; native `graph_platform_ping` is safe in the default set.
- Added desktop initialization plus Android Kotlin and iOS Swift plugin implementations using the same `ping` response contract.
- Added `EntityGraphExt` and `graph_platform_ping`, which reaches the desktop implementation or the registered Kotlin/Swift native bridge.
- Replaced the checked-in binding stub with a dedicated Rust generator and byte-comparison drift checker. Commands, events, plugin-prefixed routes, camelCase serde fields, and opaque JSON records now come from Rust.
- Namespaced emitted and listened events consistently as `plugin:entity-graph-tauri:<event>`.
- Minimized the npm publish boundary to compiled JS, required metadata, Rust sources/manifests, permissions, and Android/iOS sources. Application schemas and `tauri.conf.json` are excluded.
- Retained alpha compatibility maps and `EntityGraphPlugin::new()` while exposing the generated command/event surfaces and new native ping facade.

## Fresh verification

| Gate | Result |
| --- | --- |
| `pnpm --filter @prometheus-ags/entity-graph-tauri test` | Pass: 2 files, 16 tests |
| `pnpm --filter @prometheus-ags/entity-graph-tauri typecheck` | Pass |
| `pnpm --filter @prometheus-ags/entity-graph-tauri build` | Pass: ESM, CJS, `.d.ts`, `.d.cts` |
| `generate-bindings --check` | Pass: bindings current |
| `cargo fmt --all -- --check` plus `git diff --check` | Pass |
| `cargo test --lib` | Pass: 6 tests, 0 failures |
| `pnpm pack --dry-run` | Pass: includes permissions, 10 generated command grants, Rust source, Android, and iOS; excludes application config/schema stubs |

## Deferred by the task ledger

- Capability denial behavior, packed consumers, desktop host command E2E, and Android/iOS runner or device smoke evidence belong to task 3.
- Public API ledgers, `examples/coverage.json`, skills, README/Docusaurus content, and migration guidance belong to task 4.
- Clean-state repository-wide CI, platform, security, and release gates belong to task 5.
- Final verification evidence, unresolved manual limits, and release impact belong to task 6.

## Non-claims

This task does not claim a desktop host or mobile device command has run, that capability denial is certified, that public ledgers and documentation are synchronized, that the package version is stable, or that the 3.0 release can be published. It closes only implementation task 2.
