/**
 * ui/EntityTable.tsx
 *
 * Production data table: TanStack Table + sorting synced to useEntityView,
 * inline cell editing, load-more / page pagination, skeleton loading, empty state.
 */
import React, { useState, useCallback, useMemo } from "react";
import { useReactTable, getCoreRowModel, getSortedRowModel, flexRender, type ColumnDef, type SortingState, type RowSelectionState, type VisibilityState } from "@tanstack/react-table";
import { Search, X, RefreshCw, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./utils";
import type { UseEntityViewResult } from "../view/use-entity-view";

// ---------------------------------------------------------------------------
// Inline cell editor
// ---------------------------------------------------------------------------
export function InlineCellEditor({ initialValue, onCommit, onCancel, className }: { initialValue: string; onCommit: (v: string) => void; onCancel: () => void; className?: string }) {
  const [value, setValue] = useState(initialValue);
  return (
    <input value={value} onChange={e => setValue(e.target.value)} autoFocus
      onBlur={() => { if (value !== initialValue) onCommit(value); else onCancel(); }}
      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (value !== initialValue) onCommit(value); else onCancel(); } if (e.key === "Escape") { e.preventDefault(); onCancel(); } e.stopPropagation(); }}
      onClick={e => e.stopPropagation()}
      className={cn("h-7 px-2 py-0 text-sm rounded border border-ring bg-background focus:outline-none w-full", className)} />
  );
}

// ---------------------------------------------------------------------------
// EntityTable
// ---------------------------------------------------------------------------
export interface EntityTableProps<T extends object> {
  viewResult: UseEntityViewResult<T>;
  columns: ColumnDef<T>[];
  getRowId?: (row: T) => string;
  selectedId?: string | null;
  onRowClick?: (row: T) => void;
  onCellEdit?: (row: T, field: string, value: unknown) => void;
  onBulkAction?: (rows: T[]) => React.ReactNode;
  paginationMode?: "none" | "loadMore" | "pages";
  pageSize?: number;
  searchPlaceholder?: string;
  searchFields?: string[];
  toolbarChildren?: React.ReactNode;
  showToolbar?: boolean;
  emptyState?: React.ReactNode;
  className?: string;
}

