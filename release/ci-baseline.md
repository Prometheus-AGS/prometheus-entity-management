# 3.0 main CI baseline

The `v3-main-ci-baseline` quality gate makes the JavaScript monorepo reproducible from the checked-in repository. It is implemented release evidence, but it is not complete 3.0 certification and does not authorize registry publication.

## What the baseline proves

- `pnpm-lock.yaml` at the repository root is the only JavaScript workspace lockfile.
- Installation uses pnpm 10.33 and `pnpm install --frozen-lockfile`; an external sibling checkout cannot satisfy a workspace dependency.
- CI executes the supported Node 22, 24, and 26 lines.
- Validation, lint, typecheck, build, tests, skills/export synchronization, and production advisory policy are named gates with finite timeouts.
- A failed or timed-out gate identifies its gate and command instead of leaving an unbounded build.
- Every active critical/high production advisory is remediated or requires an owner, rationale, and unexpired acceptance. Lower severities remain visible.
- Direct dependencies are compatible-current or recorded as intentional holds in [`dependency-policy.json`](dependency-policy.json).

The BDD and evidence mapping is recorded under `release.ci.hermetic-main-baseline` in [`examples/coverage.json`](../examples/coverage.json).

## Run it locally

From the repository root:

```bash
corepack prepare pnpm@10.33.0 --activate
pnpm install --frozen-lockfile
pnpm run ci
```

Individual gates can be run without changing their CI behavior:

| Gate | Command | Default timeout |
| --- | --- | ---: |
| Release contract | `pnpm run ci:validate` | 5 minutes |
| Lint | `pnpm run ci:lint` | 5 minutes |
| Typecheck | `pnpm run ci:typecheck` | 10 minutes |
| Build | `pnpm run ci:build` | 15 minutes |
| Tests and BDD | `pnpm run ci:test` | 10 minutes |
| Skills/export ledger | `pnpm run ci:skills` | 5 minutes |
| Production audit policy | `pnpm run ci:security` | 5 minutes |

`CI_GATE_TIMEOUT_MS` may override one invocation with a positive integer number of milliseconds. Zero, negative, fractional, empty, and nonnumeric values fail before the gate starts.

## Dependency and advisory decisions

[`dependency-policy.json`](dependency-policy.json) records the direct dependencies intentionally held below registry latest, the selected and observed-latest versions, a substantive compatibility rationale, and the owning v3 change that must revisit each hold.

[`security/advisory-policy.json`](../security/advisory-policy.json) records remediated advisory groups and any temporary acceptances. An acceptance is not a suppression: it must match an active advisory and contain an owner, rationale, and valid future expiry. Stale, incomplete, malformed, or expired entries fail CI.

Root pnpm overrides select patched PostCSS and Sharp releases because Next.js 16.2.12 still declares vulnerable transitive versions. Both upgraded example production builds are exercised before this baseline is accepted.

## What remains unproven

This baseline does not certify packed npm consumers, Dart/Flutter, Rust/Tauri targets, all five showcase applications, the Docusaurus/GitHub Pages site, an immutable release SHA, registry credentials, or npm `latest` promotion. Those remain assigned to later changes in the 3.0 plan. The release stays **in progress** until `v3-release-certification` and `v3-stable-publication` provide their required evidence and approvals.
