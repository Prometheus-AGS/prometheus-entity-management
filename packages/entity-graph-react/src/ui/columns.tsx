/**
 * ui/columns.tsx
 *
 * Typed column builders for EntityTable.
 * Each column carries TanStack Table config + entity-store metadata.
 * The metadata drives both rendering AND the filter toolbar.
 */
import type { ReactNode } from "react";
import type { ColumnDef } from "@tanstack/react-table";

export type ColumnFilterType = "text" | "number" | "date" | "dateRange" | "boolean" | "enum" | "relation" | "none";

export interface EntityColumnMeta<TEntity> {
  field: keyof TEntity;
  filterType: ColumnFilterType;
  enumOptions?: Array<{ label: string; value: string; color?: string }>;
  relationEntityType?: string;
  editable?: boolean;
  hideable?: boolean;
}

declare module "@tanstack/react-table" {
  // biome-ignore lint/correctness/noUnusedVariables: TValue must match @tanstack/react-table ColumnMeta
  interface ColumnMeta<TData, TValue> {
    entityMeta?: EntityColumnMeta<TData>;
  }
}

// ---------------------------------------------------------------------------
// Sort header
// ---------------------------------------------------------------------------
export function SortHeader({ column, label }: { column: { getIsSorted: () => false | "asc" | "desc"; toggleSorting: (desc?: boolean) => void }; label: string }) {
  const sorted = column.getIsSorted();
  return (
    <button type="button" onClick={() => column.toggleSorting(sorted === "asc")}
      className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors">
      {label}
      <span className="opacity-50 group-hover:opacity-100 text-[10px]">
        {sorted === "asc" ? "↑" : sorted === "desc" ? "↓" : "↕"}
      </span>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Selection column
// ---------------------------------------------------------------------------
export function selectionColumn<T>(): ColumnDef<T> {
  return {
    id: "__select__", size: 40, enableSorting: false, enableHiding: false,
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => {
          if (el) el.indeterminate = table.getIsSomePageRowsSelected();
        }}
        onChange={(e) => table.toggleAllPageRowsSelected(e.target.checked)}
        className="rounded border-border"
        aria-label="Select all rows on this page"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={(e) => row.toggleSelected(e.target.checked)}
        onClick={(e) => e.stopPropagation()}
        className="rounded border-border"
        aria-label={`Select row ${row.id}`}
      />
    ),
  };
}

// ---------------------------------------------------------------------------
// Column builders
// ---------------------------------------------------------------------------
export function textColumn<T>(opts: { field: keyof T & string; header: string; size?: number; editable?: boolean; filterType?: ColumnFilterType; cell?: (v: string, row: T) => ReactNode }): ColumnDef<T> {
  const { field, header, size = 200, editable = false, filterType = "text", cell } = opts;
  return {
    id: field, accessorKey: field, size,
    header: ({ column }) => <SortHeader column={column} label={header} />,
    cell: ({ getValue, row }) => { const v = getValue() as string; return cell ? cell(v, row.original) : <span className="truncate block" title={v}>{v}</span>; },
    meta: { entityMeta: { field, filterType, editable, hideable: true } },
  };
}

export function numberColumn<T>(opts: { field: keyof T & string; header: string; size?: number; format?: (v: number) => string; editable?: boolean }): ColumnDef<T> {
  const { field, header, size = 100, format = v => v.toLocaleString(), editable = false } = opts;
  return {
    id: field, accessorKey: field, size,
    header: ({ column }) => <SortHeader column={column} label={header} />,
    cell: ({ getValue }) => { const v = getValue() as number | null; return <span className="tabular-nums text-right block">{v != null ? format(v) : "—"}</span>; },
    meta: { entityMeta: { field, filterType: "number", editable, hideable: true } },
  };
}

export function dateColumn<T>(opts: { field: keyof T & string; header: string; size?: number; format?: Intl.DateTimeFormatOptions }): ColumnDef<T> {
  const { field, header, size = 140, format = { year: "numeric", month: "short", day: "numeric" } } = opts;
  return {
    id: field, accessorKey: field, size,
    header: ({ column }) => <SortHeader column={column} label={header} />,
    cell: ({ getValue }) => { const v = getValue() as string | null; return v ? <span className="text-sm">{new Date(v).toLocaleDateString(undefined, format)}</span> : <span className="text-muted-foreground">—</span>; },
    meta: { entityMeta: { field, filterType: "dateRange", hideable: true } },
  };
}

export function booleanColumn<T>(opts: { field: keyof T & string; header: string; size?: number; trueLabel?: string; falseLabel?: string }): ColumnDef<T> {
  const { field, header, size = 80, trueLabel = "Yes", falseLabel = "No" } = opts;
  return {
    id: field, accessorKey: field, size, header,
    cell: ({ getValue }) => { const v = getValue() as boolean; return <span className={v ? "text-green-600" : "text-muted-foreground"}>{v ? trueLabel : falseLabel}</span>; },
    meta: { entityMeta: { field, filterType: "boolean", hideable: true } },
  };
}

export function enumColumn<T>(opts: { field: keyof T & string; header: string; options: Array<{ value: string; label: string; className?: string }>; size?: number; editable?: boolean }): ColumnDef<T> {
  const { field, header, options, size = 120, editable = false } = opts;
  const map = new Map(options.map(o => [o.value, o]));
  return {
    id: field, accessorKey: field, size,
    header: ({ column }) => <SortHeader column={column} label={header} />,
    cell: ({ getValue }) => { const v = getValue() as string; const opt = map.get(v); return opt ? <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium border ${opt.className ?? "bg-muted text-muted-foreground border-border"}`}>{opt.label}</span> : <span className="text-xs text-muted-foreground">{v}</span>; },
    meta: { entityMeta: { field, filterType: "enum", enumOptions: options.map(o => ({ label: o.label, value: o.value })), editable, hideable: true } },
  };
}

export interface ActionItem<T> { label: string; icon?: React.ComponentType<{ className?: string }>; onClick: (row: T) => void; destructive?: boolean; separator?: boolean; hidden?: (row: T) => boolean; disabled?: (row: T) => boolean; }

export function actionsColumn<T>(actions: ActionItem<T>[]): ColumnDef<T> {
  return {
    id: "__actions__", size: 48, enableSorting: false, enableHiding: false, header: () => null,
    cell: ({ row }) => (
      <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
        {actions.filter(a => !a.hidden?.(row.original)).map((action) => (
          <button key={action.label} type="button" onClick={e => { e.stopPropagation(); action.onClick(row.original); }} disabled={action.disabled?.(row.original)}
            className={`p-1 rounded text-xs transition-colors ${action.destructive ? "text-destructive hover:bg-destructive/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}>
            {action.icon ? <action.icon className="w-3.5 h-3.5" /> : action.label}
          </button>
        ))}
      </div>
    ),
  };
}
