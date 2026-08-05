---
title: RC publication and recovery
sidebar_position: 6
---

# Stage 3.0.0-rc.1 without a write token

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
then approve all twelve npm staged packages with 2FA in manifest dependency
order.

## Verify and recover

Confirm every package exposes `3.0.0-rc.1` on `next`, all protected `latest`
tags are unchanged, provenance and SRI match the candidate manifest, and clean
pnpm consumers install core, React, and integration packages. A matching
immutable version is recorded and skipped on retry; an absent version is
staged; a conflicting version blocks. Never overwrite or silently replace
`rc.1`. Only a proven immutable conflict justifies a separately certified
`rc.2`.
