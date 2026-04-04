import { useState, useCallback, useMemo, type ReactNode } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  Search, X, RefreshCw,
  ArrowUp, ArrowDown, ChevronsUpDown,
  Loader2, ChevronLeft, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UseEntityViewResult } from "@prometheus-ags/prometheus-entity-management";
import type { SortSpec } from "@prometheus-ags/prometheus-entity-management";

const SKELETON_ROW_KEYS = [
  "skeleton-row-1",
  "skeleton-row-2",
  "skeleton-row-3",
  "skeleton-row-4",
  "skeleton-row-5",
  "skeleton-row-6",
] as const;

// ── Sort header button ────────────────────────────────────────────────────

export function SortHeader({
  column,
  label,
}: {
  column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void };
  label: string;
}) {
  const sorted = column.getIsSorted();
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => column.toggleSorting(sorted === "asc")}
      className="h-auto px-0 py-0 text-xs font-medium text-[--color-text-muted] hover:bg-transparent hover:text-[--color-text-primary]"
    >
      {label}
      <span className="opacity-50">
        {sorted === "asc"  ? <ArrowUp   className="w-3 h-3" /> :
         sorted === "desc" ? <ArrowDown className="w-3 h-3" /> :
                             <ChevronsUpDown className="w-3 h-3" />}
      </span>
    </Button>
  );
}

// ── Skeleton row ──────────────────────────────────────────────────────────

function SkeletonRow({ cols }: { cols: number }) {
  const cellKeys = useMemo(
    () => Array.from({ length: cols }, (_, index) => `skeleton-cell-${cols}-${index + 1}`),
    [cols]
  );

  return (
    <tr>
      {cellKeys.map((cellKey, i) => (
        <td key={cellKey} className="px-3 py-2.5">
          <div
            className="h-3 rounded bg-[--color-surface-3] animate-pulse"
            style={{ width: `${50 + (i * 17) % 40}%` }}
          />
        </td>
      ))}
    </tr>
  );
}

// ── Main EntityTable ──────────────────────────────────────────────────────

interface EntityTableProps<T extends Record<string, unknown>> {
  viewResult: UseEntityViewResult<T>;
  columns: ColumnDef<T>[];
  getRowId?: (row: T) => string;
  selectedId?: string | null;
  onRowClick?: (row: T) => void;
  onCellEdit?: (row: T, field: string, value: unknown) => void;
  searchPlaceholder?: string;
  paginationMode?: "none" | "loadMore" | "pages";
  pageSize?: number;
  toolbarActions?: ReactNode;
  emptyMessage?: string;
}

export function EntityTable<T extends Record<string, unknown>>({
  viewResult,
  columns,
  getRowId = (r) => String((r as Record<string, unknown>).id),
  selectedId,
  onRowClick,
  searchPlaceholder = "Search…",
  paginationMode = "loadMore",
  pageSize = 20,
  toolbarActions,
  emptyMessage = "No results",
}: EntityTableProps<T>) {
  const {
    items,
    isLoading,
    isFetching,
    isRemoteFetching,
    isShowingLocalPending,
    hasNextPage,
    fetchNextPage,
    isFetchingMore,
    viewTotal,
    setSort,
    setSearch,
    refetch,
  } = viewResult;

  const [sorting, setSorting]     = useState<SortingState>([]);
  const [rowSelection]            = useState<RowSelectionState>({});
  const [colVis]                  = useState<VisibilityState>({});
  const [search, setSearchLocal]  = useState("");
  const [page, setPage]           = useState(1);

  const handleSort = useCallback(
    (updater: SortingState | ((prev: SortingState) => SortingState)) => {
      const next = typeof updater === "function" ? updater(sorting) : updater;
      setSorting(next);
      setSort(
        next.length
          ? next.map((s) => ({ field: s.id, direction: s.desc ? "desc" : "asc" }) as SortSpec[number])
          : null
      );
    },
    [sorting, setSort]
  );

  const handleSearch = useCallback(
    (v: string) => { setSearchLocal(v); setSearch(v); },
    [setSearch]
  );

  const pagedItems = useMemo(
    () =>
      paginationMode === "pages"
        ? items.slice((page - 1) * pageSize, page * pageSize)
        : items,
    [items, paginationMode, page, pageSize]
  );

  const totalPages = Math.ceil(items.length / pageSize);

  const table = useReactTable<T>({
    data: pagedItems,
    columns,
    getRowId,
    manualSorting: true,
    state: { sorting, rowSelection, columnVisibility: colVis },
    onSortingChange: handleSort,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2.5 shrink-0">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[--color-text-muted]" />
          <input
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder={searchPlaceholder}
            className="w-full h-7 pl-8 pr-7 rounded-md bg-muted/70 text-xs text-[--color-text-primary] placeholder:text-[--color-text-muted] focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {search && (
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => handleSearch("")}
              className="absolute right-1 top-1/2 -translate-y-1/2 text-[--color-text-muted] hover:bg-transparent hover:text-[--color-text-primary]"
            >
              <X className="w-3 h-3" />
            </Button>
          )}
        </div>

        {isShowingLocalPending && (
          <span className="text-[10px] text-[--color-text-muted] flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            Loading full results…
          </span>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-xs text-[--color-text-muted]">
            {viewTotal != null ? `${viewTotal} items` : ""}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={refetch}
            disabled={isRemoteFetching}
            className="text-[--color-text-muted] hover:text-[--color-text-primary]"
          >
            <RefreshCw className={cn("w-3.5 h-3.5", isRemoteFetching && "animate-spin")} />
          </Button>
          {toolbarActions}
        </div>
      </div>

      {/* Table body */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id} className="bg-[--color-surface-2]">
                {hg.headers.map((h) => (
                  <th
                    key={h.id}
                    style={{ width: h.getSize() }}
                    className="px-3 py-2 text-left font-normal"
                  >
                    {h.isPlaceholder
                      ? null
                      : flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading
              ? SKELETON_ROW_KEYS.map((rowKey) => (
                  <SkeletonRow key={rowKey} cols={columns.length} />
                ))
              : table.getRowModel().rows.length === 0
              ? (
                <tr>
                  <td
                    colSpan={columns.length}
                    className="px-4 py-16 text-center text-sm text-[--color-text-muted]"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )
              : table.getRowModel().rows.map((row) => {
                  const isSelected = row.id === selectedId;
                  return (
                    <tr
                      key={row.id}
                      onClick={() => onRowClick?.(row.original)}
                      className={cn(
                        "group/row cursor-pointer transition-colors",
                        isSelected
                          ? "bg-[--color-ember-glow]"
                          : "hover:bg-[--color-surface-2]"
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          style={{ width: cell.column.getSize() }}
                          className="px-3 py-2.5 text-sm text-[--color-text-primary]"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/30 shrink-0 text-xs text-[--color-text-muted]">
        <span>{isFetching && !isLoading ? "Updating…" : `${items.length} loaded`}</span>

        {paginationMode === "loadMore" && hasNextPage && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={fetchNextPage}
            disabled={isFetchingMore}
            className="text-xs disabled:opacity-50"
          >
            {isFetchingMore ? (
              <><Loader2 className="w-3 h-3 animate-spin" />Loading…</>
            ) : (
              "Load more"
            )}
          </Button>
        )}

        {paginationMode === "pages" && totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="disabled:opacity-50"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            <span>Page {page} of {totalPages}</span>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="disabled:opacity-50"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
