# Recoverable 3.0 release-candidate pipeline

The `v3-release-pipeline-rc` gate implements a contract-derived candidate
manifest, dependency-ordered package rehearsal, strict packed consumers, and a
restartable RC staging path. It is an implemented release-engineering boundary,
not a statement that 3.0.0 is published or ready for npm's `latest` tag.

## What is derived and verified

`release/v3-release-contract.json` is the artifact authority. The pipeline
selects all sixteen declared artifacts, excludes the private workspace root,
and topologically orders the twelve npm packages so shared prerequisites are
handled before their consumers. The candidate manifest records one source SHA,
candidate channel, package order, native dispositions, and a fail-closed
publication policy.

Run the non-mutating certification boundary with:

```bash
pnpm run test:release-pipeline
pnpm run bdd:release-pipeline
pnpm run verify:release-pipeline
```

`pnpm run verify:release-pipeline` rebuilds and packs all twelve npm candidates,
installs only those tarballs into isolated ESM, CommonJS, TypeScript NodeNext,
Node16, and Bundler consumers, validates the workflow, and writes JSON plus SVG
evidence. It performs no registry mutation.

## Candidate planning and rehearsal

All twelve fixed-group npm manifests must use a numbered RC version matching
`3.0.0-rc.N`. Changesets prerelease mode owns that transition. Alpha versions,
unnumbered `-rc`, mixed fixed-group versions, and other prerelease channels fail
before a candidate manifest is emitted. The current local candidate is
`3.0.0-rc.1`; this version string alone does not authorize publication.

Use an immutable 40-character source SHA and an explicit UTC timestamp:

```bash
pnpm run release:rc:plan \
  --source-sha <immutable-git-sha> \
  --created-at <utc-timestamp> \
  --output .release-candidate/manifest.json

pnpm run release:rc:rehearse \
  --source-sha <same-immutable-git-sha> \
  --created-at <same-utc-timestamp> \
  --output-dir .release-candidate
```

The rehearsal snapshots protected tags, packs npm candidates, runs
`npm publish --dry-run --tag next`, and records native dry runs. Dart is
`dry-run-only`; the standalone Rust CLI and MCP crates are `dry-run-only`; the
Tauri Rust crate is `embedded-in-npm`. These dispositions do not imply pub.dev
or crates.io ownership.

## Authorized RC staging

The mutating `pnpm run release:rc:stage` command is intentionally unusable as a
normal local command. It requires GitHub Actions OIDC, the protected `npm-rc`
environment, an authorized candidate SHA equal to the manifest SHA, explicit
`stage-rc` authority, and the absence of a long-lived npm write token. The
stage job uses `actions/setup-node@v7`, whose removal of the v6 dummy
`NODE_AUTH_TOKEN` fallback keeps the OIDC-only boundary observable. It can
target only the `next` channel through npm's staging operation.

### Register the exact npm authority

The checked-in [`npm-trusted-publishing.json`](npm-trusted-publishing.json)
manifest is the secret-free authority contract for all twelve packages. It
allows only `npm stage publish` from repository
`Prometheus-AGS/prometheus-entity-management`, workflow filename `publish.yml`,
and GitHub environment `npm-rc`. Direct `npm publish` authority is forbidden.

An npm maintainer must establish this relationship from an interactive terminal:

```bash
npm login --auth-type=web
pnpm run release:npm-trust:register
pnpm run release:npm-trust:verify
```

The account must have package write access and 2FA enabled. Registration pauses
two seconds between packages as recommended by npm and then reads every
relationship back with `npm trust list`. The verifier rejects inventory drift,
an incorrect repository/workflow/environment, missing stage authority, direct
publish authority, or extra permissions. It also rejects `NPM_TOKEN` and
`NODE_AUTH_TOKEN`; neither command accepts or prints registry credentials.

The stage workflow configures the public registry through
`NPM_CONFIG_REGISTRY`, not setup-node's token-shaped npmrc helper. The workflow
therefore presents only its GitHub OIDC identity to npm.

For a candidate already certified by a successful rehearsal job, dispatch
`publish.yml` in `stage` mode with both `candidate_run_id` and `candidate_sha`.
The rehearsal job is skipped, and the protected stage downloads the immutable
artifact from that exact run with read-only Actions permission. Its artifact
name and manifest must both match `candidate_sha`. Before download, the stage
also verifies that the run belongs to this workflow, completed at the selected
SHA, contains a successful `rehearse` job, and still owns the named unexpired
artifact. Omitting either input falls back to a fresh rehearsal in the current
run; candidate inputs are never mixed with current-run values.

Before any registry read, the stage state machine validates protected
GitHub/OIDC authority and the CLI validates the rehearsal as one closed
proof: schema, source SHA, candidate version, dist-tag, dependency order,
protected-tag snapshots, all seven journal states for every npm artifact,
tarball paths and integrity, npm dry-run receipts, native dry-run receipts, and
embedded-native dispositions must exactly match the manifest. Missing, extra,
reordered, incomplete, or internally inconsistent evidence fails closed.

Repository code cannot prove that npm trusted-publisher configuration or GitHub
environment reviewers are configured. Those remain external operator checks.
The checked-in workflow also does not automate the human approval required for
stable promotion.

## Restart and partial-publication recovery

The journal moves each npm artifact through `declared`, `packed`, `verified`,
`classified`, `submitted`, `registry-verified`, and `complete`. On restart:

- rehearsal records tarballs as bundle-relative `packages/*.tgz` paths, and the
  stage job resolves them inside the downloaded candidate artifact rather than
  reusing runner-absolute paths from the rehearsal workspace;
- a retry may reuse an existing successful rehearsal run by explicit run ID and
  source SHA, avoiding duplicate full CI while retaining the same manifest,
  integrity, protected-tag, and OIDC checks;
- absolute paths and traversal outside the downloaded bundle fail closed;
- matching immutable version and integrity: skip and record;
- absent version: stage in dependency order;
- conflicting immutable version or integrity: block;
- already published but incorrect artifact: publish a corrective version;
  never overwrite an immutable registry version.

The stage CLI rewrites its recovery report after every confirmed transition and
before each mutating stage attempt. If a later package fails, the report exits
with `status: failed`, preserves every completed package, and records the last
attempt conservatively even when npm returned no usable response. The workflow
uploads this report with `always()` so a nonzero stage exit cannot discard it.

For an absent version, `npm stage publish --json` must return the exact package
name and version, the rehearsed tarball integrity, and a registry-issued stage
UUID. The journal records that registry response as its verification authority;
missing or mismatched fields block completion. For an already-public matching
version, the exact npm registry lookup remains the verification authority.
OIDC trust tokens are deliberately not broadened to run `npm stage view` or
other stage-management subcommands.

The pipeline compares protected npm tags before and after every rehearsal or RC
staging run. A changed or incomplete snapshot fails closed.

## Explicit release boundary

This gate does not authorize npm `latest`, a GitHub Release, the production
documentation deployment, pub.dev/crates.io publication, or stable 3.0.0. The
remaining `v3-release-certification` and `v3-stable-publication` changes own the
immutable release-wide evidence set, explicit human authority, post-publication
verification, and stable promotion.
