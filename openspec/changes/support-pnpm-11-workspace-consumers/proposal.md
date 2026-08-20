# Proposal: support pnpm 11 workspace consumers

## Why

The published React package is consumed as a git submodule by Universal Agent
Runtime, whose pinned package manager is pnpm 11.15.0. The entity-management
root currently rejects that supported consumer before any package command can
run because its `engines.pnpm` range excludes pnpm 11.

## What Changes

- Widen the root, website workspace, public documentation, and release
  compatibility contract to accept pnpm 10.33 through pnpm 11.
- Keep pnpm 10.33.0 as this repository's reproducible default toolchain.
- Add a contract check proving the UAR-selected pnpm 11.15.0 satisfies the
  declared range.

## Impact

This changes package-manager admission only. It does not change package APIs,
runtime dependencies, the lockfile format, or the repository's pinned default.
