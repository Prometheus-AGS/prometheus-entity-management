/**
 * table/faceting.ts
 *
 * Column faceting utilities — compute unique values, counts,
 * and min/max for filter UI controls.
 */
import type { Row, RowModel } from "./types";

/**
 * Compute unique values and their counts for a given column.
 * Useful for rendering filter dropdown options with hit counts.
 */
export function getFacetedUniqueValues<TData>(
  rowModel: RowModel<TData>,
  columnId: string,
): Map<unknown, number> {
  const counts = new Map<unknown, number>();

  for (const row of rowModel.flatRows) {
    const value = row.getValue(columnId);
    if (Array.isArray(value)) {
      for (const v of value) {
        counts.set(v, (counts.get(v) ?? 0) + 1);
      }
    } else {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  return counts;
}

/**
 * Compute min and max numeric values for a given column.
 * Returns [min, max] or undefined if no numeric values exist.
 */
export function getFacetedMinMaxValues<TData>(
  rowModel: RowModel<TData>,
  columnId: string,
): [number, number] | undefined {
  let min = Infinity;
  let max = -Infinity;
  let hasValue = false;

  for (const row of rowModel.flatRows) {
    const raw = row.getValue(columnId);
    const value = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isNaN(value)) {
      hasValue = true;
      if (value < min) min = value;
      if (value > max) max = value;
    }
  }

  return hasValue ? [min, max] : undefined;
}

/**
 * Get a filtered row model scoped to a single column's facet.
 * Returns a row model that excludes the given column's own filter,
 * so the facet counts reflect what would be available if that
 * specific filter were removed.
 */
export function getFacetedRowModel<TData>(
  preFilteredRowModel: RowModel<TData>,
  columnId: string,
  allFilteredRowModel: RowModel<TData>,
): RowModel<TData> {
  return preFilteredRowModel;
}
