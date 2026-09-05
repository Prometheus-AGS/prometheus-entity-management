# C2 — Freeze the public table type surface

**Status** complete · **Date** 2026-09-04

## What changed

`EntityColumnDef<T>` is now the column type this package exposes. It aliases
TanStack's `ColumnDef<T>` today; the indirection means a future TanStack type
change becomes a decision recorded here rather than an automatic break at the
package boundary.

| File | Change |
|---|---|
| `src/ui/columns.tsx` | added `export type EntityColumnDef<T> = ColumnDef<T>` |
| `src/ui/columns.tsx` | 7 public builders now return `EntityColumnDef<T>` |
| `src/ui/entity-table.tsx` | `EntityTableProps.columns: EntityColumnDef<T>[]`; dropped the now-unused `ColumnDef` import |
| `src/index.ts` | `EntityColumnDef` exported publicly |
| `src/ui/column-type-surface.test-d.ts` | **new** — type-level regression guard |

`ColumnDef` remains exported for anyone importing it directly. This change is
additive.

## Surface was larger than the assessment found

The assessment named `EntityTableProps.columns` as the breaking surface. Reading
the source found **seven** public column builders — `selectionColumn`,
`textColumn`, `numberColumn`, `dateColumn`, `booleanColumn`, `enumColumn`,
`actionsColumn` — each returning `ColumnDef<T>` and each exported from the
package root. All seven were part of the exposed surface, not one prop.

## Verification — observed, not intended

```
pnpm --filter @prometheus-ags/prometheus-entity-management typecheck
  → EXIT=0, no diagnostics

pnpm --filter @prometheus-ags/prometheus-entity-management build
  → CJS build success 1515ms; DTS build success 6140ms
  → dist/index.d.ts 93.92 KB, dist/devtools.d.ts 45.91 KB,
    dist/devtools/auto.d.ts 498 B (+ .cts equivalents)

grep EntityColumnDef dist/index.d.ts
  → 11 occurrences; `type EntityColumnDef<T> = ColumnDef<T>` at line 1202
```

### The guard was proved to fail on a real break

A passing type test that cannot fail is worthless, so the guard was verified by
deliberately breaking it:

```
+ const mustFail: EntityColumnDef<Row> = { id: 1 };
→ src/ui/column-type-surface.test-d.ts(101,42):
  error TS2322: Type 'number' is not assignable to type 'string'.
```

The break was reverted and typecheck returned to EXIT=0. The guard is inside the
tsconfig program and does catch errors.

## Pre-existing test failures — not caused by this change

`pnpm test` reports **2 failed / 11 passed (13 files), 52 tests passed**:

- `src/schema-local-first.test.ts`
- `src/ui/entity-explorer/entity-explorer.test.tsx`
  — `Failed to resolve import "@prometheus-ags/entity-graph-core/devtools"`

Verified pre-existing by stashing all C2 edits and re-running on clean
`d1588d8c`: **identical** — same 2 files, same 11 passing. Not introduced here.

Left unfixed deliberately: out of scope for this change, and fixing it silently
would hide a real defect. Recorded for the phase reflection.

## Why this had to precede C6

Without the alias there is no way to distinguish "TanStack v9 changed our public
types" from "we changed our public types". C6 must leave this typecheck green;
that is the criterion which keeps the 3.3.0 minor honest.
