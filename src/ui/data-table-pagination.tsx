/**
 * ui/data-table-pagination.tsx
 *
 * Shared pagination across all view modes — page nav,
 * page size selector, and load-more button mode.
 */
import { useId, type ReactNode } from "react";
import type { TableInstance } from "../table/types";
import { cn } from "./utils";

interface DataTablePaginationProps<TData> {
  table: TableInstance<TData>;
  mode?: "pages" | "loadMore" | "none";
  pageSizeOptions?: number[];
  onLoadMore?: () => void;
  totalCount?: number;
  className?: string;
}

export function DataTablePagination<TData>({
  table,
  mode = "pages",
  pageSizeOptions = [10, 20, 30, 50, 100],
  onLoadMore,
  totalCount,
  className,
}: DataTablePaginationProps<TData>) {
  const pageSizeId = useId();
  if (mode === "none") return null;

  const state = table.getState();
  const count = totalCount ?? table.getPrePaginationRowModel().rows.length;

  if (mode === "loadMore") {
    const hasMore = table.getCanNextPage();
    if (!hasMore) return null;
    return (
      <div className={cn("flex justify-center py-4", className)}>
        <button
          type="button"
          onClick={onLoadMore ?? (() => table.nextPage())}
          className="inline-flex items-center justify-center rounded-lg bg-muted/60 px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
        >
          Load more
        </button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-4",
        className,
      )}
    >
      <div className="flex-1 text-sm text-muted-foreground">
        {count > 0 && (
          <span>
            Showing {state.pagination.pageIndex * state.pagination.pageSize + 1}
            {" - "}
            {Math.min(
              (state.pagination.pageIndex + 1) * state.pagination.pageSize,
              count,
            )}{" "}
            of {count}
          </span>
        )}
      </div>

      <div className="flex items-center gap-6 lg:gap-8">
        <div className="flex items-center gap-2">
          <label htmlFor={pageSizeId} className="text-sm font-medium">
            Rows per page
          </label>
          <select
            id={pageSizeId}
            value={state.pagination.pageSize}
            onChange={(e) => table.setPageSize(Number(e.target.value))}
            className="h-8 w-[70px] rounded-lg bg-muted/60 px-2 text-sm focus-visible:outline-none focus-visible:bg-muted transition-colors"
            aria-label="Rows per page"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 text-sm font-medium">
          Page {state.pagination.pageIndex + 1} of {table.getPageCount()}
        </div>

        <div className="flex items-center gap-1">
          <PaginationButton
            onClick={() => table.firstPage()}
            disabled={!table.getCanPreviousPage()}
            label="First page"
          >
            <ChevronsLeftIcon className="h-4 w-4" />
          </PaginationButton>
          <PaginationButton
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            label="Previous page"
          >
            <ChevronLeftIcon className="h-4 w-4" />
          </PaginationButton>
          <PaginationButton
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            label="Next page"
          >
            <ChevronRightIcon className="h-4 w-4" />
          </PaginationButton>
          <PaginationButton
            onClick={() => table.lastPage()}
            disabled={!table.getCanNextPage()}
            label="Last page"
          >
            <ChevronsRightIcon className="h-4 w-4" />
          </PaginationButton>
        </div>
      </div>
    </div>
  );
}

function PaginationButton({
  onClick,
  disabled,
  label,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40 transition-colors"
    >
      {children}
      <span className="sr-only">{label}</span>
    </button>
  );
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Chevron left</title>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Chevron right</title>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function ChevronsLeftIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Chevrons left</title>
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  );
}

function ChevronsRightIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Chevrons right</title>
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  );
}
