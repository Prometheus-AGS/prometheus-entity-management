---
type: Reference
id: hybrid-mobile-poc-clippy-harness-false-success-and-surrealdb-fix
title: Hybrid Mobile PoC Clippy Harness False Success and SurrealDB Fix
tags:
- hybrid-mobile-architecture
- kbd-phase
- ci-verification
- surrealdb
- clippy
- proof-of-concept
- false-success
links:
- hybrid-mobile-poc-memory-verification-failures-and-fixes
sources:
- stdin
timestamp: 2026-07-17T01:50:46.027562+00:00
created_at: 2026-07-17T01:50:46.027562+00:00
updated_at: 2026-07-17T01:50:46.027562+00:00
revision: 0
---

## Phase Context

- **Project:** Hybrid Mobile Architecture
- **Phase:** `phase-codegen-and-ci-verification`
- **KBD root:** `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/.claude/worktrees/funny-wozniak-06a4cc`
- **Captured:** `2026-07-17T01:48:35Z`
- **Source context:** `manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification`
- **Status:** executing

This update extends the memory-verification work tracked in [Hybrid Mobile PoC Memory Verification Failures and Fixes](/hybrid-mobile-poc-memory-verification-failures-and-fixes.md).

## Revised Phase Objective

As of `2026-07-15`, the phase objective is a working proof-of-concept application, not only pipeline verification.

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
- Feature subset chosen using web research on showcase-app best practices and 2026 on-device AI feasibility

### Supporting Goals

The original codegen and CI goals remain supporting objectives, to be proven through the PoC:

- Run the real codegen pipeline on the PoC:
  - `flutter_rust_bridge_codegen generate`
  - `dart run build_runner build`
  - full `flutter pub get`
  - full `pnpm install`
- Confirm pre-codegen warnings clear once generated code and sibling packages exist.
- Resolve or work around the PEM install blocker: `@prometheus-ags/entity-graph-core@workspace:*` is unresolvable outside the PEM monorepo.
- Verify the PoC builds and runs on at least one real target per surface:
  - macOS Tauri desktop
  - iOS simulator or Android emulator for Flutter
- Wire CI to run on every push:
  - `cargo clippy --workspace`
  - `audit.sh all`
  - boundary test suites against the PoC

## Verification Failure Found

The verification run caught a real Rust failure that the shell harness initially reported as success.

Observed behavior:

- First clippy run reported **exit code 0**.
- Output file showed the run had actually failed with:

```text
E0425: cannot find type Response in crate surrealdb
```

Root cause:

```sh
cargo ... | tail
```

returns `tail`'s exit code, not `cargo`'s exit code. This produced a false success signal. The failure mode is the same class of bug the phase is intended to eliminate: a success indicator that does not prove success.

## SurrealDB Type Fix

The incorrect type reference was `surrealdb::Response`.

Correct type:

```rust
surrealdb::IndexedResults
```

Key detail:

- `IndexedResults` is exported at `lib.rs:52`.
- The relevant module contains two `take_errors` implementations.
- The desired method is on `impl IndexedResults`.
- The `WithStats<IndexedResults>` implementation returns stats-wrapped errors and was not the correct target for this fix.

## Verified Current Result

After the SurrealDB type fix and corrected verification handling:

```text
CLIPPY_EXIT=0
TEST_EXIT=0
6 passed, 0 failed, 0 ignored
```

## Required Next Steps

1. Confirm the falsification run goes red, proving the tests pin the bug.
2. Restore `store.rs` from backup.
3. Re-run verification and confirm green.
4. Commit:
   - fix
   - tests
   - `.prometheus/` session logs
5. Push the branch.

# Citations

1. stdin