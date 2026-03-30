/**
 * ui/data-table-toolbar.tsx
 *
 * Shared toolbar across all view modes — search, active filters,
 * preset pickers, column visibility, view mode switcher, and refresh.
 */
import { useState, type ReactNode } from "react";
import type { TableInstance, ViewMode } from "../table/types";
import { ViewModeSwitcher } from "./view-mode-switcher";
import { cn } from "./utils";

interface DataTableToolbarProps<TData> {
  table: TableInstance<TData>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  enabledViewModes?: ViewMode[];
  enableSearch?: boolean;
  onRefresh?: () => void;
  showColumnVisibility?: boolean;
  className?: string;
  children?: ReactNode;
}

export function DataTableToolbar<TData>({
  table,
  viewMode,
  onViewModeChange,
  enabledViewModes,
  enableSearch = true,
  onRefresh,
  showColumnVisibility = true,
  className,
  children,
}: DataTableToolbarProps<TData>) {
  const [colVisOpen, setColVisOpen] = useState(false);
  const globalFilter = table.getState().globalFilter;
  const columnFilters = table.getState().columnFilters;
  const hasFilters = columnFilters.length > 0;

  return (
    <div className={cn("flex items-center justify-between gap-2", className)}>
      <div className="flex flex-1 items-center gap-2">
        {enableSearch && (
          <input
            type="search"
            placeholder="Search..."
            value={String(globalFilter ?? "")}
            onChange={(e) => table.setGlobalFilter(e.target.value || undefined)}
            className="flex h-9 w-full max-w-sm rounded-lg bg-muted/60 px-3 py-1 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:bg-muted transition-colors"
            aria-label="Search table"
          />
        )}

        {hasFilters && (
          <div className="flex items-center gap-1">
            {columnFilters.map((f) => (
              <span
                key={f.id}
                className="inline-flex items-center gap-1 rounded-full bg-muted/70 px-2.5 py-0.5 text-xs font-medium text-foreground"
              >
                {f.id}: {String(f.value)}
                <button
                  type="button"
                  onClick={() =>
                    table.setColumnFilters((prev) =>
                      prev.filter((cf) => cf.id !== f.id),
                    )
                  }
                  className="ml-0.5 rounded-full hover:bg-muted p-0.5 transition-colors"
                  aria-label={`Remove filter ${f.id}`}
                >
                  <XIcon className="h-3 w-3" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => table.resetColumnFilters()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {children}
      </div>

      <div className="flex items-center gap-1.5">
        <ViewModeSwitcher
          mode={viewMode}
          onModeChange={onViewModeChange}
          enabledModes={enabledViewModes}
        />

        {showColumnVisibility && viewMode === "table" && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setColVisOpen(!colVisOpen)}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-muted/60 px-3 text-sm font-medium text-foreground hover:bg-muted transition-colors"
            >
              <ColumnsIcon className="h-4 w-4" />
              Columns
            </button>
            {colVisOpen && (
              <ColumnVisibilityMenu
                table={table}
                onClose={() => setColVisOpen(false)}
              />
            )}
          </div>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Refresh"
            aria-label="Refresh"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RefreshIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Column visibility dropdown
// ---------------------------------------------------------------------------
function ColumnVisibilityMenu<TData>({
  table,
  onClose,
}: {
  table: TableInstance<TData>;
  onClose: () => void;
}) {
  const columns = table.getAllLeafColumns().filter((c) => c.getCanHide());

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-40 cursor-default bg-transparent p-0"
        onClick={onClose}
        aria-label="Close column visibility menu"
      />
      <div className="absolute right-0 z-50 mt-1 min-w-[180px] rounded-xl bg-popover p-2 shadow-xl">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Toggle columns
        </div>
        {columns.map((column) => (
          <label
            key={column.id}
            className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-muted/60 transition-colors"
          >
            <input
              type="checkbox"
              checked={column.getIsVisible()}
              onChange={() => column.toggleVisibility()}
              className="h-4 w-4 rounded accent-primary"
            />
            {typeof column.columnDef.header === "string"
              ? column.columnDef.header
              : column.id}
          </label>
        ))}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function XIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Close</title>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function ColumnsIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Columns</title>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="12" y1="3" x2="12" y2="21" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Refresh</title>
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
