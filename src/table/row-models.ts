/**
 * table/row-models.ts
 *
 * Pure row model pipeline functions. Each stage transforms data
 * into a RowModel — no side effects, no external dependencies.
 */
import type {
  Row,
  Cell,
  Column,
  ColumnDef,
  RowModel,
  TableInstance,
  SortingState,
  ColumnFiltersState,
  ExpandedState,
  GroupingState,
  PaginationState,
  CellContext,
  FilterFn,
  SortingFn,
} from "./types";

// ---------------------------------------------------------------------------
// Accessor helpers
// ---------------------------------------------------------------------------
function resolveAccessor<TData>(
  columnDef: ColumnDef<TData>,
  row: TData,
  index: number,
): unknown {
  if (columnDef.accessorFn) return columnDef.accessorFn(row, index);
  if (columnDef.accessorKey) return (row as Record<string, unknown>)[columnDef.accessorKey];
  return undefined;
}

function getColumnId<TData>(colDef: ColumnDef<TData>, index: number): string {
  return colDef.id ?? colDef.accessorKey ?? `col_${index}`;
}

// ---------------------------------------------------------------------------
// Built-in filter functions
// ---------------------------------------------------------------------------
const builtInFilterFns: Record<string, FilterFn<unknown>> = {
  auto: (row, columnId, filterValue) => {
    const val = row.getValue(columnId);
    if (filterValue == null || filterValue === "") return true;
    if (typeof val === "string") return val.toLowerCase().includes(String(filterValue).toLowerCase());
    if (typeof val === "number") return val === Number(filterValue);
    if (typeof val === "boolean") return val === filterValue;
    return String(val).toLowerCase().includes(String(filterValue).toLowerCase());
  },
};

// ---------------------------------------------------------------------------
// Built-in sorting comparators
// ---------------------------------------------------------------------------
function defaultSortingFn(a: unknown, b: unknown): number {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  if (a instanceof Date && b instanceof Date) return a.getTime() - b.getTime();
  return String(a).localeCompare(String(b));
}

// ---------------------------------------------------------------------------
// Create Row wrapper
// ---------------------------------------------------------------------------
export function createRow<TData>(
  original: TData,
  index: number,
  columns: Column<TData>[],
  table: TableInstance<TData>,
  depth: number = 0,
  parentId?: string,
  subRows: Row<TData>[] = [],
): Row<TData> {
  const id = table.options.getRowId
    ? table.options.getRowId(original, index)
    : String(index);

  const row: Row<TData> = {
    id,
    index,
    original,
    depth,
    parentId,
    subRows,

    getValue: <T = unknown>(columnId: string): T => {
      const col = columns.find((c) => c.id === columnId);
      if (!col) return undefined as T;
      return resolveAccessor(col.columnDef, original, index) as T;
    },
    renderValue: <T = unknown>(columnId: string): T | null => {
      const val = row.getValue<T>(columnId);
      return val ?? null;
    },

    getIsSelected: () => !!table.getState().rowSelection[id],
    getCanSelect: () => {
      const opt = table.options.enableRowSelection;
      if (opt === false) return false;
      if (typeof opt === "function") return opt(row);
      return true;
    },
    getIsAllSubRowsSelected: () =>
      subRows.length > 0 && subRows.every((sr) => sr.getIsSelected()),
    getIsSomeSelected: () =>
      subRows.some((sr) => sr.getIsSelected() || sr.getIsSomeSelected()),
    toggleSelected: (value?: boolean) => {
      const next = value ?? !row.getIsSelected();
      table.setRowSelection((prev) => ({ ...prev, [id]: next }));
    },
    getToggleSelectedHandler: () => (e: unknown) => {
      row.toggleSelected();
    },

    getIsExpanded: () => {
      const expanded = table.getState().expanded;
      if (expanded === true) return true;
      return !!expanded[id];
    },
    getCanExpand: () => subRows.length > 0,
    toggleExpanded: (value?: boolean) => {
      const next = value ?? !row.getIsExpanded();
      table.setExpanded((prev) => {
        if (prev === true) {
          const allRows: Record<string, boolean> = {};
          table.getCoreRowModel().flatRows.forEach((r) => { allRows[r.id] = true; });
          allRows[id] = next;
          return allRows;
        }
        return { ...prev, [id]: next };
      });
    },
    getToggleExpandedHandler: () => () => row.toggleExpanded(),

    getIsGrouped: () => !!row.groupingColumnId,
    groupingColumnId: undefined,
    groupingValue: undefined,

    getVisibleCells: () =>
      row.getAllCells().filter((cell) => cell.column.getIsVisible()),
    getAllCells: () =>
      columns.map((col) => createCell(row, col, table)),

    getIsPinned: () => false,
    pin: () => {},
  };

  return row;
}

