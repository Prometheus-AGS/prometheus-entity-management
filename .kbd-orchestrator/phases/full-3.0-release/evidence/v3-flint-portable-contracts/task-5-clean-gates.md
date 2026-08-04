# Flint portable contracts task-5 clean gates

**Date:** 2026-08-04

**Candidate:** `bcecaed160c2c16928a7dd9eac8b4fdabb6a0e1b`

**Result:** PASS at the declared portable, real-SDK, repository-CI, and remote
Node/Tauri boundary

**KBD receipt:** task 5 completed at signed revision 143; the known parent
projection reset was restored to `in_progress` by typed revision 144.

## Immutable source boundary

| Repository | Detached revision | Use in this gate |
| --- | --- | --- |
| Prometheus Entity Management | `bcecaed160c2c16928a7dd9eac8b4fdabb6a0e1b` | Candidate under verification |
| Flint Realtime Fabric | `cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89` | Real SDK and structural realtime contract |
| Flint Gate | `2438892dfc7177c568bf57f3339a206d728f4ff2` | JWT/JWKS and role/key boundary |
| Flint Forge | `2289d1527f13f7b72c317ec374f4dc0ff366a136` | Plan/apply/status/DDL provisioning semantics |

All four sources were checked out as detached temporary worktrees. The external
verifier passed all fourteen hash-bound Flint files. The Realtime Fabric SDK
and entity-management packages were built from the pinned source before the
live lane ran.

## Clean command matrix

| Command | Result |
| --- | --- |
| Entity workspace `pnpm install --frozen-lockfile --prefer-offline` | Pass; 17 workspaces, lockfile unchanged |
| Realtime Fabric `pnpm install --frozen-lockfile --prefer-offline` | Pass; 3 workspaces, lockfile unchanged |
| Realtime Fabric `pnpm --filter @prometheusags/frf-sdk build` | Pass |
| Realtime Fabric `pnpm --filter @prometheusags/frf-entity-management build` | Pass |
| `CI=true pnpm run ci` | Pass from an empty Git status with one serialized writer; validation, lint, typecheck, build, test/BDD, skills, and security gates completed |
| `pnpm run verify:sync-persistence` | Pass; packed core/sync ESM, CommonJS, NodeNext, and loopback convergence consumer |
| `pnpm run verify:flint-contracts -- --external-realtime-root <pinned> --external-gate-root <pinned> --external-forge-root <pinned>` | Pass; portable and external contracts, fourteen source hashes, zero client secrets |
| `FLINT_REALTIME_FABRIC_ROOT=<pinned> pnpm run test:flint-live` | Pass, 1/1 real-SDK normalized-graph round trip |
| `pnpm exec openspec validate v3-flint-portable-contracts --type change --strict` | Pass |
| `pnpm exec actionlint .github/workflows/flint-live-contract.yml` | Pass |

The complete CI build retained non-blocking third-party PGlite direct-`eval`
and bundle-size warnings. The security gate passed; this change does not claim
that warning-free PGlite bundling is part of the Flint contract.

## Verification-orchestration correction

An initial full-CI diagnostic attempt was followed by another attempt before
the first high-output child session had been conclusively closed. The later
attempt observed a core tarball while its declarations were absent and failed
with `tarball is missing dist/index.d.ts`. That was not accepted as a pass or
silently retried.

After all `pnpm` writers were absent, the exact core/sync build-pack-consumer
command passed and `dist/index.d.ts` was present. A single serialized full-CI
run then passed end to end without the failure recurring. This evidence supports
verification-writer contention as the cause; no package source or manifest was
changed without an observed product defect.

## Remote matrix

PR #10 at the exact candidate SHA passed:

- Node 22, 24, and 26 in CI run
  `https://github.com/Prometheus-AGS/prometheus-entity-management/actions/runs/30906154287`
- Tauri desktop permissions and packed consumer in run
  `https://github.com/Prometheus-AGS/prometheus-entity-management/actions/runs/30906154294`

## Scope and limits

- No Dart, Flutter, Rust, Cargo, native platform, or package API source changed
  in this Flint change. Their expensive native platform gates are therefore not
  rerun or claimed here. The relevant Tauri packed-consumer remote job passed.
- The checked portable fixture is the default CI contract. The real Flint SDK
  remains an explicit immutable-source lane rather than a hidden sibling-path
  dependency.
- Forge provisioning semantics are verified from pinned source; no unbuilt
  Forge runtime adapter is claimed.
- Remote `main` remains frozen at
  `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. npm remains `latest: 2.2.0` and
  `alpha: 3.0.0-alpha.0`, with no `next` tag. This task does not authorize or
  perform publication.
