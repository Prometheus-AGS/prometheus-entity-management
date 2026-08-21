# Design: support pnpm 11 workspace consumers

## Decision

Use the semver range `>=10.33.0 <12` in the root and website manifests, the v3
release contract, and public compatibility documentation. Retain
`packageManager: pnpm@10.33.0` so local and release automation continue to
select the tested repository default. The package-manager integrity suffix must
match Corepack's clean-cache download; a locally cached binary is not evidence
that the suffix is valid.

The range is deliberately bounded below 12. The observed failure is pnpm 11
being rejected inside UAR's workspace; there is no evidence yet for pnpm 12.

## Verification

The existing v3 main-CI contract scenario will additionally require pnpm
11.15.0 to satisfy the declared compatibility range. UAR will then rerun its
pnpm 11 TypeScript checks with this repository checked out at the corrected
commit. A fresh `COREPACK_HOME` control will resolve the pinned pnpm 10.33.0 and
report its version before downstream certification is rerun.