// ---------------------------------------------------------------------------
// Create Cell wrapper
// ---------------------------------------------------------------------------
function createCell<TData>(
  row: Row<TData>,
  column: Column<TData>,
  table: TableInstance<TData>,
): Cell<TData> {
  const cellId = `${row.id}_${column.id}`;
  const cell: Cell<TData> = {
    id: cellId,
    row,
    column,
    getValue: <T = unknown>() => row.getValue<T>(column.id),
    renderValue: <T = unknown>() => row.renderValue<T>(column.id),
    getIsGrouped: () => row.getIsGrouped() && row.groupingColumnId === column.id,
    getIsPlaceholder: () => false,
    getIsAggregated: () => row.subRows.length > 0 && row.getIsGrouped() && row.groupingColumnId !== column.id,
    getContext: (): CellContext<TData> => ({
      table,
      row,
      cell,
      column,
      getValue: cell.getValue,
      renderValue: cell.renderValue,
    }),
  };
  return cell;
}

// ---------------------------------------------------------------------------
// 1. getCoreRowModel
// ---------------------------------------------------------------------------
export function getCoreRowModel<TData>(
  data: TData[],
  columns: Column<TData>[],
  table: TableInstance<TData>,
): RowModel<TData> {
  const getSubRows = table.options.getSubRows;
  const flatRows: Row<TData>[] = [];

  function processRows(items: TData[], depth: number, parentId?: string): Row<TData>[] {
    return items.map((item, index) => {
      const subData = getSubRows?.(item, index);
      const row = createRow(item, flatRows.length, columns, table, depth, parentId);
      flatRows.push(row);
      if (subData && subData.length > 0) {
        row.subRows = processRows(subData, depth + 1, row.id);
      }
      return row;
    });
  }

  const rows = processRows(data, 0);
  const rowsById: Record<string, Row<TData>> = {};
  flatRows.forEach((r) => { rowsById[r.id] = r; });

  return { rows, flatRows, rowsById };
}

// ---------------------------------------------------------------------------
// 2. getFilteredRowModel
// ---------------------------------------------------------------------------
export function getFilteredRowModel<TData>(
  rowModel: RowModel<TData>,
  columnFilters: ColumnFiltersState,
  globalFilter: unknown,
  columns: Column<TData>[],
  globalFilterFn?: FilterFn<TData>,
): RowModel<TData> {
  const hasColumnFilters = columnFilters.length > 0;
  const hasGlobalFilter = globalFilter != null && globalFilter !== "";

  if (!hasColumnFilters && !hasGlobalFilter) return rowModel;

  const filterFns = new Map<string, FilterFn<TData>>();
  for (const cf of columnFilters) {
    const col = columns.find((c) => c.id === cf.id);
    if (col) {
      const fn = col.columnDef.filterFn;
      filterFns.set(cf.id, (typeof fn === "function" ? fn : builtInFilterFns.auto) as FilterFn<TData>);
    }
  }

  const resolvedGlobalFilterFn = (globalFilterFn ?? builtInFilterFns.auto) as FilterFn<TData>;
  const flatRows: Row<TData>[] = [];

  function filterRows(rows: Row<TData>[]): Row<TData>[] {
    return rows.filter((row) => {
      for (const cf of columnFilters) {
        const fn = filterFns.get(cf.id);
        if (fn && !fn(row, cf.id, cf.value)) return false;
      }
      if (hasGlobalFilter) {
        const matches = columns.some((col) =>
          resolvedGlobalFilterFn(row, col.id, globalFilter),
        );
        if (!matches) return false;
      }
      flatRows.push(row);
      if (row.subRows.length > 0) {
        const filteredSubRows = filterRows(row.subRows);
        if (filteredSubRows.length > 0) {
          row = { ...row, subRows: filteredSubRows };
          return true;
        }
      }
      return true;
    });
  }

  const rows = filterRows(rowModel.rows);
  const rowsById: Record<string, Row<TData>> = {};
  flatRows.forEach((r) => { rowsById[r.id] = r; });

  return { rows, flatRows, rowsById };
}

