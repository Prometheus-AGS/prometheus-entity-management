/**
 * table/types.ts
 *
 * Pure table engine type definitions — zero external dependencies.
 * Structurally compatible with TanStack Table v8 for easy migration,
 * but fully self-contained within the prometheus-entity-management library.
 */
import type React from "react";

// ---------------------------------------------------------------------------
// View modes
// ---------------------------------------------------------------------------
export type ViewMode = "table" | "gallery" | "list";

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------
export type Updater<T> = T | ((prev: T) => T);

export type AccessorFn<TData, TValue = unknown> = (row: TData, index: number) => TValue;

export type HeaderContext<TData> = {
  table: TableInstance<TData>;
  header: Header<TData>;
  column: Column<TData>;
};

export type CellContext<TData> = {
  table: TableInstance<TData>;
  row: Row<TData>;
  cell: Cell<TData>;
  column: Column<TData>;
  getValue: <T = unknown>() => T;
  renderValue: <T = unknown>() => T | null;
};

export type HeaderRenderer<TData> =
  | string
  | ((context: HeaderContext<TData>) => React.ReactNode);

export type CellRenderer<TData> =
  | string
  | ((context: CellContext<TData>) => React.ReactNode);

export type FilterFn<TData> = (
  row: Row<TData>,
  columnId: string,
  filterValue: unknown,
) => boolean;

export type SortingFn<TData> = (
  rowA: Row<TData>,
  rowB: Row<TData>,
  columnId: string,
) => number;

export type AggregationFn<TData> = (
  columnId: string,
  leafRows: Row<TData>[],
  childRows: Row<TData>[],
) => unknown;

export interface ColumnMeta<TData = unknown> {
  entityMeta?: {
    field: keyof TData;
    filterType: "text" | "number" | "date" | "dateRange" | "boolean" | "enum" | "relation" | "none";
    enumOptions?: Array<{ label: string; value: string; color?: string }>;
    relationEntityType?: string;
    editable?: boolean;
    hideable?: boolean;
  };
  [key: string]: unknown;
}

export interface ColumnDef<TData, TValue = unknown> {
  id?: string;
  accessorKey?: keyof TData & string;
  accessorFn?: AccessorFn<TData, TValue>;

  header?: HeaderRenderer<TData>;
  cell?: CellRenderer<TData>;
  footer?: HeaderRenderer<TData>;

  size?: number;
  minSize?: number;
  maxSize?: number;

  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableHiding?: boolean;
  enablePinning?: boolean;
  enableGrouping?: boolean;
  enableResizing?: boolean;

  filterFn?: FilterFn<TData> | "auto";
  sortingFn?: SortingFn<TData> | "auto";
  aggregationFn?: AggregationFn<TData> | "auto" | "sum" | "min" | "max" | "count" | "mean" | "median" | "unique";
  sortDescFirst?: boolean;
  sortUndefined?: "first" | "last" | false;
  invertSorting?: boolean;

  meta?: ColumnMeta<TData>;
  columns?: ColumnDef<TData, unknown>[];
}

// ---------------------------------------------------------------------------
// Table state
// ---------------------------------------------------------------------------
export interface SortingColumn {
  id: string;
  desc: boolean;
}
export type SortingState = SortingColumn[];

export interface ColumnFilter {
  id: string;
  value: unknown;
}
export type ColumnFiltersState = ColumnFilter[];

export type RowSelectionState = Record<string, boolean>;

export type ColumnVisibilityState = Record<string, boolean>;

export type ColumnOrderState = string[];

export interface ColumnPinningState {
  left?: string[];
  right?: string[];
}

export type ColumnSizingState = Record<string, number>;

export type ColumnSizingInfoState = {
  startOffset: number | null;
  startSize: number | null;
  deltaOffset: number | null;
  deltaPercentage: number | null;
  isResizingColumn: string | false;
  columnSizingStart: [string, number][];
};

export type ExpandedState = Record<string, boolean> | true;

export type GroupingState = string[];

export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface TableState {
  sorting: SortingState;
  columnFilters: ColumnFiltersState;
  globalFilter: unknown;
  rowSelection: RowSelectionState;
  columnVisibility: ColumnVisibilityState;
  columnOrder: ColumnOrderState;
  columnPinning: ColumnPinningState;
  columnSizing: ColumnSizingState;
  columnSizingInfo: ColumnSizingInfoState;
  expanded: ExpandedState;
  grouping: GroupingState;
  pagination: PaginationState;
}

// ---------------------------------------------------------------------------
// Row / Cell / Header models
// ---------------------------------------------------------------------------
export interface Row<TData> {
  id: string;
  index: number;
  original: TData;
  depth: number;
  parentId?: string;
  subRows: Row<TData>[];
  getValue: <T = unknown>(columnId: string) => T;
  renderValue: <T = unknown>(columnId: string) => T | null;

