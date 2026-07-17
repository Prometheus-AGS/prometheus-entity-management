---
type: Reference
id: hybrid-mobile-poc-memory-verification-failures-and-fixes
title: Hybrid Mobile PoC Memory Verification Failures and Fixes
tags:
- hybrid-mobile-architecture
- kbd-phase
- surrealdb
- memory-search
- graph-rag
- ci-verification
- proof-of-concept
links:
- hybrid-mobile-poc-phase-assessment-codegen-ci-and-build-blockers
sources:
- stdin
- manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification
timestamp: 2026-07-16T23:59:49.744144+00:00
created_at: 2026-07-16T23:59:49.744144+00:00
updated_at: 2026-07-16T23:59:49.744144+00:00
revision: 0
---

## Phase Context

- **Project:** Hybrid Mobile Architecture
- **Phase:** `phase-codegen-and-ci-verification`
- **KBD root:** `/Users/gqadonis/Projects/hybrid-mobile-architecture-src`
- **Captured:** `2026-07-16T23:58:03Z`
- **Status:** executing
- **Current assessment:** 8/10
- **Related phase record:** [Hybrid Mobile PoC Phase Assessment: Codegen, CI, and Build Blockers](/hybrid-mobile-poc-phase-assessment-codegen-ci-and-build-blockers.md)

## Revised Phase Goal

As of `2026-07-15`, the phase objective changed from pipeline-only verification to delivering a working proof-of-concept application.

### Primary Objective

Build a PoC app under `apps/<name>/` using repository scaffolds and skills, based on KnowMe reference documentation in `docs/reference-app/`:

- Functional spec
- Moodboard
- User journeys

The PoC must prove the skill package end-to-end and showcase the broadest practical range of supported capabilities:

- Streaming `ContentBlock` chat
- PEM entity management
- SurrealDB graph-RAG memory
- Local-first sync
- Cross-platform Flutter, Tauri, and web surfaces from one Rust core
- Feature subset selected via web research on showcase-app best practices and 2026 on-device AI feasibility

### Supporting Objectives

The original codegen and CI goals remain supporting objectives, to be proven through the PoC:

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

## Session Outcome

The session completed and was pushed, but exposed a major verification gap: the memory layer had not actually been verified by the previous C-104 completion claim.

C-104 had been recorded as “backend done and verified,” but its live verification exercised the Ollama **chat** path only. That path does not touch `memory_search`. The first test that actually exercised `memory_search` failed at parse time on every call.

## Memory Layer Failure Chain

Four bugs were uncovered sequentially; each one hid the next:

1. **Test harness runtime was not initialized**
   - Tests panicked before reaching real memory code.
   - This initially looked like broken search behavior rather than missing setup.

2. **`memory_search` failed on every call**
   - SurrealDB's KNN operator rejects a bound parameter for `k`.
   - Result: every memory search call failed at parse time.

3. **`type::thing` is unavailable in SurrealDB 3.2**
   - Eight call sites were affected.
   - Breakage included:
     - Entity creation
     - Relations
     - Graph expansion
     - Entire config store, including providers, model preferences, and app settings

4. **`RELATE` rejects function-call endpoints**
   - `UPSERT` and `SELECT` accept the same expression form.
   - `RELATE` does not, requiring a separate workaround.

## Fixes and Verified Behavior

Hybrid search now works.

Verified behavior includes:

- Memory search no longer fails at parse time.
- Hybrid search combines semantic/vector and lexical lanes.
- BM25 lane works for rare-term retrieval.
- A test confirms that a rare term, `platypus`, is findable through BM25 even when it would not be found by the other lane.
- The seed corpus, authored from the reference app specification, is wired into both app surfaces through one shared path.

## Deliberately Ignored Test

One test is intentionally marked `#[ignore]`:

- `graph_expand` still returns empty after SurrealDB parse errors were resolved.
- The test is considered correct and the implementation is considered wrong.
- The test was not weakened or deleted.
- The reason is documented in a code comment.
- The issue has been spun off as its own task.
- This does not block the memory search lane.

## Build and Process Lessons

The `surrealdb-core` rebuild takes approximately 3 minutes. During the session, fixes were tested one at a time, causing slow feedback. At one point, 9 Cargo processes were blocked on the same build lock, preventing progress.

Operational lesson: avoid launching concurrent redundant Cargo builds against the same workspace when a long rebuild is already in progress.

## Remaining Open Work

Phase status remains **8/10**.

Open items:

- C-111 vector toggle
- C-111 Flutter memory UI
- C-108
- C-109
- Spawned startup tests task
- Spawned WebLLM browser check task
- Spawned `graph_expand` fix task

## Verification Risk Identified

Three separate changes in this session had been marked “verified” while still broken in production. The shared failure mode was verification that exercised code adjacent to the claimed behavior rather than the behavior itself.

Corrective principle: verification must directly execute the production path named in the claim. For memory functionality, tests must call `memory_search` and graph expansion paths directly, not only chat paths that may bypass memory.

# Citations

1. stdin
2. manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification