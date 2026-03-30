/**
 * ui/data-table-filter.tsx
 *
 * Per-column filter popover controls. Renders the appropriate
 * filter input based on column meta filterType.
 */
import { useState, useRef, useEffect, useId } from "react";
import type { Column } from "../table/types";
import { cn } from "./utils";

interface DataTableFilterProps<TData> {
  column: Column<TData>;
  className?: string;
}

export function DataTableFilter<TData>({
  column,
  className,
}: DataTableFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const filterType = column.columnDef.meta?.entityMeta?.filterType ?? "text";
  const isFiltered = column.getIsFiltered();

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        !triggerRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  return (
    <div className={cn("relative inline-block", className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex h-7 items-center rounded-md border px-2 text-xs",
          isFiltered
            ? "border-primary bg-primary/10 text-primary"
            : "border-input bg-background text-muted-foreground hover:bg-accent",
        )}
      >
        <FilterIcon className="mr-1 h-3 w-3" />
        Filter
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute z-50 mt-1 min-w-[200px] rounded-md border bg-popover p-3 shadow-md"
        >
          <FilterControl column={column} filterType={filterType} onClose={() => setIsOpen(false)} />
        </div>
      )}
    </div>
  );
}

function FilterControl<TData>({
  column,
  filterType,
  onClose: _onClose,
}: {
  column: Column<TData>;
  filterType: string;
  onClose: () => void;
}) {
  switch (filterType) {
    case "text":
      return <TextFilter column={column} />;
    case "number":
      return <NumberFilter column={column} />;
    case "boolean":
      return <BooleanFilter column={column} />;
    case "enum":
      return <EnumFilter column={column} />;
    case "date":
    case "dateRange":
      return <DateFilter column={column} />;
    default:
      return <TextFilter column={column} />;
  }
}

function TextFilter<TData>({ column }: { column: Column<TData> }) {
  const id = useId();
  const value = (column.getFilterValue() as string) ?? "";
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-xs font-medium">
        Contains
      </label>
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => column.setFilterValue(e.target.value || undefined)}
        placeholder="Filter..."
        className="flex h-8 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      />
      {value && (
        <button
          type="button"
          onClick={() => column.setFilterValue(undefined)}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      )}
    </div>
  );
}

function NumberFilter<TData>({ column }: { column: Column<TData> }) {
  const minId = useId();
  const maxId = useId();
  const value = (column.getFilterValue() as [number?, number?]) ?? [undefined, undefined];
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium">Range</span>
      <div className="flex items-center gap-2">
        <input
          id={minId}
          type="number"
          value={value[0] ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            column.setFilterValue([v, value[1]]);
          }}
          placeholder="Min"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          aria-label="Minimum value"
        />
        <span className="text-muted-foreground">–</span>
        <input
          id={maxId}
          type="number"
          value={value[1] ?? ""}
          onChange={(e) => {
            const v = e.target.value === "" ? undefined : Number(e.target.value);
            column.setFilterValue([value[0], v]);
          }}
          placeholder="Max"
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          aria-label="Maximum value"
        />
      </div>
    </div>
  );
}

function BooleanFilter<TData>({ column }: { column: Column<TData> }) {
  const value = column.getFilterValue() as boolean | undefined;
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">Value</p>
      <div className="flex gap-2">
        {[
          { label: "All", val: undefined },
          { label: "True", val: true },
          { label: "False", val: false },
        ].map(({ label, val }) => (
          <button
            key={label}
            type="button"
            onClick={() => column.setFilterValue(val)}
            className={cn(
              "inline-flex h-7 items-center rounded-md border px-3 text-xs font-medium transition-colors",
              value === val
                ? "border-primary bg-primary text-primary-foreground"
                : "border-input bg-background hover:bg-accent",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function EnumFilter<TData>({ column }: { column: Column<TData> }) {
  const options = column.columnDef.meta?.entityMeta?.enumOptions ?? [];
  const selected = new Set<string>(
    (column.getFilterValue() as string[] | undefined) ?? [],
  );

  function toggle(val: string) {
    const next = new Set(selected);
    if (next.has(val)) next.delete(val);
    else next.add(val);
    column.setFilterValue(next.size > 0 ? Array.from(next) : undefined);
  }

  return (
    <fieldset className="space-y-2 border-0 p-0">
      <legend className="text-xs font-medium">Select values</legend>
      <div className="max-h-[200px] space-y-1 overflow-auto">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent cursor-pointer"
          >
            <input
              type="checkbox"
              checked={selected.has(opt.value)}
              onChange={() => toggle(opt.value)}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-ring"
            />
            {opt.color && (
              <span
                className="h-2 w-2 rounded-full"
                style={{ backgroundColor: opt.color }}
              />
            )}
            {opt.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function DateFilter<TData>({ column }: { column: Column<TData> }) {
  const startId = useId();
  const endId = useId();
  const value = (column.getFilterValue() as [string?, string?]) ?? [undefined, undefined];
  return (
    <div className="space-y-2">
      <span className="text-xs font-medium">Date range</span>
      <div className="space-y-1">
        <input
          id={startId}
          type="date"
          value={value[0] ?? ""}
          onChange={(e) =>
            column.setFilterValue([e.target.value || undefined, value[1]])
          }
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          aria-label="Start date"
        />
        <input
          id={endId}
          type="date"
          value={value[1] ?? ""}
          onChange={(e) =>
            column.setFilterValue([value[0], e.target.value || undefined])
          }
          className="flex h-8 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
          aria-label="End date"
        />
      </div>
    </div>
  );
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Filter</title>
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}
