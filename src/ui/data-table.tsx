/**
 * ui/data-table.tsx
 *
 * Table-mode renderer using shadcn/ui primitives.
 * Supports inline cell editing, row selection, action columns,
 * column resize handles, and pinned column positioning.
 */
import { useState, useCallback } from "react";
import type { StoreApi } from "zustand";
import type { TableInstance, Row, ActionDef, ColumnDef } from "../table/types";
import type { SelectionStoreState } from "../table/selection-store";
import { useSelectionStore, selectionStorePlaceholder } from "../table/selection-store";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "./table-primitives";
import { DataTableColumnHeader } from "./data-table-column-header";
import { InlineCellEditor } from "./inline-editor";
import { ActionDropdown } from "./action-column";
import { cn } from "./utils";

interface DataTableProps<TData extends object> {
  table: TableInstance<TData>;
  actions?: ActionDef<TData>[];
  enableInlineEdit?: boolean;
  onInlineSave?: (item: TData, field: string, value: unknown) => void | Promise<void>;
  selectionStore?: StoreApi<SelectionStoreState>;
  enableMultiSelect?: boolean;
  getRowId?: (row: TData) => string;
  className?: string;
}

export function DataTable<TData extends object>({
  table,
  actions,
  enableInlineEdit,
  onInlineSave,
  selectionStore,
  enableMultiSelect,
  getRowId,
  className,
}: DataTableProps<TData>) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string;
    columnId: string;
  } | null>(null);

  const headerGroups = table.getHeaderGroups();
  const rowModel = table.getRowModel();

  const handleCellDoubleClick = useCallback(
    (rowId: string, columnId: string, columnDef: ColumnDef<TData>) => {
      if (!enableInlineEdit) return;
      if (!columnDef.meta?.entityMeta?.editable) return;
      setEditingCell({ rowId, columnId });
    },
    [enableInlineEdit],
  );

  const handleInlineSave = useCallback(
    async (row: Row<TData>, columnId: string, value: unknown) => {
      const field = columnId;
      await onInlineSave?.(row.original, field, value);
      setEditingCell(null);
    },
    [onInlineSave],
  );

  return (
    <Table className={className}>
      <TableHeader>
        {headerGroups.map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {enableMultiSelect && selectionStore && (
              <TableHead className="w-[40px]">
                <SelectAllCheckbox
                  table={table}
                  store={selectionStore}
                  getRowId={getRowId}
                />
              </TableHead>
            )}
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                style={{ width: header.getSize() }}
                className={cn(
                  header.column.getIsPinned() === "left" && "sticky left-0 z-10 bg-muted/60",
                  header.column.getIsPinned() === "right" && "sticky right-0 z-10 bg-muted/60",
                )}
              >
                {header.isPlaceholder ? null : (
                  <DataTableColumnHeader
                    column={header.column}
                    title={
                      typeof header.column.columnDef.header === "string"
                        ? header.column.columnDef.header
                        : header.column.id
                    }
                  />
                )}
              </TableHead>
            ))}
            {actions && actions.length > 0 && (
              <TableHead className="w-[50px] text-right">
                <span className="sr-only">Actions</span>
              </TableHead>
            )}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {rowModel.rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={
                (headerGroups[0]?.headers.length ?? 0) +
                (enableMultiSelect ? 1 : 0) +
                (actions?.length ? 1 : 0)
              }
              className="h-24 text-center text-muted-foreground"
            >
              No results.
            </TableCell>
          </TableRow>
        ) : (
          rowModel.rows.map((row) => (
            <DataTableRow
              key={row.id}
              row={row}
              table={table}
              actions={actions}
              enableMultiSelect={enableMultiSelect}
              selectionStore={selectionStore}
              getRowId={getRowId}
              editingCell={editingCell}
              onCellDoubleClick={handleCellDoubleClick}
              onInlineSave={handleInlineSave}
              onCancelEdit={() => setEditingCell(null)}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}

// ---------------------------------------------------------------------------
// DataTableRow
// ---------------------------------------------------------------------------
interface DataTableRowProps<TData extends object> {
  row: Row<TData>;
  table: TableInstance<TData>;
  actions?: ActionDef<TData>[];
  enableMultiSelect?: boolean;
  selectionStore?: StoreApi<SelectionStoreState>;
  getRowId?: (row: TData) => string;
  editingCell: { rowId: string; columnId: string } | null;
  onCellDoubleClick: (rowId: string, columnId: string, columnDef: ColumnDef<TData>) => void;
  onInlineSave: (row: Row<TData>, columnId: string, value: unknown) => void;
  onCancelEdit: () => void;
}

function DataTableRow<TData extends object>({
  row,
  table: _table,
  actions,
  enableMultiSelect,
  selectionStore,
  getRowId,
  editingCell,
  onCellDoubleClick,
  onInlineSave,
  onCancelEdit,
}: DataTableRowProps<TData>) {
  const rowId = getRowId?.(row.original) ?? row.id;
  const selStore = selectionStore ?? selectionStorePlaceholder;
  const isSelected = useSelectionStore(selStore, (s) =>
    selectionStore ? s.isSelected(rowId) : false,
  );

  return (
    <TableRow data-state={isSelected ? "selected" : undefined}>
      {enableMultiSelect && selectionStore && (
        <TableCell className="w-[40px]">
          <RowCheckbox store={selectionStore} rowId={rowId} />
        </TableCell>
      )}
      {row.getVisibleCells().map((cell) => {
        const isEditing =
          editingCell?.rowId === row.id &&
          editingCell?.columnId === cell.column.id;

        return (
          <TableCell
            key={cell.id}
            onDoubleClick={() =>
              onCellDoubleClick(row.id, cell.column.id, cell.column.columnDef)
            }
            className={cn(
              cell.column.getIsPinned() === "left" && "sticky left-0 z-10 bg-background group-hover:bg-muted/30",
              cell.column.getIsPinned() === "right" && "sticky right-0 z-10 bg-background group-hover:bg-muted/30",
            )}
          >
            {isEditing ? (
              <InlineCellEditor
                value={cell.getValue()}
                columnDef={cell.column.columnDef}
                onSave={(value) => onInlineSave(row, cell.column.id, value)}
                onCancel={onCancelEdit}
              />
            ) : (
              <CellRenderer cell={cell} />
            )}
          </TableCell>
        );
      })}
      {actions && actions.length > 0 && (
        <TableCell className="w-[50px] text-right">
          <ActionDropdown item={row.original} actions={actions} />
        </TableCell>
      )}
    </TableRow>
  );
}

// ---------------------------------------------------------------------------
// Cell renderer
// ---------------------------------------------------------------------------
function CellRenderer<TData>({ cell }: { cell: { column: { columnDef: ColumnDef<TData> }; getContext: () => unknown; renderValue: <T>() => T | null } }) {
  const cellDef = cell.column.columnDef.cell;

  if (typeof cellDef === "function") {
    return <>{cellDef(cell.getContext() as never)}</>;
  }

  const value = cell.renderValue<unknown>();
  if (value == null) return null;

  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>;
  }

  return <span>{String(value)}</span>;
}

// ---------------------------------------------------------------------------
// Checkbox components
// ---------------------------------------------------------------------------
function SelectAllCheckbox<TData extends object>({
  table,
  store,
  getRowId,
}: {
  table: TableInstance<TData>;
  store: StoreApi<SelectionStoreState>;
  getRowId?: (row: TData) => string;
}) {
  const selectedCount = useSelectionStore(store, (s) => s.selectedCount());
  const pageRows = table.getRowModel().rows;
  const allPageIds = pageRows.map((r) => getRowId?.(r.original) ?? r.id);
  const allSelected = allPageIds.length > 0 && selectedCount >= allPageIds.length;
  const selectAll = useSelectionStore(store, (s) => s.selectAll);
  const deselectAll = useSelectionStore(store, (s) => s.deselectAll);

  return (
    <input
      type="checkbox"
      checked={allSelected}
      onChange={() => {
        if (allSelected) deselectAll();
        else selectAll(allPageIds);
      }}
      className="h-4 w-4 rounded accent-primary"
      aria-label="Select all rows on this page"
    />
  );
}

function RowCheckbox({
  store,
  rowId,
}: {
  store: StoreApi<SelectionStoreState>;
  rowId: string;
}) {
  const isSelected = useSelectionStore(store, (s) => s.isSelected(rowId));
  const toggle = useSelectionStore(store, (s) => s.toggle);

  return (
    <input
      type="checkbox"
      checked={isSelected}
      onChange={() => toggle(rowId)}
      className="h-4 w-4 rounded accent-primary"
      aria-label={`Select row ${rowId}`}
    />
  );
}
