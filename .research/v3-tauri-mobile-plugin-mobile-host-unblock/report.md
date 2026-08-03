---
type: research-report
title: "Minimal real-device Tauri plugin certification host"
query: "What is the smallest current Tauri 2 consumer host that can prove a local plugin crossed the real Android and iOS native bridges and was denied without capability authority?"
date: "2026-08-02"
confidence: 0.97
verification_status: verified
feynman_grade: 0.965
sources_count: 9
contradictions_resolved: 3
job_id: "v3-tauri-mobile-plugin-mobile-host-unblock"
tags: [deep-research, feynman, tauri, android, ios, capability-denial]
---

# Result

The existing fixture is not a runnable mobile host. It emits only an `rlib`,
contains no `#[cfg_attr(mobile, tauri::mobile_entry_point)]`, and registers the
plugin only inside `#[cfg(test)]` MockRuntime code. Tauri's current
[project-structure guide](https://v2.tauri.app/start/project-structure/) says
mobile applications are compiled as libraries and loaded through that entry
point. The maintained
[create-tauri-app template](https://github.com/tauri-apps/create-tauri-app/tree/dev/templates/_base_/src-tauri)
uses `staticlib`, `cdylib`, and `rlib` for exactly that reason.

The smallest certifying host can remain a fixture rather than becoming the
later universal Tauri example. It needs only:

1. the complete Tauri app crate shape and a `run()` function registering
   `entity_graph_tauri::init()`;
2. one static contract screen whose generated binding calls
   `commands.graphPlatformPing()` and renders either the exact response or the
   rejection;
3. a `main` capability selected separately for allowed and denied builds;
4. generated Android and iOS application projects; and
5. an evidence collector that accepts target-produced receipts only when exact
   responses, environment metadata, screenshots, and hashes agree.

This shape is required because Tauri's
[mobile-plugin guide](https://v2.tauri.app/develop/plugins/develop-mobile/)
places the true boundary after Rust: `run_mobile_plugin` must execute the Kotlin
or Swift command. Source presence, cross-compilation, and desktop MockRuntime do
not observe that boundary.

# Root-cause audit

- Android physical device `SM-S936U` is attached.
- iPhone 17 / iOS 26.5 simulator is booted.
- Android and iOS Rust targets, Xcode 26.6, XcodeGen, CocoaPods, Android SDK,
  and NDK 28 are present.
- The repository has no pnpm-managed `@tauri-apps/cli`; global `cargo-tauri`
  2.10.0 is present while its own diagnostic reports 2.11.4 current.
- One unrelated Virtualization.framework process still owns roughly 180,000
  descriptors. It must not be killed without authority; clean build results
  remain potentially host-inconclusive.

# Sycophancy-corrected boundary

Devices being visible does not mean the lane is ready, and a generated app does
not mean the plugin executed. Certification remains blocked until target
responses and denials are captured and hash-verified. If descriptor pressure
prevents the final clean build, the host implementation may advance while the
clean-host gate remains explicitly blocked.

# Feynman gate

The skeptic-level explanation scored `0.965`; `misconceptions_absent` is `1.0`.
Both transfer problems scored `1.0`. Formal mastery is not claimed because the
skill's delayed retention check is outside this execution turn.