  getIsSelected: () => boolean;
  getCanSelect: () => boolean;
  getIsAllSubRowsSelected: () => boolean;
  getIsSomeSelected: () => boolean;
  toggleSelected: (value?: boolean) => void;
  getToggleSelectedHandler: () => (e: unknown) => void;

  getIsExpanded: () => boolean;
  getCanExpand: () => boolean;
  toggleExpanded: (value?: boolean) => void;
  getToggleExpandedHandler: () => () => void;

  getIsGrouped: () => boolean;
  groupingColumnId?: string;
  groupingValue?: unknown;

  getVisibleCells: () => Cell<TData>[];
  getAllCells: () => Cell<TData>[];

  getIsPinned: () => "top" | "bottom" | false;
  pin: (position: "top" | "bottom" | false) => void;
}

export interface Cell<TData> {
  id: string;
  row: Row<TData>;
  column: Column<TData>;
  getValue: <T = unknown>() => T;
  renderValue: <T = unknown>() => T | null;
  getIsGrouped: () => boolean;
  getIsPlaceholder: () => boolean;
  getIsAggregated: () => boolean;
  getContext: () => CellContext<TData>;
}

export interface Header<TData> {
  id: string;
  index: number;
  depth: number;
  column: Column<TData>;
  isPlaceholder: boolean;
  placeholderId?: string;
  subHeaders: Header<TData>[];
  colSpan: number;
  rowSpan: number;
  getSize: () => number;
  getStart: () => number;
  getContext: () => HeaderContext<TData>;
  getResizeHandler: () => (event: unknown) => void;
  getLeafHeaders: () => Header<TData>[];
}

export interface HeaderGroup<TData> {
  id: string;
  depth: number;
  headers: Header<TData>[];
}

export interface Column<TData> {
  id: string;
  depth: number;
  columnDef: ColumnDef<TData>;
  columns: Column<TData>[];
  parent?: Column<TData>;

  getFlatColumns: () => Column<TData>[];
  getLeafColumns: () => Column<TData>[];

  getIsSorted: () => false | "asc" | "desc";
  getNextSortingOrder: () => "asc" | "desc" | false;
  getCanSort: () => boolean;
  toggleSorting: (desc?: boolean, isMulti?: boolean) => void;
  clearSorting: () => void;
  getSortIndex: () => number;
  getAutoSortingFn: () => SortingFn<TData>;
  getAutoSortDir: () => "asc" | "desc";

  getIsFiltered: () => boolean;
  getFilterValue: () => unknown;
  setFilterValue: (value: unknown) => void;
  getCanFilter: () => boolean;
  getAutoFilterFn: () => FilterFn<TData> | undefined;

  getIsVisible: () => boolean;
  toggleVisibility: (value?: boolean) => void;
  getCanHide: () => boolean;

  getIsPinned: () => "left" | "right" | false;
  pin: (position: "left" | "right" | false) => void;
  getCanPin: () => boolean;

  getIsGrouped: () => boolean;
  toggleGrouping: () => void;
  getCanGroup: () => boolean;
  getGroupedIndex: () => number;

  getSize: () => number;
  getStart: (position?: "left" | "center" | "right") => number;
  getCanResize: () => boolean;
  resetSize: () => void;

  getIndex: (position?: "left" | "center" | "right") => number;
}

// ---------------------------------------------------------------------------
// Row model
// ---------------------------------------------------------------------------
export interface RowModel<TData> {
  rows: Row<TData>[];
  flatRows: Row<TData>[];
  rowsById: Record<string, Row<TData>>;
}

