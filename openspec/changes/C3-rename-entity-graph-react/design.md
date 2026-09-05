# C3 — New `entity-graph-react` package name

**Status** complete · **Date** 2026-09-04

## What changed

`packages/entity-graph-react/` now publishes as
`@prometheus-ags/entity-graph-react`. Its `directory` and `name` agree for the
first time, matching every other framework binding in the workspace.

| Registry | Change |
|---|---|
| `packages/entity-graph-react/package.json` | `name` + `homepage` |
| `scripts/public-packages.mjs` | `PUBLIC_PACKAGES[]` entry |
| `release/v3-release-contract.json` | `artifacts[].id=npm-react` `packageName`, and `versionPolicy.npm.packages[]` |
| `.changeset/config.json` | `fixed[0][]` lockstep group |

Plus **8 dependent manifests** repointed from the old name to the new one, all
declared `workspace:*`:

```
examples/agentic-a2ui-app   examples/agentic-a2ui   examples/nextjs-app
examples/tauri-app          examples/tauri-universal examples/vite-app
extension                   website
```

Internal consumers point at the **real package**, not the alias. The alias
(C4) exists for external consumers who installed the old name.

`grep` for the old name across all `package.json` files returns nothing.

## Verification — observed

```
pnpm install                          → exit 0
pnpm run validate:release-contract     → errors: [], release 3.2.0
```

## The gate caught a real error, and that is worth recording

Adding the C4 alias to the contract initially failed:

```
schema /artifacts must NOT have more than 16 items
contract must declare exactly 16 artifacts; found 17
contract must declare exactly 12 npm packages; found 13
```

The package count is asserted in **two** places — a JSON-Schema
`minItems`/`maxItems` pair in `release/v3-release-contract.schema.json`, and a
pair of hard-coded equality checks at
`scripts/validate-v3-release-contract.mjs:351-352`. Both were updated to 17/13.

This is the contract behaving correctly: adding a published package is exactly
the kind of change that should not pass silently. The counts were raised
deliberately, not loosened — they remain exact equality assertions, so the next
unplanned package addition fails the same way.

## Deliberately not done here

The ~348 remaining references in docs, tests, and generated artifacts still name
the old package. That is **correct until C4 lands**: the alias keeps the old
name resolving, so those references are not yet wrong. C9 sweeps them.
