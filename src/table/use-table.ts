/**
 * table/use-table.ts
 *
 * Headless table engine hook — structural parity with TanStack Table v8.
 * Manages all feature state internally (sorting, filtering, pagination,
 * selection, visibility, ordering, pinning, sizing, grouping, expanding)
 * or accepts controlled state via options.
 */
import { useState, useMemo, useCallback, useRef } from "react";
import type {
  TableOptions,
  TableInstance,
  TableState,
  Column,
  ColumnDef,
  Header,
  HeaderGroup,
  Updater,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
  ColumnVisibilityState,
  ColumnOrderState,
  ColumnPinningState,
  ColumnSizingState,
  ColumnSizingInfoState,
  ExpandedState,
  GroupingState,
  PaginationState,
  SortingFn,
  RowModel,
} from "./types";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getPaginatedRowModel,
  getSelectedRowModel,
} from "./row-models";

// ---------------------------------------------------------------------------
// Default state
// ---------------------------------------------------------------------------
const defaultState: TableState = {
  sorting: [],
  columnFilters: [],
  globalFilter: "",
  rowSelection: {},
  columnVisibility: {},
  columnOrder: [],
  columnPinning: { left: [], right: [] },
  columnSizing: {},
  columnSizingInfo: {
    startOffset: null,
    startSize: null,
    deltaOffset: null,
    deltaPercentage: null,
    isResizingColumn: false,
    columnSizingStart: [],
  },
  expanded: {},
  grouping: [],
  pagination: { pageIndex: 0, pageSize: 10 },
};

// ---------------------------------------------------------------------------
// Updater helpers
// ---------------------------------------------------------------------------
function resolveUpdater<T>(updater: Updater<T>, prev: T): T {
  return typeof updater === "function" ? (updater as (prev: T) => T)(prev) : updater;
}

function getColumnId<TData>(def: ColumnDef<TData>, index: number): string {
  return def.id ?? def.accessorKey ?? `col_${index}`;
}