// ---------------------------------------------------------------------------
// Table options and instance
// ---------------------------------------------------------------------------
export interface TableOptions<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  getRowId?: (row: TData, index: number, parent?: Row<TData>) => string;
  defaultColumn?: Partial<ColumnDef<TData>>;

  /** Seed the initial value for any internal state slice without making it controlled. */
  initialState?: Partial<TableState>;
  /** Fully controlled state — every key provided here locks that slice and must be updated externally. */
  state?: Partial<TableState>;
  onStateChange?: (updater: Updater<TableState>) => void;

  // Sorting
  manualSorting?: boolean;
  enableSorting?: boolean;
  enableMultiSort?: boolean;
  enableSortingRemoval?: boolean;
  enableMultiRemove?: boolean;
  maxMultiSortColCount?: number;
  sortDescFirst?: boolean;
  onSortingChange?: (updater: Updater<SortingState>) => void;

  // Filtering
  manualFiltering?: boolean;
  enableFiltering?: boolean;
  enableColumnFilters?: boolean;
  enableGlobalFilter?: boolean;
  globalFilterFn?: FilterFn<TData>;
  onColumnFiltersChange?: (updater: Updater<ColumnFiltersState>) => void;
  onGlobalFilterChange?: (updater: Updater<unknown>) => void;

  // Pagination
  manualPagination?: boolean;
  pageCount?: number;
  autoResetPageIndex?: boolean;
  onPaginationChange?: (updater: Updater<PaginationState>) => void;

  // Row selection
  enableRowSelection?: boolean | ((row: Row<TData>) => boolean);
  enableMultiRowSelection?: boolean | ((row: Row<TData>) => boolean);
  enableSubRowSelection?: boolean | ((row: Row<TData>) => boolean);
  onRowSelectionChange?: (updater: Updater<RowSelectionState>) => void;

  // Column visibility
  enableHiding?: boolean;
  onColumnVisibilityChange?: (updater: Updater<ColumnVisibilityState>) => void;

  // Column ordering
  onColumnOrderChange?: (updater: Updater<ColumnOrderState>) => void;

  // Column pinning
  enablePinning?: boolean;
  onColumnPinningChange?: (updater: Updater<ColumnPinningState>) => void;

  // Column sizing
  enableColumnResizing?: boolean;
  columnResizeMode?: "onChange" | "onEnd";
  columnResizeDirection?: "ltr" | "rtl";
  onColumnSizingChange?: (updater: Updater<ColumnSizingState>) => void;
  onColumnSizingInfoChange?: (updater: Updater<ColumnSizingInfoState>) => void;

  // Grouping
  manualGrouping?: boolean;
  enableGrouping?: boolean;
  onGroupingChange?: (updater: Updater<GroupingState>) => void;

  // Expanding
  manualExpanding?: boolean;
  enableExpanding?: boolean;
  getSubRows?: (row: TData, index: number) => TData[] | undefined;
  getIsRowExpanded?: (row: Row<TData>) => boolean;
  onExpandedChange?: (updater: Updater<ExpandedState>) => void;
  paginateExpandedRows?: boolean;

  // Row pinning
  enableRowPinning?: boolean | ((row: Row<TData>) => boolean);
  keepPinnedRows?: boolean;
  onRowPinningChange?: (updater: Updater<Record<string, "top" | "bottom">>) => void;
}

export interface TableInstance<TData> {
  options: TableOptions<TData>;
  getState: () => TableState;
  setState: (updater: Updater<TableState>) => void;
  reset: () => void;

  // Column access
  getAllColumns: () => Column<TData>[];
  getAllFlatColumns: () => Column<TData>[];
  getAllLeafColumns: () => Column<TData>[];
  getColumn: (id: string) => Column<TData> | undefined;

  // Header groups
  getHeaderGroups: () => HeaderGroup<TData>[];
  getLeftHeaderGroups: () => HeaderGroup<TData>[];
  getCenterHeaderGroups: () => HeaderGroup<TData>[];
  getRightHeaderGroups: () => HeaderGroup<TData>[];
  getFooterGroups: () => HeaderGroup<TData>[];

  // Row models
  getCoreRowModel: () => RowModel<TData>;
  getRowModel: () => RowModel<TData>;
  getPreFilteredRowModel: () => RowModel<TData>;
  getFilteredRowModel: () => RowModel<TData>;
  getPreSortedRowModel: () => RowModel<TData>;
  getSortedRowModel: () => RowModel<TData>;
  getGroupedRowModel: () => RowModel<TData>;
  getExpandedRowModel: () => RowModel<TData>;
  getPrePaginationRowModel: () => RowModel<TData>;
  getPaginationRowModel: () => RowModel<TData>;
  getSelectedRowModel: () => RowModel<TData>;
  getRow: (id: string) => Row<TData>;

  // Sorting
  setSorting: (updater: Updater<SortingState>) => void;
  resetSorting: (defaultState?: boolean) => void;

  // Filtering
  setColumnFilters: (updater: Updater<ColumnFiltersState>) => void;
  resetColumnFilters: (defaultState?: boolean) => void;
  setGlobalFilter: (value: unknown) => void;
  resetGlobalFilter: (defaultState?: boolean) => void;

  // Pagination
  setPageIndex: (updater: Updater<number>) => void;
  resetPageIndex: (defaultState?: boolean) => void;
  setPageSize: (updater: Updater<number>) => void;
  resetPageSize: (defaultState?: boolean) => void;
  getPageCount: () => number;
  getCanPreviousPage: () => boolean;
  getCanNextPage: () => boolean;
  previousPage: () => void;
  nextPage: () => void;
  firstPage: () => void;
  lastPage: () => void;

