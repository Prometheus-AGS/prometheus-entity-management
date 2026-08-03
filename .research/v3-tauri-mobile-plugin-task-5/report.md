---
type: research-report
title: "Clean-state verification boundary for the v3 Tauri plugin"
query: "What constitutes a reproducible clean-state Tauri plugin verification matrix?"
date: "2026-08-02"
confidence: 0.97
verification_status: verified
feynman_grade: 0.963
sources_count: 7
contradictions_resolved: 2
job_id: "v3-tauri-mobile-plugin-task-5"
tags: [deep-research, tauri, release-certification]
links: []
---

# Result

The clean-state gate should rebuild the JavaScript package, Rust plugin, and packed consumer from frozen or isolated inputs without deleting source changes. Use a frozen pnpm install, regenerate and compare Rust-derived bindings, build/test/typecheck the npm package, and compile Cargo targets under a fresh temporary `CARGO_TARGET_DIR` with locked dependency resolution.

This proves dependency consistency, generated-binding drift detection, Rust/TypeScript behavior, desktop command registration, least-privilege denial, and packed payload/consumer correctness. It does **not** prove Android or iOS native execution.

Tauri documents that its mock runtime does not execute native webview libraries. Its mobile plugin bridge calls Kotlin commands on Android and Swift `Plugin` entrypoints on iOS. Therefore a mobile claim requires a host running on the corresponding target, an observed `graphPlatformPing()` response, and an observed capability denial. Packaged native source, Cargo checks, and desktop tests are necessary but cannot substitute for that receipt.

The initial preflight found Xcode and Android SDK/NDK tooling but no target runtime. Later in the same task, an Android SM-S936U and an iPhone 17 simulator became available. That still cannot produce a valid receipt: the repository's current host fixture is a test-only Rust library with no mobile entrypoint or executable command screen. Task 5 can truthfully report its reproducible local gate matrix while retaining Android/iOS runtime receipts as an explicit stable-release blocker for task 6.

The external Feynman grader passed the corrected explanation at `0.963` with no misconception detected. It correctly identified that the final immutable release candidate must also prove generated files match committed state. For this active dirty change, the binding generator's `--check` mode is the non-destructive equivalent: it compares the candidate file to fresh generator output. The later release-certification change must additionally prove a clean tagged commit. Formal Feynman mastery is not claimed because no 24-hour retention check occurred.

# Sources

- [pnpm install](https://pnpm.io/cli/install)
- [cargo clean](https://doc.rust-lang.org/cargo/commands/cargo-clean.html)
- [cargo test](https://doc.rust-lang.org/cargo/commands/cargo-test.html)
- [Tauri tests](https://v2.tauri.app/develop/tests/)
- [Tauri mobile plugin development](https://v2.tauri.app/develop/plugins/develop-mobile/)
- [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/)
