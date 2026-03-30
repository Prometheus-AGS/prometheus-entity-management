/**
 * ui/data-table-column-header.tsx
 *
 * Sortable table column header with sort indicators.
 */
import type { Column } from "../table/types";
import { cn } from "./utils";

interface DataTableColumnHeaderProps<TData> {
  column: Column<TData>;
  title: string;
  className?: string;
}

export function DataTableColumnHeader<TData>({
  column,
  title,
  className,
}: DataTableColumnHeaderProps<TData>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      className={cn(
        "flex items-center gap-1 -ml-2 px-2 py-1.5 rounded-lg hover:bg-muted/60 text-left font-semibold transition-colors",
        className,
      )}
      onClick={(e) => column.toggleSorting(undefined, e.shiftKey)}
    >
      <span>{title}</span>
      <span className="ml-1 flex flex-col text-xs leading-none">
        {sorted === "asc" ? (
          <SortAscIcon className="h-3.5 w-3.5" />
        ) : sorted === "desc" ? (
          <SortDescIcon className="h-3.5 w-3.5" />
        ) : (
          <SortNoneIcon className="h-3.5 w-3.5 text-muted-foreground/50" />
        )}
      </span>
      {column.getSortIndex() >= 0 && (
        <span className="ml-0.5 text-[10px] text-muted-foreground tabular-nums">
          {column.getSortIndex() + 1}
        </span>
      )}
    </button>
  );
}

function SortAscIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <title>Sorted ascending</title>
      <path fillRule="evenodd" d="M8 3.5a.5.5 0 01.354.146l3.5 3.5a.5.5 0 11-.708.708L8 4.707 4.854 7.854a.5.5 0 11-.708-.708l3.5-3.5A.5.5 0 018 3.5z" />
    </svg>
  );
}

function SortDescIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <title>Sorted descending</title>
      <path fillRule="evenodd" d="M8 12.5a.5.5 0 01-.354-.146l-3.5-3.5a.5.5 0 11.708-.708L8 11.293l3.146-3.147a.5.5 0 11.708.708l-3.5 3.5A.5.5 0 018 12.5z" />
    </svg>
  );
}

function SortNoneIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className={className} aria-hidden>
      <title>Not sorted</title>
      <path d="M8 3.5a.5.5 0 01.354.146l2.5 2.5a.5.5 0 11-.708.708L8 4.707 5.854 6.854a.5.5 0 11-.708-.708l2.5-2.5A.5.5 0 018 3.5z" />
      <path d="M8 12.5a.5.5 0 01-.354-.146l-2.5-2.5a.5.5 0 11.708-.708L8 11.293l2.146-2.147a.5.5 0 11.708.708l-2.5 2.5A.5.5 0 018 12.5z" />
    </svg>
  );
}
