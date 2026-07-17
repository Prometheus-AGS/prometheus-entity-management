---
type: Reference
id: flint-forge-p15-pr-25-pgrx-worktree-and-vault-test-fixes
title: 'Flint Forge p15 PR 25: pgrx Worktree and Vault Test Fixes'
tags:
- flint-forge
- production-readiness
- pgrx
- postgres
- ci
- worktree
- ext-flint-vault
links:
- flint-forge-p15-production-readiness-pgrx-and-migration-blockers
sources:
- stdin
timestamp: 2026-07-16T23:26:33.345310+00:00
created_at: 2026-07-16T23:26:33.345310+00:00
updated_at: 2026-07-16T23:26:33.345310+00:00
revision: 0
---

## Phase Context

- **Project:** Flint Forge
- **Phase:** `p15-v1.0-production-readiness`
- **KBD root:** `/Users/gqadonis/Projects/prometheus/flint-forge/.claude/worktrees/hungry-poitras-a3e04c`
- **Captured:** `2026-07-16T23:15:26Z`
- **Source context:** `manual:Flint Forge/p15-v1.0-production-readiness`

This update belongs to the broader [Flint Forge p15 Production Readiness: pgrx and Migration Blockers](/flint-forge-p15-production-readiness-pgrx-and-migration-blockers.md) effort.

## Production Readiness Scope

Phase `p15-v1.0-production-readiness` aims to close the gap between a workspace that compiles with passing unit tests and a production-ready Flint Forge v1.0. The work focuses on:

- Build integrity
- Operator tooling
- End-to-end validation
- Documentation accuracy
- Production packaging

New feature work is explicitly out of scope.

## Planned P0 Blockers

### p15-c001 — Anvil Extension Stabilization

Goal: make all five `ext-flint-*` / `flint_*` pgrx extensions compile and pass `cargo pgrx test` on one supported toolchain.

Required work:

- Unify pgrx version and Postgres target.
- Fix `DatumWithOid` compile error in `ext-flint-meta`.
- Resolve workspace-inheritance misconfiguration for excluded crates.
- Add a pgrx CI job in a Linux container.

Production gate:

```sh
cargo pgrx test
```

must pass for all extensions in CI.

### p15-c002 — Migration Integrity

Goal: restore strict linear migration ordering and verify migrations in CI.

Required work:

- Renumber colliding `migrations/0005_*` files.
- Renumber colliding `migrations/0006_*` files.
- Add CI verification that runs migrations against an empty Postgres 18 database:

```sh
sqlx migrate run
```

## PR Status

- **PR:** [#25 — fix(pgrx): resolve worktree socket-path failure and negative-test bug in ext-flint-vault](https://github.com/Know-Me-Tools/flint-forge/pull/25)
- **Branch:** `claude/hungry-poitras-a3e04c`
- **Target:** `main`
- **Status:** open and ready for review/CI

## Commits Pushed

- `fa84853` — `.cargo/config.toml` socket-path fix
- `b19defc` — `ext-flint-vault` test fix

Pushed branch:

```text
claude/hungry-poitras-a3e04c -> origin
```

## Worktree State Note

The reported warning about `9 uncommitted changes` refers to unrelated `.prometheus/` orchestrator state files in the worktree.

Decision:

- Leave `.prometheus/` orchestrator state files uncommitted.
- Exclude them from the push and PR diff.

Result: the PR contains only the intended pgrx/worktree socket-path and `ext-flint-vault` negative-test fixes.

# Citations

1. stdin