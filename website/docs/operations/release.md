---
title: RC publication and recovery
sidebar_position: 6
---

# Stage 3.0.0-rc.1 without a write token

> **Status:** the 4.x line is current. Stable `4.1.0` holds `latest` and `next` on all
> thirteen npm packages (published 2026-10-07). The 3.0 line is complete: `3.2.0` was its last stable (published 2026-08-30; the short-lived `3.0.0` stable
> manifests shipped an unresolved `workspace:` protocol, and `3.0.4` shipped
> stale build artifacts; both are deprecated).
> This page remains the runbook for staging future release candidates.

## Current registry state

The stage-only trust relationships are configured for all twelve npm packages.
The immutable candidate was staged in GitHub Actions run
[`31082488746`](https://github.com/Prometheus-AGS/prometheus-entity-management/actions/runs/31082488746).

<!-- BEGIN GENERATED:NPM_REGISTRY_STATUS -->
Registry snapshot: 2026-10-08T10:34:51.000Z. Expected candidate: `4.1.0`.

| Package | `latest` | `alpha` | `next` | Release state |
| --- | --- | --- | --- | --- |
| `@prometheus-ags/entity-graph-core` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-react` | `4.1.0` | `absent` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-sdl` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-solid` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-svelte` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-sync` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-tauri` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-web-components` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/prometheus-entity-management` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/a2ui-react` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-a2a` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-alpine` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
| `@prometheus-ags/entity-graph-htmx` | `4.1.0` | `3.0.0-alpha.0` | `4.1.0` | published |
<!-- END GENERATED:NPM_REGISTRY_STATUS -->

<!-- BEGIN GENERATED:PUBDEV_REGISTRY_STATUS -->
pub.dev snapshot: 2026-10-08T10:38:40.000Z.

| Package | Version | State | Published |
| --- | --- | --- | --- |
| [`entity_graph_flutter`](https://pub.dev/packages/entity_graph_flutter) | `4.0.0` | published | 2026-09-05T13:06:03.642746Z |

The published archive passed a clean consumer resolution, import, and analyzer check.
pub.dev does not yet associate the package with a verified publisher.
<!-- END GENERATED:PUBDEV_REGISTRY_STATUS -->

The rc.1 stage completed and stable `3.2.0` then held `latest` on all twelve
packages (superseded by `4.1.0` on all thirteen); stale-artifact `3.0.4` is deprecated. The historical stage run below is kept for reference; do not rerun
staging for versions that are already immutable on the registry.

The release candidate workflow separates a non-mutating rehearsal from a
protected stage operation. Rehearsal builds and packs the fixed artifact set,
installs tarball-only consumers, snapshots protected tags, records integrity,
and attests the candidate bundle. Staging reuses that immutable bundle and may
invoke only `npm stage publish` on `next`.

## Register authority

```bash
npm login --auth-type=web
pnpm run release:npm-trust:register
pnpm run release:npm-trust:verify
```

The maintainer needs package write access and account 2FA. The exact
relationship is GitHub repository `Prometheus-AGS/prometheus-entity-management`,
workflow filename `publish.yml`, environment `npm-rc`, stage publish allowed,
direct publish forbidden. Registration is an interactive human operation;
agents and CI never receive credentials.

## Reuse the candidate

While the artifact is live, dispatch `publish.yml` in `stage` mode with run
`30976967778` and SHA
`afbb8de0e861739fa6facb461b69573b2a627bdb`. Approve the GitHub environment,
then approve any remaining npm staged packages with 2FA in manifest dependency
order. Matching immutable published versions are skipped on a safe retry.

## Verify and recover

Final npm acceptance requires every package to expose `3.0.0-rc.1` on `next`,
the intentionally moved React `latest` tag to remain on the RC, all other
protected `latest` tags to remain unchanged, provenance and SRI to match the candidate manifest, and clean
pnpm consumers install core, React, and integration packages. A matching
immutable version is recorded and skipped on retry; an absent version is
staged; a conflicting version blocks. Never overwrite or silently replace
`rc.1`. Only a proven immutable conflict justifies a separately certified
`rc.2`.
