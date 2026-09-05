# C9 — Release readiness (gates green; publish not yet run)

**Status** gates complete · publish awaiting authorisation · **Date** 2026-09-04

## Scope change: C6 dropped

react-table stays `^8.21.3`. v9 changes `ColumnDef<T>` to
`ColumnDef<TFeatures, TData, TValue>`, which breaks every consumer's column
definitions and cannot ship under a minor. Deferred to its own 4.0.0 phase.

## Pre-existing failures — fixed, with root causes

### 1. Vitest alias dropped every subpath import

`packages/entity-graph-react/vitest.config.ts` mapped only the bare specifier:

```js
alias: { "@prometheus-ags/entity-graph-core": ".../src/index.ts" }
```

Vite applies a **prefix replacement**, so
`@prometheus-ags/entity-graph-core/devtools` rewrote to
`.../src/index.ts/devtools` — a path that cannot exist. Two suites failed to
load, and their tests never ran.

Fixed with the array form, subpath entry first. **13/13 files, 72/72 tests.**
The count rose from 52 because 20 tests in the two dead suites now execute —
they had never run, not merely failed.

The same latent bug was found in `examples/nextjs-app/vitest.config.mts`, which
dynamically imports the devtools subpath. Fixed there too. Two other example
configs share the pattern but import no subpath; left alone rather than changed
without evidence.

### 2. A `node:test` suite swept into Vitest

`examples/nextjs-app/src/lib/server/request-isolation.test.ts` is a `node:test`
file with its own script (`test:ssr-isolation`) — the Vitest `include` glob
caught it, producing "No test suite found". Excluded from Vitest.

Verified it still passes under its own runner (**4/4**) rather than assuming an
excluded test is a healthy one.

## Rename completion

- **61 source files** across `examples/`, `extension/`, `website/` migrated to
  `@prometheus-ags/entity-graph-react`. Subpath replacements ordered first so
  the bare replacement could not corrupt them.
- **16 scripts + 3 release tests** updated. `public-packages.mjs` and
  `publish-stable-3.0.0.sh` deliberately excluded — the first legitimately names
  the alias, the second is a historical record.
- **11 `--filter` targets** in the root `package.json` repointed.
- 4 docs updated. `website/CHANGELOG.md` and `website/static/api/**` left alone:
  the first is history that correctly names the package as it was at `@3.1.0`,
  the second is generated TypeDoc output.

`verify-binding-singletons.mjs` crashed with `Cannot read properties of
undefined (reading 'manifest')` — its binding table paired
`directory: "entity-graph-react"` with the old package name, which is the exact
mismatch this whole phase exists to remove.

## Count assertions raised, not loosened

Adding a thirteenth package tripped five hardcoded counts. Each was raised to
the new exact value, so the next unplanned package addition fails the same way:

| Location | Was | Now |
|---|---|---|
| `release/v3-release-contract.schema.json` min/maxItems | 16 | 17 |
| `validate-v3-release-contract.mjs:351-352` | 16 / 12 | 17 / 13 |
| `v3-release-contract.test.mjs:27,28,189` | 16 / 12 | 17 / 13 |
| `v3-package-module-contracts.test.mjs:33-35` | "twelve" / 12 | "thirteen" / 13 |
| `examples/coverage.json` | 10 capability lists | + `npm-react-alias` |

## Gate results — observed

```
pnpm run typecheck                    → Tasks: 27 successful, 27 total
pnpm --filter …/entity-graph-react test → 13 files passed, 72 tests passed
examples/nextjs-app vitest            → 3 files passed, 4 tests passed
nextjs test:ssr-isolation             → pass 4, fail 0
entity_graph_flutter flutter test     → All tests passed! (73)

pnpm run validate:release-contract    → errors: [], 17 artifacts, 13 npm
pnpm run verify:package-contracts     → PASS: 13 tarballs; ESM, CJS,
                                        NodeNext, Node16, Bundler
node verify-no-workspace-leak --local → All 13 packed packages free of workspace:
pnpm run verify:binding-singletons    → PASS: 6 packed bindings
pnpm run verify:skills                → OK (incl. Flutter 97 root + 104 devtools)
pnpm run test:release-contract        → pass 17, fail 0
pnpm run test:package-contracts       → pass 10, fail 0
pnpm run test:binding-singletons      → pass 5, fail 0
pnpm run test:framework-neutral-core  → pass 4, fail 0
pnpm run verify:example-coverage      → errors: []
pnpm run validate                     → both steps errors: [], 0 failures
```

