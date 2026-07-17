---
type: Reference
id: hybrid-mobile-poc-cargo-verification-concurrency-correction
title: Hybrid Mobile PoC Cargo Verification Concurrency Correction
tags:
- hybrid-mobile-architecture
- kbd-phase
- cargo-test
- ci-verification
- proof-of-concept
- concurrency
- surrealdb
links:
- hybrid-mobile-poc-clippy-harness-false-success-and-surrealdb-fix
sources:
- stdin
- manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification
timestamp: 2026-07-17T02:08:00.144794+00:00
created_at: 2026-07-17T02:08:00.144794+00:00
updated_at: 2026-07-17T02:08:00.144794+00:00
revision: 0
---

## Phase Context

- **Project:** Hybrid Mobile Architecture
- **Phase:** `phase-codegen-and-ci-verification`
- **KBD root:** `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/.claude/worktrees/funny-wozniak-06a4cc`
- **Captured:** `2026-07-17T02:07:17Z`
- **Source context:** `manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification`
- **Status:** executing

## Revised Phase Objective

As of `2026-07-15`, the phase objective is to deliver a working proof-of-concept application, not only to verify codegen and CI.

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

The original codegen and CI goals remain supporting objectives that the PoC should prove in passing:

- Run the real codegen pipeline on the PoC:
  - `flutter_rust_bridge_codegen generate`
  - `dart run build_runner build`
  - Full `flutter pub get`
  - Full `pnpm install`
- Confirm pre-codegen warnings clear once generated code and sibling packages exist.
- Resolve or work around the PEM install blocker: `@prometheus-ags/entity-graph-core@workspace:*` is unresolvable outside the PEM monorepo.
- Verify the PoC builds and runs on at least one real target per surface:
  - macOS Tauri desktop
  - iOS simulator or Android emulator for Flutter
- Wire CI to run on every push:
  - `cargo clippy --workspace`
  - `audit.sh all`
  - Boundary test suites against the PoC

## Verification Correction

A prior update incorrectly described three cargo verification runs as completed. They were not serialized. Instead, they accumulated as concurrent `cargo test` invocations against the same target directory, causing mutual blocking on the cargo target lock. This is the exact process hazard warned about in `CLAUDE.md`.

Corrective action taken:

- Identified three stacked cargo processes from the current session.
- Killed those three local, mutually-blocking processes.
- Left a fourth cargo process untouched because it belonged to an unrelated session in a separate worktree/target directory.
- Started one clean cargo verification run with no same-target lock contention.

This update refines the verification process issue after the SurrealDB/clippy work tracked in [Hybrid Mobile PoC Clippy Harness False Success and SurrealDB Fix](/hybrid-mobile-poc-clippy-harness-false-success-and-surrealdb-fix.md).

## Code State

The code changes are unaffected by the verification-process mistake.

Confirmed state:

- `store.rs` remains restored to the parenthesized fix.
- The fix was verified by `grep` before starting the clean cargo run.
- The issue was verification-process concurrency, not a code regression.

## Next Steps

1. Wait for the single clean `clippy` + test run to finish.
2. Confirm:
   - `0` warnings
   - `6/6` tests green
3. Review repository state:
   - `git status`
   - `git diff`
4. Stage and commit:
   - Crate fix
   - Tests
   - `.prometheus/` wiki entry
5. Push under the standing repository authorization.

# Citations

1. stdin
2. manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification