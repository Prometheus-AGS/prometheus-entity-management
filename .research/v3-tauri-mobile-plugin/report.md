---
type: research-report
title: "v3 Tauri desktop/mobile plugin readiness"
query: "What is required before implementing and certifying v3-tauri-mobile-plugin?"
date: "2026-08-02"
confidence: 0.96
verification_status: verified
feynman_grade: null
sources_count: 12
contradictions_resolved: 4
job_id: "v3-tauri-mobile-plugin-task-1"
tags: [deep-research, tauri, mobile, release-readiness]
links: []
---

# Verdict

The two declared dependencies are complete, so `v3-tauri-mobile-plugin` task 2 is dependency-ready. The plugin itself is not stable-release-ready. The archived prerequisites intentionally certify the release/package boundary while deferring runtime command execution, least-privilege permissions, binding generation, and mobile host evidence to this change.

## Dependency gate

| Dependency | Evidence | Result |
| --- | --- | --- |
| `v3-release-contract` | Archived at `openspec/changes/archive/2026-08-01-v3-release-contract`; promoted spec exists; KBD progress is `DONE`/`COMPLETE`; contract declares the npm Tauri binding and bundled Rust plugin as stable 3.x artifacts | Complete |
| `v3-package-module-contracts` | Archived at `openspec/changes/archive/2026-08-01-v3-package-module-contracts`; promoted spec exists; packed npm artifact host-compiles; verification explicitly reserves runtime/mobile/capability work for this change | Complete |

This gate authorizes implementation work. It does not certify the plugin or the 3.0 release.

## Current boundary versus an official Tauri 2 plugin

The alpha has useful Rust state/command code, JavaScript wrappers, loader-correct npm outputs, and host Cargo evidence. It is missing four release-defining seams:

1. `build.rs` calls `tauri_build::build()` instead of declaring plugin commands through `tauri_plugin::Builder`. Official plugins use the latter to produce the plugin manifest and permission inputs.
2. There is no `permissions/` source directory, no named default/command permission sets, and no allow/deny capability fixture. Generated schema files describe configuration shapes; they do not grant access.
3. There are no Android or iOS native library directories and no Android class or iOS binding registration. Official mobile guidance uses Kotlin/Java and Swift projects plus platform registration.
4. The documented binding-generation command is not connected to Cargo build execution. Export code sits inside `EntityGraphPlugin::new`; `cargo build --features generate-bindings` does not instantiate the plugin. The checked-in file is therefore a hand-maintained stub despite its generated label.

Official guidance supports this distinction: mobile projects and registration are explicit in [Tauri mobile plugin development](https://v2.tauri.app/develop/plugins/develop-mobile/); command privileges originate in [plugin permissions](https://v2.tauri.app/security/permissions/) and are granted through [capabilities](https://v2.tauri.app/security/capabilities/). The official [store build script](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/store/build.rs) and [barcode-scanner mobile build](https://github.com/tauri-apps/plugins-workspace/blob/v2/plugins/barcode-scanner/build.rs) are concrete comparison points.

## Dependency currency decision

| Dependency | Current repository | Latest observed 2026-08-02 | Task-2 decision |
| --- | --- | --- | --- |
| `tauri` | manifest `2`, lock `2.11.3` | `2.11.5` | Refresh the lock within the contracted `>=2 <3` range and test; avoid an unbounded evidence claim. |
| `tauri-build` | `2`, lock `2.6.3` | `2.6.3` | Current, but app-build support alone is the wrong plugin manifest boundary. Add/use `tauri-plugin` with `build`. |
| `tauri-plugin` | absent | `2.6.3` | Add as the plugin build dependency and generate command permissions/manifests. |
| `@tauri-apps/api` | `2.11.1` | `2.11.1` | Current. Narrow the broad peer range only if packed consumer evidence justifies it. |
| `@tauri-apps/plugin-sql` | peer `>=2.0.0` | `2.4.0` | Optional and not needed for host-plugin correctness; test separately from remote/persistence availability. |
| `tauri-specta` / `specta` | `2.0.0-rc.25` | `2.0.0-rc.25` | Latest but still prerelease. Keep exact, generation-only, deterministic, and outside runtime; re-check before implementation. |
| `specta-typescript` | `0.0.12` | `0.0.12` | Current; make its output drift-checkable. |
| TypeScript | `6.0.2` | `7.0.2` | Do not upgrade in this change: v3 contract is `>=6 <7`. |

“Latest” is not a blanket upgrade instruction. Compatibility and release evidence outrank version-number novelty.

## Task-2 implementation readiness contract

The next task should implement one bounded vertical slice:

- rename or otherwise configure the Rust crate as a real Tauri plugin boundary, including `links`, `tauri-plugin` build support, command manifest generation, and minimized npm allowlist;
- define per-command allow and deny permissions plus a minimal default set; prove capability denial rather than only happy-path invocation;
- create deterministic TypeScript generation in a disposable path and a drift test that fails if Rust commands/types/events differ from checked-in output;
- preserve shared Rust graph behavior on desktop while adding Android Kotlin and iOS Swift initialization/command smoke seams;
- create a desktop host fixture and at least one Android/iOS automated or documented device lane that invokes a real plugin command;
- keep remote sync and optional SQL availability outside the host-plugin correctness gate.

## Sycophancy correction

The assessment rejects three convenient but false upgrades in status: host compilation is not desktop runtime evidence; mobile cross-compilation is not native initialization evidence; generated schemas are not granted capabilities. It also rejects upgrading TypeScript 7 merely because it is newer. No source was credited for vendor superiority claims, and official documentation was used for contract facts rather than marketing conclusions. Strict automated analysis scored the report `0.017857` and found only a low-severity length flag; `sycophancy-analysis.json` records why the persistent evidence package retains the detail.

## Feynman transfer check

Plain-language core: a plugin is a permissioned bridge loaded by a real host, not merely a Rust library that can be compiled for a target. The two transfer cases in `feynman-transfer.json` correctly distinguish compilation from command execution and labels from reproducible generation. The automated `learn-grade` callable was unavailable, so the package records `feynman_grade: null` and does not claim learner mastery.

## Release impact

Task 1 may close because both dependencies are complete and the remaining scope is explicit. Publication, RC promotion, desktop runtime certification, Android/iOS certification, signing, app-store work, and npm `latest` remain blocked.
