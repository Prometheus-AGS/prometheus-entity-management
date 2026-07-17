---
type: Reference
id: hybrid-mobile-pr-12-cleanup-and-scaffold-icon-ci-failure
title: Hybrid Mobile PR 12 Cleanup and Scaffold Icon CI Failure
tags:
- hybrid-mobile-architecture
- kbd-phase
- ci-verification
- worktree-cleanup
- tauri
- scaffold-scripts
- cargo-clippy
- proof-of-concept
links:
- hybrid-mobile-pr-11-cleanup-and-worktree-preservation
- hybrid-mobile-poc-verification-monitor-and-worktree-cache-cleanup
- hybrid-mobile-poc-memory-verification-failures-and-fixes
- hybrid-mobile-poc-cargo-verification-concurrency-correction
sources:
- stdin
- manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification
timestamp: 2026-07-17T04:21:05.621450+00:00
created_at: 2026-07-17T04:21:05.621450+00:00
updated_at: 2026-07-17T04:21:05.621450+00:00
revision: 0
---

## Context

- **Project:** Hybrid Mobile Architecture
- **Phase:** `phase-codegen-and-ci-verification`
- **KBD root:** `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/.claude/worktrees/optimistic-volhard-233482`
- **Captured:** `2026-07-17T04:20:23Z`
- **Source context:** `manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification`
- **Status:** executing

This update continues the PoC CI verification and cleanup work related to [Hybrid Mobile PR 11 Cleanup and Worktree Preservation](/hybrid-mobile-pr-11-cleanup-and-worktree-preservation.md) and the active verification stream in [Hybrid Mobile PoC Verification Monitor and Worktree Cache Cleanup](/hybrid-mobile-poc-verification-monitor-and-worktree-cache-cleanup.md).

## Revised Phase Objective

As of `2026-07-15`, the phase objective is to deliver a working proof-of-concept application, not only pipeline verification.

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
- Feature subset selected via web research on showcase-app best practices and 2026 on-device AI feasibility

### Supporting Goals

The original codegen and CI goals remain supporting objectives proven through the PoC:

- Run the real codegen pipeline on the PoC:
  - `flutter_rust_bridge_codegen generate`
  - `dart run build_runner build`
  - full `flutter pub get`
  - `pnpm install`
- Confirm pre-codegen warnings clear once generated code and sibling packages exist.
- Resolve or work around the PEM install blocker: `@prometheus-ags/entity-graph-core@workspace:*` is unresolvable outside the PEM monorepo.
- Verify the PoC builds and runs on at least one real target per surface:
  - macOS Tauri desktop
  - iOS simulator or Android emulator for Flutter
- Wire CI to run on every push:
  - `cargo clippy --workspace`
  - `audit.sh all`
  - boundary test suites against the PoC

## Completed Cleanup

- PR #12 branch cleanup is complete.
- The branch was deleted locally and remotely.
- `git branch -d` confirmed the branch was merged before deletion.
- No worktree existed for PR #12:
  - The branch was created directly in the main repository.
  - This matched the PR #11 cleanup pattern described in [Hybrid Mobile PR 11 Cleanup and Worktree Preservation](/hybrid-mobile-pr-11-cleanup-and-worktree-preservation.md).
- `git worktree prune` confirmed there were no stale worktrees to remove.

## CI Failure Attribution

The observed CI failure was determined not to originate from the PR #12 work.

Evidence:

- `audit.sh` was already failing on commits before the PR #12 branch:
  - `a20cc5cf`
  - `0b98fbd8`
  - `c523e2d7`
- The failure occurs in approximately 31 seconds, too quickly to be caused by Rust compilation.
- The failure was reproduced locally.

### Root Cause

`scaffold-tauri.sh` runs the Tauri icon generation command before installing npm dependencies:

```sh
npx tauri icon
```

The failing line is `scaffold-tauri.sh:1182`.

Because this runs before `npm install`, `npx` cannot resolve the Tauri CLI. With `set -e`, the scaffold exits immediately.

The failure is hidden because output is redirected:

```sh
> /dev/null 2>&1
```

This produces a silent failure class similar to prior C-111 scaffold issues.

### Action Taken

- Filed the scaffold icon issue with full reproduction details.
- Did not modify the script in this session because the requested task was cleanup and CI monitoring, not scaffold repair.

## Related Convergence With PR #13

PR #13 merged documentation for the `rrf_fuse` lane contract:

> Only for lanes that can AGREE, where intra-lane position is meaningful.

This matches the contract that `graph_expand` had previously violated. The hop-distance fix remains intact in `main` and is now supported by function-level documentation visible to future callers. This relates to the memory and graph-RAG verification failures tracked in [Hybrid Mobile PoC Memory Verification Failures and Fixes](/hybrid-mobile-poc-memory-verification-failures-and-fixes.md).

## Verification Status

`Rust — clippy + test` on `main` run `29554136261` was still queued at capture time.

Local evidence for the hop-distance fix was strong but not yet CI-confirmed:

- 16 consecutive local green runs
- Clippy clean locally
- Previous behavior was flaky, with approximately 4/8 passing before the fix

The session explicitly did not claim CI verification until the queued `Rust — clippy + test` job reported a final verdict. This corrects the earlier verification overclaim pattern discussed in [Hybrid Mobile PoC Cargo Verification Concurrency Correction](/hybrid-mobile-poc-cargo-verification-concurrency-correction.md).

## Open Follow-Ups

- Continue monitoring `main` run `29554136261` for the `Rust — clippy + test` verdict.
- Track the separately spawned scaffold-icon fix for `scaffold-tauri.sh` ordering.
- Re-measure Phase 1 branch-prune state because `main` absorbed PRs #12 and #13 after the previous inventory.

# Citations

1. stdin
2. manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification