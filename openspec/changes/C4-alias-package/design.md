# C4 — Compatibility alias package

**Status** complete · **Date** 2026-09-04

## What was built

`packages/prometheus-entity-management/` — a new package publishing as
`@prometheus-ags/prometheus-entity-management`, re-exporting
`@prometheus-ags/entity-graph-react` verbatim across **all three** entrypoints.

| Entrypoint | Source | Built size |
|---|---|---|
| `.` | `src/index.ts` | `index.d.ts` 165 B |
| `./devtools` | `src/devtools/index.ts` | `devtools.d.ts` 61 B |
| `./devtools/auto` | `src/devtools/auto.ts` | `auto.d.ts` 66 B |

Thin forwarding shims, not a second copy of the binding — the source package
and React are all marked `external`.

Registered in all four registries; `validate:release-contract` raised to 17
artifacts / 13 npm packages.

## GAP-A — RESOLVED

The assessment flagged an unresolved risk: `PACKAGE_ENTRYPOINT_CONTRACT`
declares only the `.` entrypoint, while the alias needs three. Whether the
checker tolerated a superset was *suggestive, not proven*.

It does. Observed:

```
[package-contract] PASS: 13 tarballs; ESM, CommonJS, NodeNext, Node16,
                   and Bundler consumers.
[package-contract] Node ESM consumer passed
[package-contract] Node CommonJS consumer passed
node16 (from CJS) 🟢   node16 (from ESM) 🟢   bundler 🟢
[exited with code 0]
```

The harness packs real tarballs and resolves them as a consumer would,
including `are-the-types-wrong`. The three-entrypoint alias passes.

## A real defect the build caught

The first build emitted `dist/devtools/auto.mjs` as:

```js
export * from '@prometheus-ags/entity-graph-react/devtools/auto';
```

**The bare side-effect `import` had been tree-shaken away.** `devtools/auto` is
a side-effect entrypoint — importing it mounts the devtools host. Without that
import the entrypoint resolves, type-checks, packs, and *does nothing*.

`definePackageConfig` sets `treeshake: true`, which is correct for the real
packages: they have code that references their imports. A re-export shim does
not, so the import looks dead.

Fixed with `treeshake: false` in the alias's `tsup.config.ts`. Verified:

```js
// src/devtools/auto.ts
import "@prometheus-ags/entity-graph-react/devtools/auto";
export * from "@prometheus-ags/entity-graph-react/devtools/auto";
```

`sideEffects` in `package.json` marks the built output so a downstream bundler
does not repeat the mistake.

This is the failure mode the plan warned about — "an alias that re-exports only
`.` silently breaks every consumer importing `.../devtools`" — arriving by a
different route. Nothing in the contract check would have caught it: the
entrypoint exists and its types are correct. Only reading the emitted file did.

## `export *` is safe here

Verified there is **no default export** in any of the three source entrypoints
(`grep -c 'export default'` → 0 for each), so `export *` forwards the complete
surface. Had one existed, `export *` would have silently dropped it.

## Verification — observed

```
pnpm --filter @prometheus-ags/entity-graph-react build         → success, 3 entrypoints
pnpm --filter @prometheus-ags/prometheus-entity-management build → success, 3 entrypoints
pnpm run validate:release-contract                              → errors: []
pnpm run verify:package-contracts                               → PASS, 13 tarballs, exit 0
```

## Not yet done

`verify:no-workspace-leak --local` runs at C9 against packed tarballs, and again
against the registry after publish. The alias depends on
`@prometheus-ags/entity-graph-react: workspace:^`, so it is exactly the shape
that broke the 3.0.0 release when published with `npm publish` instead of
`pnpm publish`.