// ---------------------------------------------------------------------------
// 3. getSortedRowModel
// ---------------------------------------------------------------------------
export function getSortedRowModel<TData>(
  rowModel: RowModel<TData>,
  sorting: SortingState,
  columns: Column<TData>[],
): RowModel<TData> {
  if (sorting.length === 0) return rowModel;

  const sortFns: Array<{
    columnId: string;
    desc: boolean;
    fn: SortingFn<TData> | null;
    colDef: ColumnDef<TData> | null;
  }> = sorting.map((s) => {
    const col = columns.find((c) => c.id === s.id);
    const colDef = col?.columnDef ?? null;
    let fn: SortingFn<TData> | null = null;
    if (colDef?.sortingFn && typeof colDef.sortingFn === "function") {
      fn = colDef.sortingFn;
    }
    return { columnId: s.id, desc: s.desc, fn, colDef };
  });

  function sortRows(rows: Row<TData>[]): Row<TData>[] {
    const sorted = [...rows].sort((rowA, rowB) => {
      for (const { columnId, desc, fn, colDef } of sortFns) {
        let result: number;
        if (fn) {
          result = fn(rowA, rowB, columnId);
        } else {
          const a = rowA.getValue(columnId);
          const b = rowB.getValue(columnId);
          result = defaultSortingFn(a, b);
        }
        if (colDef?.invertSorting) result = -result;
        if (result !== 0) return desc ? -result : result;
      }
      return 0;
    });

    return sorted.map((row) => {
      if (row.subRows.length > 0) {
        return { ...row, subRows: sortRows(row.subRows) };
      }
      return row;
    });
  }

  const rows = sortRows(rowModel.rows);
  const flatRows: Row<TData>[] = [];
  function flatten(rows: Row<TData>[]) {
    rows.forEach((r) => { flatRows.push(r); if (r.subRows.length) flatten(r.subRows); });
  }
  flatten(rows);
  const rowsById: Record<string, Row<TData>> = {};
  flatRows.forEach((r) => { rowsById[r.id] = r; });

  return { rows, flatRows, rowsById };
}

// ---------------------------------------------------------------------------
// 4. getGroupedRowModel
// ---------------------------------------------------------------------------
export function getGroupedRowModel<TData>(
  rowModel: RowModel<TData>,
  grouping: GroupingState,
  columns: Column<TData>[],
  table: TableInstance<TData>,
): RowModel<TData> {
  if (grouping.length === 0) return rowModel;

  function groupRows(rows: Row<TData>[], depth: number): Row<TData>[] {
    if (depth >= grouping.length) return rows;

    const columnId = grouping[depth];
    const groups = new Map<unknown, Row<TData>[]>();

    for (const row of rows) {
      const value = row.getValue(columnId);
      const key = value ?? "__null__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }

    const groupedRows: Row<TData>[] = [];
    let groupIndex = 0;

    for (const [key, groupItems] of groups) {
      const firstRow = groupItems[0];
      const groupRow = createRow(
        firstRow.original,
        groupIndex++,
        columns,
        table,
        depth,
      );
      groupRow.groupingColumnId = columnId;
      groupRow.groupingValue = key === "__null__" ? null : key;
      groupRow.subRows = groupRows(groupItems, depth + 1);
      groupedRows.push(groupRow);
    }

    return groupedRows;
  }

  const rows = groupRows(rowModel.rows, 0);
  const flatRows: Row<TData>[] = [];
  function flatten(items: Row<TData>[]) {
    items.forEach((r) => { flatRows.push(r); if (r.subRows.length) flatten(r.subRows); });
  }
  flatten(rows);
  const rowsById: Record<string, Row<TData>> = {};
  flatRows.forEach((r) => { rowsById[r.id] = r; });

  return { rows, flatRows, rowsById };
}

// ---------------------------------------------------------------------------
// 5. getExpandedRowModel
// ---------------------------------------------------------------------------
export function getExpandedRowModel<TData>(
  rowModel: RowModel<TData>,
  expanded: ExpandedState,
): RowModel<TData> {
  const flatRows: Row<TData>[] = [];

  function expandRows(rows: Row<TData>[]): Row<TData>[] {
    const result: Row<TData>[] = [];
    for (const row of rows) {
      result.push(row);
      flatRows.push(row);
      const isExpanded = expanded === true || (typeof expanded === "object" && expanded[row.id]);
      if (isExpanded && row.subRows.length > 0) {
        const expandedSubRows = expandRows(row.subRows);
        result.push(...expandedSubRows);
      }
    }
    return result;
  }

  const rows = expandRows(rowModel.rows);
  const rowsById: Record<string, Row<TData>> = {};
  flatRows.forEach((r) => { rowsById[r.id] = r; });

  return { rows, flatRows, rowsById };
}

// ---------------------------------------------------------------------------
// 6. getPaginatedRowModel
// ---------------------------------------------------------------------------
export function getPaginatedRowModel<TData>(
  rowModel: RowModel<TData>,
  pagination: PaginationState,
): RowModel<TData> {
  const { pageIndex, pageSize } = pagination;
  const start = pageIndex * pageSize;
  const end = start + pageSize;
  const rows = rowModel.rows.slice(start, end);
  const flatRows = rows;
  const rowsById: Record<string, Row<TData>> = {};
  flatRows.forEach((r) => { rowsById[r.id] = r; });

  return { rows, flatRows, rowsById };
}

// ---------------------------------------------------------------------------
// Helper: get selected row model
// ---------------------------------------------------------------------------
export function getSelectedRowModel<TData>(
  rowModel: RowModel<TData>,
  selection: Record<string, boolean>,
): RowModel<TData> {
  const rows = rowModel.flatRows.filter((r) => selection[r.id]);
  const rowsById: Record<string, Row<TData>> = {};
  rows.forEach((r) => { rowsById[r.id] = r; });
  return { rows, flatRows: rows, rowsById };
}