  // Row selection
  setRowSelection: (updater: Updater<RowSelectionState>) => void;
  resetRowSelection: (defaultState?: boolean) => void;
  toggleAllRowsSelected: (value?: boolean) => void;
  toggleAllPageRowsSelected: (value?: boolean) => void;
  getIsAllRowsSelected: () => boolean;
  getIsAllPageRowsSelected: () => boolean;
  getIsSomeRowsSelected: () => boolean;
  getIsSomePageRowsSelected: () => boolean;
  getToggleAllRowsSelectedHandler: () => (e: unknown) => void;
  getToggleAllPageRowsSelectedHandler: () => (e: unknown) => void;

  // Column visibility
  setColumnVisibility: (updater: Updater<ColumnVisibilityState>) => void;
  resetColumnVisibility: (defaultState?: boolean) => void;
  toggleAllColumnsVisible: (value?: boolean) => void;
  getIsAllColumnsVisible: () => boolean;
  getIsSomeColumnsVisible: () => boolean;
  getToggleAllColumnsVisibilityHandler: () => (e: unknown) => void;
  getVisibleFlatColumns: () => Column<TData>[];
  getVisibleLeafColumns: () => Column<TData>[];

  // Column ordering
  setColumnOrder: (updater: Updater<ColumnOrderState>) => void;
  resetColumnOrder: (defaultState?: boolean) => void;

  // Column pinning
  setColumnPinning: (updater: Updater<ColumnPinningState>) => void;
  resetColumnPinning: (defaultState?: boolean) => void;
  getLeftFlatColumns: () => Column<TData>[];
  getRightFlatColumns: () => Column<TData>[];
  getCenterFlatColumns: () => Column<TData>[];
  getLeftLeafColumns: () => Column<TData>[];
  getRightLeafColumns: () => Column<TData>[];
  getCenterLeafColumns: () => Column<TData>[];

  // Column sizing
  setColumnSizing: (updater: Updater<ColumnSizingState>) => void;
  setColumnSizingInfo: (updater: Updater<ColumnSizingInfoState>) => void;
  resetColumnSizing: (defaultState?: boolean) => void;

  // Grouping
  setGrouping: (updater: Updater<GroupingState>) => void;
  resetGrouping: (defaultState?: boolean) => void;

  // Expanding
  setExpanded: (updater: Updater<ExpandedState>) => void;
  resetExpanded: (defaultState?: boolean) => void;
  toggleAllRowsExpanded: (expanded?: boolean) => void;
  getIsAllRowsExpanded: () => boolean;
  getIsSomeRowsExpanded: () => boolean;
  getCanSomeRowsExpand: () => boolean;
  getExpandedDepth: () => number;
}

// ---------------------------------------------------------------------------
// Action definitions (shared across all view modes)
// ---------------------------------------------------------------------------
export interface ActionDef<TData> {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (item: TData) => void;
  destructive?: boolean;
  hidden?: (item: TData) => boolean;
  disabled?: (item: TData) => boolean;
  confirm?: string | ((item: TData) => string);
  variant?: "primary" | "default" | "ghost" | "destructive";
}

// ---------------------------------------------------------------------------
// Item descriptor (for gallery cards and list items)
// ---------------------------------------------------------------------------
export interface ItemDescriptorBadge<TData> {
  field: keyof TData & string;
  options?: Array<{ value: string; label: string; className?: string }>;
}

export interface ItemDescriptorMeta<TData> {
  field: keyof TData & string;
  label: string;
  format?: (value: unknown) => string;
}

export interface ItemDescriptor<TData> {
  title: keyof TData & string;
  subtitle?: keyof TData & string;
  image?: keyof TData & string;
  icon?: (keyof TData & string) | React.ComponentType<{ className?: string }>;
  avatar?: keyof TData & string;
  badges?: ItemDescriptorBadge<TData>[];
  metadata?: ItemDescriptorMeta<TData>[];
  description?: keyof TData & string;
}

// ---------------------------------------------------------------------------
// Item render context (passed to renderCard / renderItem overrides)
// ---------------------------------------------------------------------------
export interface ItemRenderContext<TData> {
  isSelected: boolean;
  isEditing: boolean;
  isMultiSelectMode: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSave: (changes: Partial<TData>) => void;
  onCancel: () => void;
  actions: ActionDef<TData>[];
  row: Row<TData>;
}

// ---------------------------------------------------------------------------
// Empty state configuration
// ---------------------------------------------------------------------------
export interface EmptyStateConfig {
  icon?: React.ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  filteredTitle?: string;
  filteredDescription?: string;
  filteredAction?: { label: string; onClick: () => void };
}

// ---------------------------------------------------------------------------
// Batch action definition
// ---------------------------------------------------------------------------
export interface BatchActionDef {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
}

// ---------------------------------------------------------------------------
// Gallery column breakpoints
// ---------------------------------------------------------------------------
export interface GalleryColumns {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}
