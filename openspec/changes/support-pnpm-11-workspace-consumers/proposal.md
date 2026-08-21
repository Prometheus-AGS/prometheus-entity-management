# Proposal: support pnpm 11 workspace consumers

## Why

The published React package is consumed as a git submodule by Universal Agent
Runtime, whose pinned package manager is pnpm 11.15.0. The entity-management
root currently rejects that supported consumer before any package command can
run because its `engines.pnpm` range excludes pnpm 11.

## What Changes

- Widen the root, website workspace, public documentation, and release
  compatibility contract to accept pnpm 10.33 through pnpm 11.
- Keep pnpm 10.33.0 as this repository's reproducible default toolchain and
  correct its Corepack integrity digest.
- Declare the same supported range through pnpm 11's
  `devEngines.packageManager` contract so nested consumer tasks can run with
  the consumer's admitted pnpm version.
- Add a contract check proving the UAR-selected pnpm 11.15.0 satisfies the
  declared range.

## Impact

This changes package-manager admission and the private workspace toolchain
receipt only. It does not change package APIs, published package contents,
runtime dependencies, the lockfile version, the application dependency graph,
or the repository's pinned default.
The lockfile gains only pnpm's package-manager resolution receipt; its
application dependency graph is unchanged.
