# C6 — react-table v8 → v9

**Status** BLOCKED — attempted, rolled back, awaiting a version decision
**Date** 2026-09-04

## Outcome

The migration was attempted properly (explicit `tableFeatures`, no
`stockFeatures`) and **rolled back**. `@tanstack/react-table` remains `^8.21.3`.
Working tree is green: typecheck EXIT=0, build success, every lockfile
specifier `^8.21.3`.

## What was tried

`entity-table.tsx`:

```ts
const entityTableFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  sortedRowModel: createSortedRowModel(sortFns),
});

const table = useTable({ _features: entityTableFeatures, data, columns, … });
```

`columns.tsx` — augmentation retargeted to `@tanstack/table-core` with the new
`TFeatures` parameter.

## Result: 23 errors

```
14 × TS7031  implicit any on every cell/header callback binding
 3 × TS2345  RowData[] not assignable to T[]
 1 × TS2707  Generic type 'ColumnDef' requires between 2 and 3 type arguments
 1 × TS2664  module '@tanstack/table-core' cannot be found (augmentation target)
 1 × TS2554  Expected 0 arguments, but got 1
 1 × TS2339, 1 × TS2322
 1 × TS2305  '@tanstack/react-table' has no exported member 'VisibilityState'
```

## The finding that blocks it — and a correction

Read from the shipped `@tanstack/table-core@9.2.4` declarations:

```ts
type ColumnDef<TFeatures extends TableFeatures, TData extends RowData, TValue extends CellData …>
interface ColumnMeta<in out TFeatures extends TableFeatures, in out TData extends RowData, TValue …>
```

**This corrects the plan.** Planning concluded GAP-C was resolved and the
release could stay 3.3.0 because "`ColumnDef` still exists in v9, re-exported
from `@tanstack/table-core`". It exists — but not with a compatible shape.
`ColumnDef<T>` is now `ColumnDef<TFeatures, TData, TValue>`, and `TFeatures`
threads through every column, cell, header and row type.

Existence was verified; **arity was not**. That is the error, and it is the same
class of mistake the phase exists to prevent: a name that resolves is not an API
that fits.

`EntityColumnDef<T> = ColumnDef<T>` therefore cannot survive. Seven public
builders and `EntityTableProps.columns` use it, so **every consumer's column
definitions break** — under what G2 specifies as a *minor* bump.

## Why C2 was still correct

C2 concentrated the break into one alias instead of seven scattered signatures.
Without it this would have surfaced as seven separate public-API breaks
discovered one at a time. The type guard failed exactly where it should.

## Three options, none of which this change may choose alone

1. **Stay on v8; ship 3.3.0.** C1–C5 are done and green. v9 becomes its own
   phase. Cost: react-table stays a major behind.
2. **Take v9 as 4.0.0.** Honest semver for a breaking public type change. Cost:
   a major release for what began as a naming fix; consumers rewrite columns.
3. **Take v9, absorb the break behind `EntityColumnDef`.** Cost unknown — the 14
   implicit-`any` errors suggest callback context types need real design work,
   not a mechanical fix.

## Process note

`git checkout` on the two files also reverted **C2's completed work**. Caught and
restored (alias, seven builders, `EntityTableProps`, type guard), and re-verified
green. Recorded because verified work was nearly lost to a careless revert — a
targeted revert should name only the files that change belongs to.
