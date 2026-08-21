# Corepack rejected the pinned pnpm integrity digest

## Observed failure

UAR operational-resilience run `32455231917` checked out entity-management
commit `0352c83` and invoked the repository's pinned pnpm 10.33.0 through
Corepack. A clean GitHub runner exited before installation with:

`Mismatch hashes. Expected ...b5a304..., got ...b5a544...`

## Root cause

The `packageManager` field contained an incorrect two-character substring in
its SHA-512 suffix. Existing local checks reused a cached pnpm binary, so they proved the
version was available but did not verify that Corepack could download and
authenticate it from an empty cache.

## Correction and control

The suffix now matches Corepack's observed pnpm 10.33.0 digest. With a fresh
`COREPACK_HOME` under Node 22, Corepack printed `10.33.0`; the frozen 18-project
install reported an unchanged lockfile; and the React package built ESM, CJS,
and declarations with tsup 8.5.1.

No published package file changed, so this tooling-receipt correction does not
create a new npm package version.
