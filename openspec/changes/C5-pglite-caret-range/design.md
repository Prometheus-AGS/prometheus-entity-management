# C5 — PGlite to a caret range on latest

**Status** complete · **Date** 2026-09-04

## What changed

| File | Before | After |
|---|---|---|
| `packages/entity-graph-core/package.json` (dev) | `"0.5.4"` | `"^0.5.8"` |
| `examples/vite-app/package.json` (dep) | `"0.5.4"` | `"^0.5.8"` |

## A second pin the assessment missed

The assessment named only the `entity-graph-core` devDependency. After changing
it, the store still held two versions:

```
find node_modules/.pnpm -maxdepth 1 -name '@electric-sql+pglite@*'
  → 0.5.4
  → 0.5.8
```

`examples/vite-app` carried its own **exact** pin at `0.5.4`. Leaving it would
have meant the example app and the library it demonstrates running different
PGlite versions — precisely the drift a caret range is meant to end. Aligned to
`^0.5.8` under G7's audit.

## Verification — observed, not requested

```
lockfile specifiers   → ^0.5.8  (uniform; no other specifier remains)
lockfile version      → 0.5.8   (single resolved version)
grep 'pglite@0.5.4' pnpm-lock.yaml → 0 matches
core's linked copy    → 0.5.8

pnpm --filter @prometheus-ags/entity-graph-core exec vitest run \
  src/adapters/pglite-persistence.integration.test.ts
  → Test Files  1 passed (1)
  → Tests       1 passed (1)
  → exit 0
```

A `0.5.4` directory survives in the pnpm content-addressable store. It is an
unpruned cache entry, not a live dependency: the lockfile references it zero
times and every consumer links `0.5.8`. Recorded rather than glossed, because
"two versions in the store" looks alarming until you check what references them.

## Why this change mattered most to the parent

`web-ui-architecture` selected **ElectricSQL 1.8.0** as its Postgres→PGlite sync
engine, and `src/adapters/pglite-persistence.ts` is that path. This is the one
change in the phase the consuming application depends on directly, which is why
it was ordered early — a failure here was worth discovering before the expensive
work.
