/**
 * ui/pure-columns.tsx
 *
 * Column builder functions that return the pure ColumnDef type
 * from src/table/types.ts — parallel to existing TanStack-based columns.tsx.
 */
import React from "react";
import type { ColumnDef, ColumnMeta, CellContext } from "../table/types";

// ---------------------------------------------------------------------------
// Builder options
// ---------------------------------------------------------------------------
interface BaseColumnOptions<TData> {
  field: keyof TData & string;
  header: string;
  size?: number;
  minSize?: number;
  maxSize?: number;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  enableHiding?: boolean;
  enableResizing?: boolean;
  enablePinning?: boolean;
  editable?: boolean;
  cell?: (context: CellContext<TData>) => React.ReactNode;
}

interface EnumOption {
  label: string;
  value: string;
  /** Hex color — legacy bordered-badge approach (outline only). */
  color?: string;
  /** Full Tailwind class string — renders a solid flat badge with no border. */
  badgeClassName?: string;
}

// ---------------------------------------------------------------------------
// Selection column
// ---------------------------------------------------------------------------
export function selectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "_select",
    size: 40,
    enableSorting: false,
    enableFiltering: false,
    enableHiding: false,
    enableResizing: false,
    header: ({ table }) =>
      React.createElement("input", {
        type: "checkbox",
        checked: table.getIsAllPageRowsSelected(),
        onChange: table.getToggleAllPageRowsSelectedHandler(),
        className: "h-4 w-4 rounded border-primary text-primary focus:ring-ring",
      }),
    cell: ({ row }) =>
      React.createElement("input", {
        type: "checkbox",
        checked: row.getIsSelected(),
        onChange: row.getToggleSelectedHandler(),
        className: "h-4 w-4 rounded border-primary text-primary focus:ring-ring",
      }),
    meta: {
      entityMeta: {
        field: "_select" as keyof TData,
        filterType: "none",
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Text column
// ---------------------------------------------------------------------------
export function textColumn<TData>(
  options: BaseColumnOptions<TData>,
): ColumnDef<TData> {
  return {
    id: options.field,
    accessorKey: options.field,
    header: options.header,
    size: options.size ?? 200,
    minSize: options.minSize ?? 80,
    maxSize: options.maxSize,
    enableSorting: options.enableSorting ?? true,
    enableFiltering: options.enableFiltering ?? true,
    enableHiding: options.enableHiding ?? true,
    enableResizing: options.enableResizing ?? true,
    enablePinning: options.enablePinning,
    cell: options.cell,
    meta: {
      entityMeta: {
        field: options.field,
        filterType: "text",
        editable: options.editable,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Number column
// ---------------------------------------------------------------------------
export function numberColumn<TData>(
  options: BaseColumnOptions<TData>,
): ColumnDef<TData> {
  return {
    id: options.field,
    accessorKey: options.field,
    header: options.header,
    size: options.size ?? 120,
    minSize: options.minSize ?? 60,
    maxSize: options.maxSize,
    enableSorting: options.enableSorting ?? true,
    enableFiltering: options.enableFiltering ?? true,
    enableHiding: options.enableHiding ?? true,
    enableResizing: options.enableResizing ?? true,
    enablePinning: options.enablePinning,
    cell:
      options.cell ??
      (({ getValue }) => {
        const val = getValue<number>();
        return val != null ? String(val) : "";
      }),
    meta: {
      entityMeta: {
        field: options.field,
        filterType: "number",
        editable: options.editable,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Date column
// ---------------------------------------------------------------------------
export function dateColumn<TData>(
  options: BaseColumnOptions<TData> & { format?: (date: Date) => string },
): ColumnDef<TData> {
  const formatDate = options.format ?? ((d: Date) => d.toLocaleDateString());

  return {
    id: options.field,
    accessorKey: options.field,
    header: options.header,
    size: options.size ?? 150,
    minSize: options.minSize ?? 100,
    maxSize: options.maxSize,
    enableSorting: options.enableSorting ?? true,
    enableFiltering: options.enableFiltering ?? true,
    enableHiding: options.enableHiding ?? true,
    enableResizing: options.enableResizing ?? true,
    enablePinning: options.enablePinning,
    cell:
      options.cell ??
      (({ getValue }) => {
        const val = getValue<string | Date>();
        if (!val) return "";
        const date = val instanceof Date ? val : new Date(val);
        return formatDate(date);
      }),
    meta: {
      entityMeta: {
        field: options.field,
        filterType: "date",
        editable: options.editable,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Boolean column
// ---------------------------------------------------------------------------
export function booleanColumn<TData>(
  options: BaseColumnOptions<TData> & { trueLabel?: string; falseLabel?: string },
): ColumnDef<TData> {
  return {
    id: options.field,
    accessorKey: options.field,
    header: options.header,
    size: options.size ?? 100,
    minSize: options.minSize ?? 60,
    maxSize: options.maxSize,
    enableSorting: options.enableSorting ?? true,
    enableFiltering: options.enableFiltering ?? true,
    enableHiding: options.enableHiding ?? true,
    enableResizing: options.enableResizing ?? true,
    enablePinning: options.enablePinning,
    cell:
      options.cell ??
      (({ getValue }) => {
        const val = getValue<boolean>();
        return val
          ? (options.trueLabel ?? "Yes")
          : (options.falseLabel ?? "No");
      }),
    meta: {
      entityMeta: {
        field: options.field,
        filterType: "boolean",
        editable: options.editable,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Enum column
// ---------------------------------------------------------------------------
export function enumColumn<TData>(
  options: BaseColumnOptions<TData> & { options: EnumOption[] },
): ColumnDef<TData> {
  return {
    id: options.field,
    accessorKey: options.field,
    header: options.header,
    size: options.size ?? 150,
    minSize: options.minSize ?? 80,
    maxSize: options.maxSize,
    enableSorting: options.enableSorting ?? true,
    enableFiltering: options.enableFiltering ?? true,
    enableHiding: options.enableHiding ?? true,
    enableResizing: options.enableResizing ?? true,
    enablePinning: options.enablePinning,
    cell:
      options.cell ??
      (({ getValue }) => {
        const val = String(getValue<string>() ?? "");
        const opt = options.options.find((o) => o.value === val);
        if (!opt) return val;
        if (opt.badgeClassName) {
          return React.createElement(
            "span",
            {
              className: `inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium capitalize ${opt.badgeClassName}`,
            },
            opt.label,
          );
        }
        return React.createElement(
          "span",
          {
            className: "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
            style: opt.color ? { backgroundColor: `${opt.color}26`, color: opt.color } : undefined,
          },
          opt.label,
        );
      }),
    meta: {
      entityMeta: {
        field: options.field,
        filterType: "enum",
        enumOptions: options.options,
        editable: options.editable,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Actions column (stub — actual rendering handled by ActionDropdown)
// ---------------------------------------------------------------------------
export function actionsColumn<TData>(): ColumnDef<TData> {
  return {
    id: "_actions",
    header: "",
    size: 50,
    enableSorting: false,
    enableFiltering: false,
    enableHiding: false,
    enableResizing: false,
    meta: {
      entityMeta: {
        field: "_actions" as keyof TData,
        filterType: "none",
      },
    },
  };
}
