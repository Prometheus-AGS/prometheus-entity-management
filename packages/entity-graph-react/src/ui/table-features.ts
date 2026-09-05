/**
 * ui/table-features.ts
 *
 * The TanStack Table v9 feature set used by `EntityTable`.
 *
 * v9 requires an explicit feature set — v8's implicit "every feature is
 * present" is gone, and that is the point: unused features tree-shake out.
 * The set is declared once, at module scope, because its *type* parameterises
 * every column, cell, header and row type in v9, and its *identity* feeds the
 * table instance.
 *
 * Only what `EntityTable` actually uses:
 *   - sorting            synced to `useEntityView`
 *   - row selection      bulk actions
 *   - column visibility  the column toggle
 *
 * The core row model is automatic in v9 and is deliberately not listed.
 *
 * `stockFeatures` would restore v8 behaviour in one line. It is not used —
 * TanStack documents it as "a migration shortcut, not the preferred production
 * end state", and taking it would forfeit the bundle-size win that is most of
 * the reason to be on v9.
 */
import {
  tableFeatures,
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  columnSizingFeature,
  createSortedRowModel,
} from "@tanstack/react-table";

export const entityTableFeatures = tableFeatures({
  rowSortingFeature,
  rowSelectionFeature,
  columnVisibilityFeature,
  // v9 registers row models as feature slots rather than table options.
  sortedRowModel: createSortedRowModel(),
  // Every public column builder sets `size`, and in v9 that property lives
  // behind the column-sizing feature rather than on the base column def.
  columnSizingFeature,
});

/**
 * The feature set's *type*, used to parameterise the public column types.
 *
 * Consumers never write this. It exists so `EntityColumnDef<T>` can stay a
 * one-parameter type across the v8 to v9 upgrade: v9 widened `ColumnDef` to
 * `ColumnDef<TFeatures, TData, TValue>`, and this supplies `TFeatures` on the
 * consumer's behalf.
 */
export type EntityTableFeatures = typeof entityTableFeatures;
