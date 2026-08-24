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

## Task-6 review remediation — current cumulative head

The first isolated cumulative-diff review correctly rejected the archive
packet because this receipt was still bound to the earlier task-5 candidate
while the reviewed implementation had advanced. The complete clean matrix was
therefore repeated from detached worktrees at the exact cumulative source head,
without changing implementation source.

| Repository | Detached revision |
| --- | --- |
| Prometheus Entity Management | `5ef6ea30598839b87e1879b8b78e4f8af47526c7` |
| Flint Realtime Fabric | `cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89` |
| Flint Gate | `2438892dfc7177c568bf57f3339a206d728f4ff2` |
| Flint Forge | `2289d1527f13f7b72c317ec374f4dc0ff366a136` |

Current-head results:

- Frozen installs passed for the 17-workspace entity repository and the
  3-workspace Realtime Fabric repository.
- Both required Realtime Fabric SDK packages built successfully.
- One serialized `CI=true pnpm run ci` completed with exit code zero.
- The portable plus external verifier passed all fourteen pinned source files
  after proving each supplied Git `HEAD` equals its contract revision, and
  found zero client secrets.
- The focused Flint regression suite passed 8/8, including rejection of a
  valid Git worktree at the wrong revision.
- The real Realtime Fabric SDK normalized-graph round trip passed 1/1.
- Strict active-change OpenSpec validation and workflow actionlint passed.
- PR #10 at this exact source SHA passed Node 22, 24, and 26 in run
  `https://github.com/Prometheus-AGS/prometheus-entity-management/actions/runs/30907758252`
  and the Tauri packed-consumer lane in run
  `https://github.com/Prometheus-AGS/prometheus-entity-management/actions/runs/30907759250`.

The temporary detached worktrees were clean after generated browser and A2A
receipts were restored, then removed through their owning repositories. This
current-head pass supersedes the earlier candidate only for cumulative archive
review; the earlier receipt remains above as an auditable task-5 result.

## Post-review revision-identity correction

The second isolated review found that file hashes alone did not prove supplied
external roots were at their declared revisions. The verifier now requires
each root to be a Git worktree whose `HEAD^{commit}` exactly equals the contract
revision, and the fourth review required the final trust-boundary correction:
both the pinned commit blob and the working-tree bytes must independently match
the fourteen-file hash set.

The corrected cumulative worktree passed:

- 10/10 focused Flint regressions, including a real Git worktree at the wrong
  revision, committed-source drift, a dirty pinned working-tree file, and a
  service-role credential in `.env.local`;
- positive external verification for all three exact Git revisions, retained
  in `task-6-external-source-verification.json`;
- 6/6 Flint BDD scenarios and 20/20 steps;
- focused ESLint, Node syntax, diff hygiene, strict OpenSpec, and actionlint;
- the root validation, lint, typecheck, and build CI gates;
- the aggregate test gate after environmental cleanup: 96/96 scenarios,
  448/448 steps, all package/release tests, and 3/3 React browser flows;
- the complete skills/export gate; and
- the production security gate: 334 dependencies, zero high/critical blocking
  advisories, and two visible non-blocking low advisories.

The client credential scan now inspects 481 repository-owned text-like example
source/config and generated-output files, explicitly including dot-env, YAML,
TOML, native config, extensionless text, `.next`, `build`, `dist`, and `target`;
250 binary files are reported separately and zero exposed credentials were
found. Third-party dependency and cache exclusions are enumerated in the
machine receipt. Cross-platform regressions reject macOS, Linux, root,
Windows-profile, and other absolute Flint sibling paths.

Remote refs were refreshed again during final review remediation. Realtime
Fabric and Gate `origin/main` remain exactly at their existing pins. Forge
`origin/main` advanced to `0135946cec589c1059a9f82ac373c7cb6c12e387`
through deployment-secret and workspace-JWKS changes; none of the four hashed
provisioning contract files changed, so the revision pin advanced while their
content hashes remained stable.

The first aggregate test attempt correctly rejected a 332 MB ignored Android
build directory left by earlier Tauri device work. It contained no tracked or
authored source and was moved to the user's Trash for recovery. The same test
gate then passed, and generated A2A/React receipts were restored to their
checked-in bytes afterward.

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
