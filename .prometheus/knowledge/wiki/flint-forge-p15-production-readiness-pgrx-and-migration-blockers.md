---
type: Reference
id: flint-forge-p15-production-readiness-pgrx-and-migration-blockers
title: 'Flint Forge p15 Production Readiness: pgrx and Migration Blockers'
tags:
- flint-forge
- production-readiness
- pgrx
- postgres
- sqlx-migrations
- ci
- kbd-phase
sources:
- stdin
- manual:Flint Forge/p15-v1.0-production-readiness
timestamp: 2026-07-16T22:00:01.014567+00:00
created_at: 2026-07-16T22:00:01.014567+00:00
updated_at: 2026-07-16T22:00:01.014567+00:00
revision: 0
---

## Phase Context

- **Project:** Flint Forge
- **Phase:** `p15-v1.0-production-readiness`
- **KBD root:** `/Users/gqadonis/Projects/prometheus/flint-forge/.claude/worktrees/nice-hodgkin-5f0999`
- **Captured:** `2026-07-16T21:57:45Z`
- **Seeded from:** user directive + `p14-v1.1.0/reflection.md`

## Objective

Close the gap between a workspace that compiles with passing unit tests and a production-ready Flint Forge v1.0. Scope is limited to production readiness work:

- Build integrity
- Operator tooling
- End-to-end validation
- Documentation accuracy
- Production packaging

No new feature work is in scope.

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
- Add a CI step that runs migrations against an empty Postgres 18 database:

```sh
sqlx migrate run
```

## Session Status

- Commit `6780387` is confirmed merged to `main`.
- The vault backup/restore data-loss fix is live.
- No further action is required on the vault fix.
- A separate background task, `task_1fdbdb5b`, is still handling the `cargo pgrx test` socket-path issue caused by deep worktree paths.
- Current next step: wait for `task_1fdbdb5b` to complete and report its pgrx socket-path fix outcome.

# Citations

1. stdin
2. manual:Flint Forge/p15-v1.0-production-readiness