export function EntityTable<T extends object>({ viewResult, columns, getRowId = r => String((r as Record<string, unknown>).id), selectedId, onRowClick, onCellEdit, onBulkAction, paginationMode = "loadMore", pageSize = 50, searchPlaceholder = "Search…", searchFields, toolbarChildren, showToolbar = true, emptyState, className }: EntityTableProps<T>) {
  const { items, isLoading, isFetching, isRemoteFetching, isShowingLocalPending, hasNextPage, fetchNextPage, isFetchingMore, viewTotal, setSort, setSearch, refetch } = viewResult;
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [colVis, setColVis] = useState<VisibilityState>({});
  const [search, setSearchLocal] = useState("");
  const [editingCell, setEditingCell] = useState<{ rowId: string; field: string; value: string } | null>(null);
  const [page, setPage] = useState(1);

  const handleSort = useCallback((updater: SortingState | ((prev: SortingState) => SortingState)) => {
    const next = typeof updater === "function" ? updater(sorting) : updater;
    setSorting(next);
    setSort(next.length ? next.map((s) => ({ field: s.id, direction: s.desc ? ("desc" as const) : ("asc" as const) })) : null);
  }, [sorting, setSort]);

  const handleSearch = useCallback((v: string) => { setSearchLocal(v); setSearch(v); }, [setSearch]);

  const pagedItems = useMemo(() => paginationMode === "pages" ? items.slice((page - 1) * pageSize, page * pageSize) : items, [items, paginationMode, page, pageSize]);
  const totalPages = Math.ceil(items.length / pageSize);

  const table = useReactTable<T>({
    data: pagedItems, columns, getRowId, manualSorting: true,
    state: { sorting, rowSelection, columnVisibility: colVis },
    onSortingChange: handleSort, onRowSelectionChange: setRowSelection, onColumnVisibilityChange: setColVis,
    getCoreRowModel: getCoreRowModel(), getSortedRowModel: getSortedRowModel(), enableRowSelection: true,
  });

  const selectedRows = table.getSelectedRowModel().rows.map(r => r.original);

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {showToolbar && (
        <div className="flex items-center gap-2 px-3 py-2.5 border-b shrink-0">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <input value={search} onChange={e => handleSearch(e.target.value)} placeholder={searchPlaceholder}
              className="w-full h-7 pl-8 pr-7 rounded-md bg-muted/50 border text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors" />
            {search && <button onClick={() => handleSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-3.5 h-3.5" /></button>}
          </div>
          {isShowingLocalPending && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" />Loading complete results…</span>}
          <div className="ml-auto flex items-center gap-1.5">
            {selectedRows.length > 0 && onBulkAction && (<><span className="text-xs text-muted-foreground">{selectedRows.length} selected</span>{onBulkAction(selectedRows)}</>)}
            <span className="text-xs text-muted-foreground">{viewTotal != null ? `${viewTotal}` : ""}</span>
            <button onClick={refetch} disabled={isRemoteFetching} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"><RefreshCw className={cn("w-3.5 h-3.5", isRemoteFetching && "animate-spin")} /></button>
            {toolbarChildren}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map(hg => (
              <tr key={hg.id} className="bg-muted/50 border-b">
                {hg.headers.map(h => (
                  <th key={h.id} style={{ width: h.getSize() }} className="px-3 py-2 text-left font-normal text-muted-foreground">
                    {h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? Array.from({ length: 6 }).map((_, i) => (
              <tr key={i} className="border-b">
                {columns.map((_, j) => <td key={j} className="px-3 py-2.5"><div className="h-3 rounded bg-muted animate-pulse" style={{ width: `${50 + ((i * 7 + j * 13) % 40)}%` }} /></td>)}
              </tr>
            )) : table.getRowModel().rows.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-16 text-center text-sm text-muted-foreground">{emptyState ?? "No results"}</td></tr>
            ) : table.getRowModel().rows.map(row => {
              const isSelected = row.id === selectedId;
              return (
                <tr key={row.id} onClick={() => onRowClick?.(row.original)}
                  className={cn("border-b group/row cursor-pointer transition-colors", isSelected ? "bg-primary/5" : "hover:bg-muted/40")}>
                  {row.getVisibleCells().map(cell => {
                    const meta = cell.column.columnDef.meta?.entityMeta;
                    const isEditingThis = editingCell?.rowId === row.id && editingCell?.field === cell.column.id;
                    return (
                      <td key={cell.id} style={{ width: cell.column.getSize() }} className="px-3 py-2.5"
                        onDoubleClick={e => { if (!meta?.editable || !onCellEdit) return; e.stopPropagation(); setEditingCell({ rowId: row.id, field: cell.column.id, value: String(cell.getValue() ?? "") }); }}>
                        {isEditingThis
                          ? <InlineCellEditor initialValue={editingCell!.value} onCommit={v => { onCellEdit!(row.original, cell.column.id, v); setEditingCell(null); }} onCancel={() => setEditingCell(null)} />
                          : flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between px-3 py-2 border-t shrink-0 text-xs text-muted-foreground">
        <span>{isFetching && !isLoading ? "Updating…" : `${items.length} loaded`}</span>
        {paginationMode === "loadMore" && hasNextPage && (
          <button onClick={fetchNextPage} disabled={isFetchingMore} className="flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs hover:bg-muted transition-colors disabled:opacity-50">
            {isFetchingMore ? <><Loader2 className="w-3 h-3 animate-spin" />Loading…</> : "Load more"}
          </button>
        )}
        {paginationMode === "pages" && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="p-1 rounded hover:bg-muted disabled:opacity-50"><ChevronLeft className="w-3.5 h-3.5" /></button>
            <span>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="p-1 rounded hover:bg-muted disabled:opacity-50"><ChevronRight className="w-3.5 h-3.5" /></button>
          </div>
        )}
      </div>
    </div>
  );
}
