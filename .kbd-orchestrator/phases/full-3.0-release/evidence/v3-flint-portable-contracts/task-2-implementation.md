# Task 2 implementation — `v3-flint-portable-contracts`

Date: 2026-08-04

## Delivered boundary

- Replaced the default `flint-live.test.ts` workstation-path/skip behavior with
  a checked, repository-owned contract fixture pinned to Flint Realtime Fabric
  revision `cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89`.
- Added an always-running portable round trip through the current
  `watchEntities`/`mutateEntity` wire shape, the Prometheus Flint adapter, the
  realtime manager, and the normalized graph.
- Isolated the real sibling SDK in `flint-live.integration.test.ts`, excluded it
  from the default Vitest surface, and gave it a dedicated config and root
  `pnpm test:flint-live` entry point.
- Made the real lane fail closed when its external root, built SDK files,
  `RealtimeAdapter` export, or `ENTITY_CHANGE` value is missing or incompatible.
  It contains no skip branch and no caught import failure.
- Added the manual-only `flint-live-contract.yml` workflow. It accepts only an
  exact 40-character commit SHA, verifies the resolved checkout, installs both
  workspaces from frozen lockfiles, builds the two Flint SDK packages, and runs
  the dedicated contract.
- Kept the public `FlintClientLike`, `createFlintAdapter`, and
  `publishFlintMutation` API unchanged. The fixture is test-only and is not
  exported by the package entry point.

## Architecture and security boundary

Default CI no longer depends on a sibling checkout or machine-specific path.
The explicit live lane is the only surface that consumes external SDK build
artifacts. Its workflow ref and runtime filesystem root are actual external
input/tool boundaries, so they are validated before import: mutable refs,
mismatched checkouts, absent builds, missing exports, and event-kind drift stop
the lane rather than producing green evidence.

No client example or publishable package contains a service-role credential,
Flint secret, sibling path, or new Flint runtime dependency. Role, issuer,
tenant, `kid`, JWKS, key-separation, RLS, and provisioning verification remain
the explicit task-3 and task-4 boundary; this task does not claim them.

## Scoped verification

| Check | Result |
| --- | --- |
| Core package TypeScript check | Pass |
| Focused ESLint over all touched TypeScript/config files | Pass, zero warnings |
| Portable checked contract | Pass, 2/2 tests |
| Default Vitest discovery | Pass; portable tests discovered, live integration absent |
| Missing `FLINT_REALTIME_FABRIC_ROOT` | Expected nonzero exit with required-root error; no silent success |
| Pinned real SDK from detached temporary worktree | Pass, 1/1 test after frozen install and both SDK builds |
| `actionlint .github/workflows/flint-live-contract.yml` | Pass |
| `git diff --check` | Pass |

The first TypeScript check observed that a Node-only `.integration.ts` file was
inside the core browser-oriented source include. The file was corrected to an
explicit `.integration.test.ts` name and excluded only from default Vitest;
the dedicated live config still discovers and executes it. The repeated core
typecheck then passed.

The positive real-SDK check used a detached temporary worktree at the pinned
Flint revision and removed it after execution. No Flint branch or source file
was changed.

Signed revision 134 records task 2 complete with both after-hooks successful.
The transition reproduced the known parent-status reset; a fresh typed command
restored `v3-flint-portable-contracts` to `in_progress` at revision 135 without
editing a generated projection.

## Remaining change work

- Task 3 owns deterministic security/realtime/provisioning tests and negative
  regressions for every final acceptance criterion.
- Task 4 owns coverage, public ledgers, skills, and complete operational docs,
  including Forge semantics and the strict-JWK caveat.
- Task 5 owns full clean-state repository and workflow gates.
- Task 6 owns final evidence reconciliation, QA, isolated review, promotion,
  and archive.

Remote `main` remains the frozen React `3.0.0-rc.1` source at
`1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. This task does not mutate npm,
`next`, `latest`, or any registry.