// ---------------------------------------------------------------------------
// Build Column objects from ColumnDef
// ---------------------------------------------------------------------------
function buildColumns<TData>(
  defs: ColumnDef<TData>[],
  table: { getState: () => TableState } & Record<string, unknown>,
  stateSetters: Record<string, (updater: Updater<unknown>) => void>,
  depth: number = 0,
  parent?: Column<TData>,
): Column<TData>[] {
  return defs.map((def, index) => {
    const id = getColumnId(def, index);

    const column: Column<TData> = {
      id,
      depth,
      columnDef: def,
      columns: [],
      parent,

      getFlatColumns: () => {
        const flat: Column<TData>[] = [column];
        column.columns.forEach((c) => {
          flat.push(...c.getFlatColumns());
        });
        return flat;
      },
      getLeafColumns: () => {
        if (column.columns.length === 0) return [column];
        return column.columns.flatMap((c) => c.getLeafColumns());
      },

      // Sorting
      getIsSorted: () => {
        const s = table.getState().sorting.find((s) => s.id === id);
        if (!s) return false;
        return s.desc ? "desc" : "asc";
      },
      getNextSortingOrder: () => {
        const current = column.getIsSorted();
        if (!current) return def.sortDescFirst ? "desc" : "asc";
        if (current === "asc") return "desc";
        return false;
      },
      getCanSort: () => def.enableSorting !== false,
      toggleSorting: (desc?: boolean, isMulti?: boolean) => {
        stateSetters.setSorting(((prev: SortingState) => {
          const existingIndex = prev.findIndex((s) => s.id === id);
          if (desc === undefined) {
            const nextOrder = column.getNextSortingOrder();
            if (nextOrder === false) {
              return isMulti ? prev.filter((s) => s.id !== id) : [];
            }
            const newSort = { id, desc: nextOrder === "desc" };
            if (isMulti) {
              if (existingIndex >= 0) {
                const next = [...prev];
                next[existingIndex] = newSort;
                return next;
              }
              return [...prev, newSort];
            }
            return [newSort];
          }
          const newSort = { id, desc };
          if (isMulti) {
            if (existingIndex >= 0) {
              const next = [...prev];
              next[existingIndex] = newSort;
              return next;
            }
            return [...prev, newSort];
          }
          return [newSort];
        }) as Updater<unknown>);
      },
      clearSorting: () => {
        stateSetters.setSorting(((prev: SortingState) =>
          prev.filter((s) => s.id !== id)) as Updater<unknown>);
      },
      getSortIndex: () => table.getState().sorting.findIndex((s) => s.id === id),
      getAutoSortingFn: () => (() => 0) as SortingFn<TData>,
      getAutoSortDir: () => "asc",

      // Filtering
      getIsFiltered: () => table.getState().columnFilters.some((f) => f.id === id),
      getFilterValue: () => table.getState().columnFilters.find((f) => f.id === id)?.value,
      setFilterValue: (value) => {
        stateSetters.setColumnFilters(((prev: ColumnFiltersState) => {
          const existing = prev.findIndex((f) => f.id === id);
          if (value == null || value === "") {
            return existing >= 0 ? prev.filter((f) => f.id !== id) : prev;
          }
          if (existing >= 0) {
            const next = [...prev];
            next[existing] = { id, value };
            return next;
          }
          return [...prev, { id, value }];
        }) as Updater<unknown>);
      },
      getCanFilter: () => def.enableFiltering !== false,
      getAutoFilterFn: () => undefined,

      // Visibility
      getIsVisible: () => table.getState().columnVisibility[id] !== false,
      toggleVisibility: (value) => {
        stateSetters.setColumnVisibility(((prev: ColumnVisibilityState) => ({
          ...prev,
          [id]: value ?? !column.getIsVisible(),
        })) as Updater<unknown>);
      },
      getCanHide: () => def.enableHiding !== false,

      // Pinning
      getIsPinned: () => {
        const p = table.getState().columnPinning;
        if (p.left?.includes(id)) return "left";
        if (p.right?.includes(id)) return "right";
        return false;
      },
      pin: (position) => {
        stateSetters.setColumnPinning(((prev: ColumnPinningState) => {
          const left = (prev.left ?? []).filter((c) => c !== id);
          const right = (prev.right ?? []).filter((c) => c !== id);
          if (position === "left") left.push(id);
          if (position === "right") right.push(id);
          return { left, right };
        }) as Updater<unknown>);
      },
      getCanPin: () => def.enablePinning !== false,

      // Grouping
      getIsGrouped: () => table.getState().grouping.includes(id),
      toggleGrouping: () => {
        stateSetters.setGrouping(((prev: GroupingState) => {
          if (prev.includes(id)) return prev.filter((g) => g !== id);
          return [...prev, id];
        }) as Updater<unknown>);
      },
      getCanGroup: () => def.enableGrouping !== false,
      getGroupedIndex: () => table.getState().grouping.indexOf(id),

      // Sizing
      getSize: () => {
        const custom = table.getState().columnSizing[id];
        return custom ?? def.size ?? 150;
      },
      getStart: (_position) => {
        return 0;
      },
      getCanResize: () => def.enableResizing !== false,
      resetSize: () => {
        stateSetters.setColumnSizing(((prev: ColumnSizingState) => {
          const next = { ...prev };
          delete next[id];
          return next;
        }) as Updater<unknown>);
      },

      getIndex: () => 0,
    };

    if (def.columns) {
      column.columns = buildColumns(def.columns, table, stateSetters, depth + 1, column);
    }

    return column;
  });
}

