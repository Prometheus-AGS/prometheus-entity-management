---
type: Reference
id: hybrid-mobile-c-108-follow-up-and-real-path-verification-gap
title: Hybrid Mobile C-108 Follow-Up and Real-Path Verification Gap
tags:
- hybrid-mobile-architecture
- kbd-phase
- proof-of-concept
- ci-verification
- c-108
- real-path-testing
- surrealdb
- concurrency
links:
- hybrid-mobile-pr-12-cleanup-and-scaffold-icon-ci-failure
- hybrid-mobile-poc-verification-monitor-and-worktree-cache-cleanup
- hybrid-mobile-poc-clippy-harness-false-success-and-surrealdb-fix
sources:
- stdin
- manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification
timestamp: 2026-07-17T04:35:41.680695+00:00
created_at: 2026-07-17T04:35:41.680695+00:00
updated_at: 2026-07-17T04:35:41.680695+00:00
revision: 0
---

## Phase Context

- **Project:** Hybrid Mobile Architecture
- **Phase:** `phase-codegen-and-ci-verification`
- **KBD root:** `/Users/gqadonis/Projects/hybrid-mobile-architecture-src`
- **Captured:** `2026-07-17T04:31:05Z`
- **Source context:** `manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification`
- **Status:** executing

This update continues the active PoC verification stream related to [Hybrid Mobile PR 12 Cleanup and Scaffold Icon CI Failure](/hybrid-mobile-pr-12-cleanup-and-scaffold-icon-ci-failure.md), [Hybrid Mobile PoC Verification Monitor and Worktree Cache Cleanup](/hybrid-mobile-poc-verification-monitor-and-worktree-cache-cleanup.md), and prior CI false-success findings in [Hybrid Mobile PoC Clippy Harness False Success and SurrealDB Fix](/hybrid-mobile-poc-clippy-harness-false-success-and-surrealdb-fix.md).

## Revised Phase Objective

As of `2026-07-15`, the phase objective is to deliver a **working proof-of-concept application**, not only pipeline verification.

### Primary Goal

Build a PoC app under `apps/<name>/` using repository scaffolds and skills, based on KnowMe reference documentation in `docs/reference-app/`:

- Functional spec
- Moodboard
- User journeys

The PoC must prove the skill package end-to-end and showcase the broadest practical range of supported capabilities:

- Streaming `ContentBlock` chat
- PEM entity management
- SurrealDB graph-RAG memory
- Local-first sync
- Cross-platform Flutter, Tauri, and web from one Rust core
- Feature subset selected through web research on showcase-app best practices and 2026 on-device AI feasibility

### Supporting Goals

Original codegen and CI goals remain supporting objectives, to be proven through the PoC:

- Run the real codegen pipeline on the PoC:
  - `flutter_rust_bridge_codegen generate`
  - `dart run build_runner build`
  - Full `flutter pub get`
  - Full `pnpm install`
- Confirm pre-codegen warnings clear once generated code and sibling packages exist.
- Resolve or work around the PEM install blocker:
  - `@prometheus-ags/entity-graph-core@workspace:*` is unresolvable outside the PEM monorepo.
- Verify the PoC builds and runs on at least one real target per surface:
  - macOS Tauri desktop
  - iOS simulator or Android emulator for Flutter
- Wire CI to run on every push:
  - `cargo clippy --workspace`
  - `audit.sh all`
  - Boundary test suites against the PoC

## Current Work Ownership

No hard blocker is reported. The only substantial non-conflicting work available to this session is **C-108 follow-up turn**.

| Change | Current ownership / status |
|---|---|
| **C-108 follow-up turn** | This session can proceed. Scope is contained to `run_stream`; no other active session touches it. |
| **C-105 T12c/T12d** | Spawned session owns the browser check. Taking over may conflict. |
| **C-106 sync** | Concurrent session is actively building. Do not take over unless explicitly redirected. |
| **C-109 settings** | Blocked on both C-105 and C-106. |

## Recommended Next Action

Proceed with **C-108 follow-up turn**:

- Feed tool results back into a second completion.
- Ensure the model can actually use returned tool output.
- Keep changes contained in `run_stream`.

This is estimated at roughly **4–6 verification cycles**. Each cycle is slowed by a structural `surrealdb-core` rebuild cost of approximately **3 minutes**.

## Decision Points for Project Owner

The session explicitly requires owner direction for these items:

1. **Time budget:** decide whether C-108’s follow-up turn is worth another 4–6 cycles given slow rebuild times.
2. **Ownership consolidation:** decide whether this session should take over C-105 or C-106 if those sessions are stalled, accepting likely merge conflicts.
3. **Verification strategy:** decide whether to prioritize the deeper production-path verification gap over remaining feature work.

## Verification Gap

A major risk remains: several changes were marked verified while broken in production paths.

Observed issues:

- The memory layer had reportedly never worked on the real path.
- The desktop chat lane rendered nothing since C-103.
- Prior verification used paths adjacent to the claimed production behavior rather than exercising the actual app path.
- Current CI, including C-110, is green but does **not** boot the app or exercise a real end-to-end user path.

Engineering implication: CI needs at least one real-path smoke or integration test that boots the PoC and validates visible/functional behavior across the critical path, not only compile-adjacent or harness-only checks. This aligns with earlier false-success concerns documented in [Hybrid Mobile PoC Clippy Harness False Success and SurrealDB Fix](/hybrid-mobile-poc-clippy-harness-false-success-and-surrealdb-fix.md).

## Citations

1. stdin
2. manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification