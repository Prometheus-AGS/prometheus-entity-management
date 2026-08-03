# v3-tauri-mobile-plugin task 1 — dependency readiness

Date: 2026-08-02  
Candidate revision: `eb3c9802da5ff10ad6db135fed761bd23ea80b3f` plus the disclosed dirty phase worktree

## Result

Pass. Both declared dependencies are complete, archived, promoted, and scoped narrowly enough that this change can implement its own Tauri runtime/mobile obligations without reopening their contracts.

| Dependency | Archive | Promoted spec | KBD status | Boundary carried into this change |
| --- | --- | --- | --- | --- |
| `v3-release-contract` | `openspec/changes/archive/2026-08-01-v3-release-contract` | `openspec/specs/v3-release-contract/spec.md` | `DONE` / `COMPLETE` | Stable npm binding plus bundled Rust plugin; least-privilege Tauri commands; Tauri `>=2 <3`; TypeScript `>=6 <7` |
| `v3-package-module-contracts` | `openspec/changes/archive/2026-08-01-v3-package-module-contracts` | `openspec/specs/v3-package-module-contracts/spec.md` | `DONE` / `COMPLETE` | Packed npm/Cargo boundary compiles, while desktop runtime, mobile initialization, capability policy, and generated bindings remain explicitly deferred |

## Readiness findings

- Official Tauri 2 plugin builds use `tauri_plugin::Builder` to declare commands and generate plugin manifest/permission inputs. The current `build.rs` only calls `tauri_build::build()`.
- The package contains generated application schemas but no plugin permission sources, default permission set, capability fixture, or denial test.
- It has no Android Kotlin library, iOS Swift package, platform registration seam, desktop host fixture, or mobile host fixture.
- The binding export code is inside `EntityGraphPlugin::new`, while Cargo executes `build.rs`, which only calls `tauri_build::build()`. A disposable-copy probe was interrupted after 120 seconds and is not counted as a passing generation gate; the file remained at SHA-256 `d810c67506419e83a9020f8224b16fc7064e53d783d8d8c90e56c2888715fa75` at interruption. Task 2 needs a dedicated, bounded generation command and drift test.
- Current version observations: `tauri` latest `2.11.5` (lock `2.11.3`), `tauri-plugin`/`tauri-build` latest `2.6.3`, `@tauri-apps/api` current/latest `2.11.1`, `@tauri-apps/plugin-sql` latest `2.4.0`, and tauri-specta/specta remain `2.0.0-rc.25`.
- TypeScript `7.0.2` is newer but is not an authorized update because the v3 release contract caps TypeScript below 7.

The persistent research package is `.research/v3-tauri-mobile-plugin/`. Firecrawl was not exposed; Prometheus Deep Research and direct official-source retrieval were used. Sycophancy correction is recorded separately after report analysis.

## Non-claims

This task does not claim that task 2 is implemented, that the plugin is stable, that any capability grants access correctly, that Android/iOS initialization works, or that the 3.0 release can be published. It closes only the prerequisite gate.