// ---------------------------------------------------------------------------
// Build Header objects from Columns
// ---------------------------------------------------------------------------
function buildHeaderGroups<TData>(
  columns: Column<TData>[],
  table: TableInstance<TData>,
): HeaderGroup<TData>[] {
  const leafColumns = columns.flatMap((c) => c.getLeafColumns());

  const headers: Header<TData>[] = leafColumns.map((column, idx) => {
    const header: Header<TData> = {
      id: column.id,
      index: idx,
      depth: 0,
      column,
      isPlaceholder: false,
      subHeaders: [],
      colSpan: 1,
      rowSpan: 1,
      getSize: () => column.getSize(),
      getStart: () => 0,
      getContext: () => ({ table, header, column }),
      getResizeHandler: () => {
        return (_event: unknown) => {
          // Column resize handling
        };
      },
      getLeafHeaders: () => [header],
    };
    return header;
  });

  return [{ id: "headerGroup_0", depth: 0, headers }];
}

// ---------------------------------------------------------------------------
// useTable hook
// ---------------------------------------------------------------------------
export function useTable<TData extends object>(
  options: TableOptions<TData>,
): TableInstance<TData> {
  const { data, columns: columnDefs } = options;

  // Internal state — seeded by initialState (uncontrolled) or state (controlled, initial only)
  const ini = options.initialState;
  const [sorting, _setSorting] = useState<SortingState>(
    options.state?.sorting ?? ini?.sorting ?? [],
  );
  const [columnFilters, _setColumnFilters] = useState<ColumnFiltersState>(
    options.state?.columnFilters ?? ini?.columnFilters ?? [],
  );
  const [globalFilter, _setGlobalFilter] = useState<unknown>(
    options.state?.globalFilter ?? ini?.globalFilter ?? "",
  );
  const [rowSelection, _setRowSelection] = useState<RowSelectionState>(
    options.state?.rowSelection ?? ini?.rowSelection ?? {},
  );
  const [columnVisibility, _setColumnVisibility] = useState<ColumnVisibilityState>(
    options.state?.columnVisibility ?? ini?.columnVisibility ?? {},
  );
  const [columnOrder, _setColumnOrder] = useState<ColumnOrderState>(
    options.state?.columnOrder ?? ini?.columnOrder ?? [],
  );
  const [columnPinning, _setColumnPinning] = useState<ColumnPinningState>(
    options.state?.columnPinning ?? ini?.columnPinning ?? { left: [], right: [] },
  );
  const [columnSizing, _setColumnSizing] = useState<ColumnSizingState>(
    options.state?.columnSizing ?? ini?.columnSizing ?? {},
  );
  const [columnSizingInfo, _setColumnSizingInfo] = useState<ColumnSizingInfoState>(
    options.state?.columnSizingInfo ?? ini?.columnSizingInfo ?? defaultState.columnSizingInfo,
  );
  const [expanded, _setExpanded] = useState<ExpandedState>(
    options.state?.expanded ?? ini?.expanded ?? {},
  );
  const [grouping, _setGrouping] = useState<GroupingState>(
    options.state?.grouping ?? ini?.grouping ?? [],
  );
  const [pagination, _setPagination] = useState<PaginationState>(
    options.state?.pagination ?? ini?.pagination ?? { pageIndex: 0, pageSize: 10 },
  );

  // Merge controlled + internal state
  const state: TableState = useMemo(
    () => ({
      sorting: options.state?.sorting ?? sorting,
      columnFilters: options.state?.columnFilters ?? columnFilters,
      globalFilter: options.state?.globalFilter ?? globalFilter,
      rowSelection: options.state?.rowSelection ?? rowSelection,
      columnVisibility: options.state?.columnVisibility ?? columnVisibility,
      columnOrder: options.state?.columnOrder ?? columnOrder,
      columnPinning: options.state?.columnPinning ?? columnPinning,
      columnSizing: options.state?.columnSizing ?? columnSizing,
      columnSizingInfo: options.state?.columnSizingInfo ?? columnSizingInfo,
      expanded: options.state?.expanded ?? expanded,
      grouping: options.state?.grouping ?? grouping,
      pagination: options.state?.pagination ?? pagination,
    }),
    [
      options.state, sorting, columnFilters, globalFilter,
      rowSelection, columnVisibility, columnOrder, columnPinning,
      columnSizing, columnSizingInfo, expanded, grouping, pagination,
    ],
  );

  const stateRef = useRef(state);
  stateRef.current = state;

  // State setters that respect controlled/uncontrolled
  const setSorting = useCallback((updater: Updater<SortingState>) => {
    options.onSortingChange?.(updater);
    if (!options.state?.sorting) _setSorting((prev) => resolveUpdater(updater, prev));
  }, [options.onSortingChange, options.state?.sorting]);

  const setColumnFilters = useCallback((updater: Updater<ColumnFiltersState>) => {
    options.onColumnFiltersChange?.(updater);
    if (!options.state?.columnFilters) _setColumnFilters((prev) => resolveUpdater(updater, prev));
    if (options.autoResetPageIndex !== false) {
      _setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [options.onColumnFiltersChange, options.state?.columnFilters, options.autoResetPageIndex]);

  const setGlobalFilter = useCallback((value: unknown) => {
    options.onGlobalFilterChange?.(value as Updater<unknown>);
    if (!options.state?.globalFilter) _setGlobalFilter(value);
    if (options.autoResetPageIndex !== false) {
      _setPagination((prev) => ({ ...prev, pageIndex: 0 }));
    }
  }, [options.onGlobalFilterChange, options.state?.globalFilter, options.autoResetPageIndex]);

  const setRowSelection = useCallback((updater: Updater<RowSelectionState>) => {
    options.onRowSelectionChange?.(updater);
    if (!options.state?.rowSelection) _setRowSelection((prev) => resolveUpdater(updater, prev));
  }, [options.onRowSelectionChange, options.state?.rowSelection]);

  const setColumnVisibility = useCallback((updater: Updater<ColumnVisibilityState>) => {
    options.onColumnVisibilityChange?.(updater);
    if (!options.state?.columnVisibility) _setColumnVisibility((prev) => resolveUpdater(updater, prev));
  }, [options.onColumnVisibilityChange, options.state?.columnVisibility]);

  const setColumnOrder = useCallback((updater: Updater<ColumnOrderState>) => {
    options.onColumnOrderChange?.(updater);
    if (!options.state?.columnOrder) _setColumnOrder((prev) => resolveUpdater(updater, prev));
  }, [options.onColumnOrderChange, options.state?.columnOrder]);

  const setColumnPinning = useCallback((updater: Updater<ColumnPinningState>) => {
    options.onColumnPinningChange?.(updater);
    if (!options.state?.columnPinning) _setColumnPinning((prev) => resolveUpdater(updater, prev));
  }, [options.onColumnPinningChange, options.state?.columnPinning]);

  const setColumnSizing = useCallback((updater: Updater<ColumnSizingState>) => {
    options.onColumnSizingChange?.(updater);
    if (!options.state?.columnSizing) _setColumnSizing((prev) => resolveUpdater(updater, prev));
  }, [options.onColumnSizingChange, options.state?.columnSizing]);

  const setColumnSizingInfo = useCallback((updater: Updater<ColumnSizingInfoState>) => {
    options.onColumnSizingInfoChange?.(updater);
    if (!options.state?.columnSizingInfo) _setColumnSizingInfo((prev) => resolveUpdater(updater, prev));
  }, [options.onColumnSizingInfoChange, options.state?.columnSizingInfo]);

  const setExpanded = useCallback((updater: Updater<ExpandedState>) => {
    options.onExpandedChange?.(updater);
    if (!options.state?.expanded) _setExpanded((prev) => resolveUpdater(updater, prev));
  }, [options.onExpandedChange, options.state?.expanded]);

  const setGrouping = useCallback((updater: Updater<GroupingState>) => {
    options.onGroupingChange?.(updater);
    if (!options.state?.grouping) _setGrouping((prev) => resolveUpdater(updater, prev));
  }, [options.onGroupingChange, options.state?.grouping]);

  const setPagination = useCallback((updater: Updater<PaginationState>) => {
    options.onPaginationChange?.(updater);
    if (!options.state?.pagination) _setPagination((prev) => resolveUpdater(updater, prev));
  }, [options.onPaginationChange, options.state?.pagination]);

  const stateSetters = useMemo(() => ({
    setSorting: setSorting as (u: Updater<unknown>) => void,
    setColumnFilters: setColumnFilters as (u: Updater<unknown>) => void,
    setGlobalFilter: setGlobalFilter as (u: Updater<unknown>) => void,
    setRowSelection: setRowSelection as (u: Updater<unknown>) => void,
    setColumnVisibility: setColumnVisibility as (u: Updater<unknown>) => void,
    setColumnOrder: setColumnOrder as (u: Updater<unknown>) => void,
    setColumnPinning: setColumnPinning as (u: Updater<unknown>) => void,
    setColumnSizing: setColumnSizing as (u: Updater<unknown>) => void,
    setColumnSizingInfo: setColumnSizingInfo as (u: Updater<unknown>) => void,
    setExpanded: setExpanded as (u: Updater<unknown>) => void,
    setGrouping: setGrouping as (u: Updater<unknown>) => void,
    setPagination: setPagination as (u: Updater<unknown>) => void,
  }), [
    setSorting, setColumnFilters, setGlobalFilter,
    setRowSelection, setColumnVisibility, setColumnOrder,
    setColumnPinning, setColumnSizing, setColumnSizingInfo,
    setExpanded, setGrouping, setPagination,
  ]);

  const getState = useCallback(() => state, [state]);

  /** Minimal table shell for row-model pipeline (createRow needs options, getState, setters, getCoreRowModel). */
  const coreRowModelRef = useRef<RowModel<TData> | null>(null);
  const emptyCoreRowModel = useMemo<RowModel<TData>>(
    () => ({ rows: [], flatRows: [], rowsById: {} }),
    [],
  );
  const rowModelTable = useMemo(
    (): TableInstance<TData> =>
      ({
        options,
        getState: () => stateRef.current,
        setRowSelection,
        setExpanded,
        getCoreRowModel: () => coreRowModelRef.current ?? emptyCoreRowModel,
      }) as TableInstance<TData>,
    [options, setRowSelection, setExpanded, emptyCoreRowModel],
  );

  // Build column objects
  const columns: Column<TData>[] = useMemo(
    () => buildColumns(columnDefs, { getState, ...stateSetters }, stateSetters),
    [columnDefs, getState, stateSetters],
  );

  // Ordered columns
  const orderedColumns = useMemo(() => {
    if (state.columnOrder.length === 0) return columns;
    const ordered: Column<TData>[] = [];
    const remaining = [...columns];
    for (const id of state.columnOrder) {
      const idx = remaining.findIndex((c) => c.id === id);
      if (idx >= 0) {
        ordered.push(remaining[idx]);
        remaining.splice(idx, 1);
      }
    }
    ordered.push(...remaining);
    return ordered;
  }, [columns, state.columnOrder]);

  // Visible columns
  const visibleColumns = useMemo(
    () => orderedColumns.filter((c) => c.getIsVisible()),
    [orderedColumns],
  );

  // Pinned columns
  const leftPinnedColumns = useMemo(
    () => visibleColumns.filter((c) => c.getIsPinned() === "left"),
    [visibleColumns],
  );
  const rightPinnedColumns = useMemo(
    () => visibleColumns.filter((c) => c.getIsPinned() === "right"),
    [visibleColumns],
  );
  const centerColumns = useMemo(
    () => visibleColumns.filter((c) => c.getIsPinned() === false),
    [visibleColumns],
  );

  // Row model pipeline
  const coreRowModel = useMemo(() => {
    const cm = getCoreRowModel(data, columns, rowModelTable);
    coreRowModelRef.current = cm;
    return cm;
  }, [data, columns, rowModelTable]);

  const filteredRowModel = useMemo(() => {
    if (options.manualFiltering) return coreRowModel;
    return getFilteredRowModel(
      coreRowModel,
      state.columnFilters,
      state.globalFilter,
      columns,
      options.globalFilterFn,
    );
  }, [coreRowModel, state.columnFilters, state.globalFilter, columns, options.manualFiltering, options.globalFilterFn]);

  const sortedRowModel = useMemo(() => {
    if (options.manualSorting) return filteredRowModel;
    return getSortedRowModel(filteredRowModel, state.sorting, columns);
  }, [filteredRowModel, state.sorting, columns, options.manualSorting]);

  const groupedRowModel = useMemo(() => {
    if (options.manualGrouping || state.grouping.length === 0) return sortedRowModel;
    return getGroupedRowModel(sortedRowModel, state.grouping, columns, rowModelTable);
  }, [sortedRowModel, state.grouping, columns, options.manualGrouping, rowModelTable]);

  const expandedRowModel = useMemo(
    () => getExpandedRowModel(groupedRowModel, state.expanded),
    [groupedRowModel, state.expanded],
  );

  const prePaginationRowModel = expandedRowModel;

  const paginatedRowModel = useMemo(() => {
    if (options.manualPagination) return prePaginationRowModel;
    return getPaginatedRowModel(prePaginationRowModel, state.pagination);
  }, [prePaginationRowModel, state.pagination, options.manualPagination]);

  const selectedRowModel = useMemo(
    () => getSelectedRowModel(coreRowModel, state.rowSelection),
    [coreRowModel, state.rowSelection],
  );

  // Page count
  const pageCount = useMemo(() => {
    if (options.pageCount != null) return options.pageCount;
    return Math.ceil(prePaginationRowModel.rows.length / state.pagination.pageSize);
  }, [options.pageCount, prePaginationRowModel, state.pagination.pageSize]);

  // Build table instance
  const table: TableInstance<TData> = useMemo(() => {
    const inst: TableInstance<TData> = {
      options,
      getState: () => state,
      setState: (updater) => {
        const next = resolveUpdater(updater, state);
        setSorting(next.sorting);
        setColumnFilters(next.columnFilters);
        setGlobalFilter(next.globalFilter);
        setRowSelection(next.rowSelection);
        setColumnVisibility(next.columnVisibility);
        setColumnOrder(next.columnOrder);
        setColumnPinning(next.columnPinning);
        setColumnSizing(next.columnSizing);
        setColumnSizingInfo(next.columnSizingInfo);
        setExpanded(next.expanded);
        setGrouping(next.grouping);
        setPagination(next.pagination);
      },
      reset: () => {
        setSorting([]);
        setColumnFilters([]);
        setGlobalFilter("");
        setRowSelection({});
        setColumnVisibility({});
        setColumnOrder([]);
        setColumnPinning({ left: [], right: [] });
        setColumnSizing({});
        setColumnSizingInfo(defaultState.columnSizingInfo);
        setExpanded({});
        setGrouping([]);
        setPagination({ pageIndex: 0, pageSize: 10 });
      },

      // Column access
      getAllColumns: () => columns,
      getAllFlatColumns: () => columns.flatMap((c) => c.getFlatColumns()),
      getAllLeafColumns: () => columns.flatMap((c) => c.getLeafColumns()),
      getColumn: (id) => columns.find((c) => c.id === id),

      // Header groups
      getHeaderGroups: () => buildHeaderGroups(visibleColumns, inst),
      getLeftHeaderGroups: () => buildHeaderGroups(leftPinnedColumns, inst),
      getCenterHeaderGroups: () => buildHeaderGroups(centerColumns, inst),
      getRightHeaderGroups: () => buildHeaderGroups(rightPinnedColumns, inst),
      getFooterGroups: () => buildHeaderGroups(visibleColumns, inst),

      // Row models
      getCoreRowModel: () => coreRowModel,
      getRowModel: () => paginatedRowModel,
      getPreFilteredRowModel: () => coreRowModel,
      getFilteredRowModel: () => filteredRowModel,
      getPreSortedRowModel: () => filteredRowModel,
      getSortedRowModel: () => sortedRowModel,
      getGroupedRowModel: () => groupedRowModel,
      getExpandedRowModel: () => expandedRowModel,
      getPrePaginationRowModel: () => prePaginationRowModel,
      getPaginationRowModel: () => paginatedRowModel,
      getSelectedRowModel: () => selectedRowModel,
      getRow: (id) => {
        const row = coreRowModel.rowsById[id];
        if (!row) throw new Error(`Row with id "${id}" not found`);
        return row;
      },

      // Sorting
      setSorting,
      resetSorting: () => setSorting([]),

      // Filtering
      setColumnFilters,
      resetColumnFilters: () => setColumnFilters([]),
      setGlobalFilter,
      resetGlobalFilter: () => setGlobalFilter(""),

      // Pagination
      setPageIndex: (updater) =>
        setPagination((prev) => ({
          ...prev,
          pageIndex: resolveUpdater(updater, prev.pageIndex),
        })),
      resetPageIndex: () =>
        setPagination((prev) => ({ ...prev, pageIndex: 0 })),
      setPageSize: (updater) =>
        setPagination((prev) => ({
          ...prev,
          pageSize: resolveUpdater(updater, prev.pageSize),
          pageIndex: 0,
        })),
      resetPageSize: () =>
        setPagination((prev) => ({ ...prev, pageSize: 10 })),
      getPageCount: () => pageCount,
      getCanPreviousPage: () => state.pagination.pageIndex > 0,
      getCanNextPage: () => state.pagination.pageIndex < pageCount - 1,
      previousPage: () =>
        setPagination((prev) => ({
          ...prev,
          pageIndex: Math.max(0, prev.pageIndex - 1),
        })),
      nextPage: () =>
        setPagination((prev) => ({
          ...prev,
          pageIndex: Math.min(pageCount - 1, prev.pageIndex + 1),
        })),
      firstPage: () =>
        setPagination((prev) => ({ ...prev, pageIndex: 0 })),
      lastPage: () =>
        setPagination((prev) => ({
          ...prev,
          pageIndex: Math.max(0, pageCount - 1),
        })),

      // Row selection
      setRowSelection,
      resetRowSelection: () => setRowSelection({}),
      toggleAllRowsSelected: (value) => {
        const next: RowSelectionState = {};
        const shouldSelect = value ?? !inst.getIsAllRowsSelected();
        if (shouldSelect) {
          coreRowModel.flatRows.forEach((r) => {
            if (r.getCanSelect()) next[r.id] = true;
          });
        }
        setRowSelection(next);
      },
      toggleAllPageRowsSelected: (value) => {
        const shouldSelect = value ?? !inst.getIsAllPageRowsSelected();
        setRowSelection((prev) => {
          const next = { ...prev };
          paginatedRowModel.rows.forEach((r) => {
            if (r.getCanSelect()) next[r.id] = shouldSelect;
          });
          return next;
        });
      },
      getIsAllRowsSelected: () =>
        coreRowModel.flatRows.filter((r) => r.getCanSelect()).every((r) => state.rowSelection[r.id]),
      getIsAllPageRowsSelected: () =>
        paginatedRowModel.rows.filter((r) => r.getCanSelect()).every((r) => state.rowSelection[r.id]),
      getIsSomeRowsSelected: () =>
        coreRowModel.flatRows.some((r) => state.rowSelection[r.id]),
      getIsSomePageRowsSelected: () =>
        paginatedRowModel.rows.some((r) => state.rowSelection[r.id]) &&
        !inst.getIsAllPageRowsSelected(),
      getToggleAllRowsSelectedHandler: () => () => inst.toggleAllRowsSelected(),
      getToggleAllPageRowsSelectedHandler: () => () => inst.toggleAllPageRowsSelected(),

      // Column visibility
      setColumnVisibility,
      resetColumnVisibility: () => setColumnVisibility({}),
      toggleAllColumnsVisible: (value) => {
        const vis: ColumnVisibilityState = {};
        const shouldShow = value ?? !inst.getIsAllColumnsVisible();
        columns.forEach((c) => { vis[c.id] = shouldShow; });
        setColumnVisibility(vis);
      },
      getIsAllColumnsVisible: () =>
        columns.every((c) => c.getIsVisible()),
      getIsSomeColumnsVisible: () =>
        columns.some((c) => c.getIsVisible()),
      getToggleAllColumnsVisibilityHandler: () => () =>
        inst.toggleAllColumnsVisible(),
      getVisibleFlatColumns: () => visibleColumns,
      getVisibleLeafColumns: () =>
        visibleColumns.flatMap((c) => c.getLeafColumns()),

      // Column ordering
      setColumnOrder,
      resetColumnOrder: () => setColumnOrder([]),

      // Column pinning
      setColumnPinning,
      resetColumnPinning: () => setColumnPinning({ left: [], right: [] }),
      getLeftFlatColumns: () => leftPinnedColumns,
      getRightFlatColumns: () => rightPinnedColumns,
      getCenterFlatColumns: () => centerColumns,
      getLeftLeafColumns: () => leftPinnedColumns.flatMap((c) => c.getLeafColumns()),
      getRightLeafColumns: () => rightPinnedColumns.flatMap((c) => c.getLeafColumns()),
      getCenterLeafColumns: () => centerColumns.flatMap((c) => c.getLeafColumns()),

      // Column sizing
      setColumnSizing,
      setColumnSizingInfo,
      resetColumnSizing: () => setColumnSizing({}),

      // Grouping
      setGrouping,
      resetGrouping: () => setGrouping([]),

      // Expanding
      setExpanded,
      resetExpanded: () => setExpanded({}),
      toggleAllRowsExpanded: (value) => {
        const shouldExpand = value ?? !inst.getIsAllRowsExpanded();
        if (shouldExpand) {
          const next: Record<string, boolean> = {};
          coreRowModel.flatRows.forEach((r) => { next[r.id] = true; });
          setExpanded(next);
        } else {
          setExpanded({});
        }
      },
      getIsAllRowsExpanded: () => {
        const exp = state.expanded;
        if (exp === true) return true;
        return coreRowModel.flatRows
          .filter((r) => r.subRows.length > 0)
          .every((r) => exp[r.id]);
      },
      getIsSomeRowsExpanded: () => {
        const exp = state.expanded;
        if (exp === true) return true;
        return Object.values(exp).some(Boolean);
      },
      getCanSomeRowsExpand: () =>
        coreRowModel.flatRows.some((r) => r.subRows.length > 0),
      getExpandedDepth: () => {
        let maxDepth = 0;
        coreRowModel.flatRows.forEach((r) => {
          if (r.depth > maxDepth) maxDepth = r.depth;
        });
        return maxDepth;
      },
    };

    return inst;
  }, [
    options, state, columns, visibleColumns, leftPinnedColumns, rightPinnedColumns,
    centerColumns, coreRowModel, filteredRowModel, sortedRowModel, groupedRowModel,
    expandedRowModel, prePaginationRowModel, paginatedRowModel, selectedRowModel, pageCount,
    setSorting, setColumnFilters, setGlobalFilter, setRowSelection,
    setColumnVisibility, setColumnOrder, setColumnPinning, setColumnSizing,
    setColumnSizingInfo, setExpanded, setGrouping, setPagination,
  ]);

  return table;
}