## NOT yet done — the irreversible part

Steps 1-3 and 6-9 of the plan's C9 have **not** run: no changeset, no version
bump, no publish. The working tree is at 3.2.0 with every gate green.

Publishing requires `pnpm publish`, never `npm publish` — the 3.0.0 run used
npm, which does not rewrite `workspace:` specifiers, and shipped ten
uninstallable packages. The local leak check passes; the registry check must
run again *after* publish.

---

# PUBLISHED — 4.0.0 (2026-09-05)

## Version: 4.0.0, not 3.3.0

The release became a major for a stated reason rather than an unexplained one.

**ESM-only across all 13 packages.** `@tanstack/react-table` v9 ships ESM-only
(`"type": "module"`, one `exports` entry, no CJS build). A CommonJS declaration
file cannot `require` an ESM dependency's types — TS1479 — so the React binding
could not both re-export v9's types and ship a `.d.cts`. Rather than special-case
one package, the whole workspace moved. That breaks CommonJS consumers, and a
breaking change is a major.

This also resolved the earlier mystery: `changeset version` had been producing
4.0.0 from a `minor` changeset, reproducibly, even against pristine config. With
the change declared as `major` the version is now intentional.

## Verified on the registry

```
all 13 npm packages                    4.0.0, latest tag correct
entity_graph_flutter (pub.dev)         4.0.0 uploaded
verify-no-workspace-leak 4.0.0         all 13 free of workspace: protocol
alias dependency ^4.0.0                resolves to entity-graph-react@4.0.0
published entrypoint shape             "type": "module", no require condition,
                                       all 3 entrypoints present
npm deprecate on the alias             live, points at entity-graph-react
```

## A false alarm worth recording

`entity-graph-react` returned **404** immediately after publish, and was reported
as a failed publish that left the alias uninstallable. It had in fact published —
the 404 was registry propagation lag on a **brand-new package name**. The
operator's `EPUBLISHCONFLICT` ("cannot publish over previously published 4.0.0")
was the evidence that settled it.

For a new package name, wait and re-query before concluding a publish failed.

## react-table v9 landed after all

The earlier deferral was based on a wrong premise: planning verified that
`ColumnDef` still *existed* in v9 but not its *arity*. It widened from
`ColumnDef<TData, TValue>` to `ColumnDef<TFeatures, TData, TValue>`.

`EntityColumnDef<T>` supplies `TFeatures` on the consumer's behalf, so consumer
column definitions compile unchanged — asserted by a type-level test using a
hand-written v8-shaped literal. Migration used explicit `tableFeatures`, never
`stockFeatures`.

## Two stale gates found by checking, not trusting

1. `verify:binding-singletons` built a deliberately-incompatible fake core
   pinned at a literal `4.0.0`. Once the real packages reached 4.0.0 the fake
   became compatible and the negative test could no longer fail — it reported
   success by installing successfully. Now derived from the real core's major.
2. `validate-v3-release-contract.mjs` hardcoded `major !== 3`. Now derived from
   the contract's own `versionPolicy`.

Both were silent failures: a gate that cannot fail is decorative.

## Flutter publish notes

pub.dev flagged the exact runtime pins as too tight. They were loosened to caret
ranges — correct for a library, where an exact pin forces one version on every
consumer. `dev_dependencies` stay exact, because the analyzer/codegen graph
genuinely is a coherent set. Re-verified after loosening: `flutter analyze` 4
pre-existing info hints, `flutter test` 73 passed.

The CHANGELOG did not mention 4.0.0 — a real omission pub.dev caught. Fixed.
