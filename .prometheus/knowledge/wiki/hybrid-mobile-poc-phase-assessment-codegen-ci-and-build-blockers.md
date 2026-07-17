---
type: Reference
id: hybrid-mobile-poc-phase-assessment-codegen-ci-and-build-blockers
title: 'Hybrid Mobile PoC Phase Assessment: Codegen, CI, and Build Blockers'
tags:
- hybrid-mobile-architecture
- kbd-phase
- tauri
- pnpm
- vite
- ci-verification
- codegen
- flint-react
sources:
- stdin
- manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification
timestamp: 2026-07-16T21:33:43.392162+00:00
created_at: 2026-07-16T21:33:43.392162+00:00
updated_at: 2026-07-16T21:33:43.392162+00:00
revision: 0
---

## Phase Context

- **Project:** Hybrid Mobile Architecture
- **Phase:** `phase-codegen-and-ci-verification`
- **KBD root:** `/Users/gqadonis/Projects/hybrid-mobile-architecture-src/.claude/worktrees/sweet-mendeleev-401c40`
- **Captured:** `2026-07-16T21:14:03Z`
- **Status:** executing
- **Progress:** step 5 of 10 complete; 5 changes remain

## Revised Phase Goal

As of `2026-07-15`, the phase goal changed from pipeline-only verification to delivering a working proof-of-concept application.

### Primary Objective

Build a PoC app in `apps/<name>/` using this repository's scaffolds and skills, based on KnowMe reference documentation in `docs/reference-app/`:

- Functional spec
- Moodboard
- User journeys

The PoC must prove the skill package end-to-end and showcase the broadest practical capability set:

- Streaming `ContentBlock` chat
- PEM entity management
- SurrealDB graph-RAG memory
- Local-first sync
- Cross-platform Flutter, Tauri, and web surfaces from one Rust core
- Feature subset selected using web research on showcase-app best practices and 2026 on-device AI feasibility

### Supporting Objectives

The original phase goals remain as supporting objectives, to be proven through the PoC:

- Run the real codegen pipeline:
  - `flutter_rust_bridge_codegen generate`
  - `dart run build_runner build`
  - Full `flutter pub get`
  - Full `pnpm install`
- Confirm pre-codegen warnings clear after generated code and sibling packages exist.
- Resolve or work around the PEM install blocker:
  - `@prometheus-ags/entity-graph-core@workspace:*` is unresolvable outside the PEM monorepo.
- Verify the PoC builds and runs on at least one real target per surface:
  - macOS Tauri desktop
  - iOS simulator or Android emulator for Flutter
- Wire CI to run on every push:
  - `cargo clippy --workspace`
  - `audit.sh all`
  - Boundary test suites against the PoC

## Assessment Result

Desktop tests are currently green:

- **10/10 desktop tests passing**

However, two open issues remain, one of which blocks a stated phase goal:

1. `@flint/react` packaging failure blocks CI TypeScript checking.
2. Production frontend build fails for scaffolded Tauri apps due to Safari target incompatibility.

CI also has a coverage gap: it does not run the frontend production build, so it cannot catch the second issue.

## Resolved Packaging Bug: Empty `file:`/Git Dependency Snapshots

### Root Cause

A single bug class affected three packages:

- `main`
- `types`
- `exports`

These fields pointed at a gitignored and never-built `dist/` directory.

With pnpm, `file:` and Git dependencies are snapshotted at install time and respect package `files`. Because `dist/` was not present, linked packages were effectively empty.

### Rejected Fix: `postinstall`

A `postinstall` build step was tested and rejected.

Reason: pnpm snapshots dependencies before `postinstall` runs, so generated build output never reaches the installed dependency snapshot.

### Applied Fix

Use pnpm's documented `publishConfig` pattern:

- Development package metadata points to source files, e.g. `src/index.ts`.
- `publishConfig` overrides package entrypoints to `dist/` only for published packages.

This makes fresh clones work without a preinstall build step while preserving publish behavior:

- Fresh clone: no build step required before install.
- `npm pack`: still includes `dist/` for publishing.

## Open Issue F-1: `@flint/react` Git Dependency Packaging

### Status

- **Severity:** critical
- **Impact:** red CI `tsc`
- **Cause:** dependency packaging, not app code

### Details

`@flint/react` is pinned as a Git+SHA dependency and ships neither:

- `dist/`
- `src/`

The application code is correct; the dependency package is incomplete.

### Researched Non-Fix

Adding `prepare` upstream is not sufficient because pnpm does not reliably run `prepare` for Git dependencies. The relevant upstream pnpm issue remains open through pnpm v11:

- `pnpm#8868`: `prepare` not running for Git dependencies

### Required Fix

Requires an upstream fix in `Know-Me-Tools/flint-forge`, followed by re-pinning the dependency SHA.

## Open Issue F-2: Production Build Fails on Safari Target

### Status

- **Severity:** phase-blocking/product decision required
- **Impact:** `vite build` fails
- **Scope:** all scaffolded Tauri projects inherit the issue

### Failure

`vite build` fails with approximately 99 esbuild errors inside `@tanstack/react-query` when targeting `safari13`.

This was verified against a pristine tree, so the failure predates the current PoC work.

### Target Testing Result

Tested Safari targets:

| Target | Result |
|---|---|
| `safari13` | fails |
| `safari14` | fails |
| `safari15` | builds |

### Scaffold Source

The broken target originates in this repository's scaffold script:

- `scripts/scaffold-tauri.sh:166`

Therefore every newly scaffolded Tauri project inherits the failing production build configuration.

### Product Decision

Tauri documentation still recommends `safari13`, but Tauri's webview compatibility table implies that moving to `safari15` drops support for:

- macOS Catalina
- macOS Big Sur

There is no identified middle target: `safari14` still fails. Accepting `safari15` is therefore a product support decision, not a purely technical fix.

## Open Issue F-3: CI Does Not Build the Frontend

### Status

- **Severity:** CI coverage gap
- **Impact:** CI cannot catch F-2

Current CI runs only:

- `tsc`
- tests

It does not run the production frontend build, which allowed the broken `vite build` path to go unnoticed.

### Required Sequencing

The frontend build step must land in CI together with the F-2 fix. Otherwise CI will immediately go red.

## Other Resolved Items

The assessment also recorded these resolved items:

- Fixed or validated the `inflight` latch issue.
- Closed the Vitest mock gap.
- Corrected stale command names.
- Corrected stale project memory that recommended a build-then-reinstall workaround; that workaround is obsolete after the `publishConfig` fix.

## Planning Blockers

Three decisions are required before `/kbd-plan`:

1. May changes be committed upstream to `Know-Me-Tools/flint-forge` and the dependency SHA re-pinned?
2. Is dropping macOS versions earlier than 12 acceptable by targeting `safari15`?
3. Should `scripts/scaffold-tauri.sh` be fixed in this phase or filed separately?

## Recommended Next Sequence

After decisions are answered:

1. Run `/kbd-plan`.
2. Sequence F-2 and F-3 together:
   - Fix Safari target/build configuration.
   - Add frontend production build to CI.
   - This unblocks goal G-6.
3. Fix F-1:
   - Patch `flint-forge` packaging upstream.
   - Re-pin the Git SHA.

# Citations

1. stdin
2. manual:Hybrid Mobile Architecture/phase-codegen-and-ci-verification