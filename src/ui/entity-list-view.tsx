/**
 * ui/entity-list-view.tsx
 *
 * Top-level orchestrator component — manages view mode, shared
 * selection store, toolbar/pagination shell, and delegates
 * to the active view renderer (table, gallery, or list).
 */
import React, { useRef, useState, useMemo, useCallback } from "react";
import type { StoreApi } from "zustand";
import type {
  ColumnDef,
  TableOptions,
  ViewMode,
  ActionDef,
  ItemDescriptor,
  ItemRenderContext,
  EmptyStateConfig,
  BatchActionDef,
  GalleryColumns,
} from "../table/types";
import { useTable } from "../table/use-table";
import {
  createSelectionStore,
  SelectionContext,
  type SelectionStoreState,
} from "../table/selection-store";
import {
  useTablePresets,
  type UseTablePresetsOptions,
} from "../table/presets/use-table-presets";
import {
  useTableStorageAdapter,
  useTableRealtimeMode,
} from "../table/presets/table-storage-provider";
import type { FilterPreset, ColumnPreset } from "../table/presets/types";

import { DataTable } from "./data-table";
import { GalleryView } from "./gallery-view";
import { ListView } from "./list-view";
import { DataTableToolbar } from "./data-table-toolbar";
import { DataTablePagination } from "./data-table-pagination";
import { EmptyState } from "./empty-state";
import { MultiSelectBar } from "./multi-select-bar";
import { PresetPicker } from "./preset-picker";
import { FilterPresetDialog } from "./filter-preset-dialog";
import { ColumnPresetDialog } from "./column-preset-dialog";
import { cn } from "./utils";

export interface EntityListViewProps<TData extends object> {
  data?: TData[];
  viewResult?: { items: TData[]; isFetching?: boolean; total?: number };

  columns: ColumnDef<TData>[];
  itemDescriptor?: ItemDescriptor<TData>;
  renderCard?: (item: TData, context: ItemRenderContext<TData>) => React.ReactNode;
  renderItem?: (item: TData, context: ItemRenderContext<TData>) => React.ReactNode;

  defaultViewMode?: ViewMode;
  enabledViewModes?: ViewMode[];

  actions?: ActionDef<TData>[];
  onAction?: (action: string, item: TData) => void;

  enableMultiSelect?: boolean;
  onBatchAction?: (action: string, selectedItems: TData[]) => void;
  batchActions?: BatchActionDef[];

  enableInlineEdit?: boolean;
  onInlineEdit?: (item: TData, field: string, value: unknown) => void | Promise<void>;
  onInlineSave?: (item: TData, changes: Partial<TData>) => void | Promise<void>;

  emptyState?: React.ReactNode | EmptyStateConfig;

  tableId?: string;
  enablePresets?: boolean;

  getRowId?: (row: TData) => string;

  paginationMode?: "none" | "loadMore" | "pages";
  pageSize?: number;

  galleryColumns?: GalleryColumns;

  enableColumnResizing?: boolean;
  enableColumnPinning?: boolean;
  enableGrouping?: boolean;
  enableSearch?: boolean;

  onRefresh?: () => void;

  className?: string;
}

export function EntityListView<TData extends object>(
  props: EntityListViewProps<TData>,
) {
  const {
    data: dataProp,
    viewResult,
    columns,
    itemDescriptor,
    renderCard,
    renderItem,
    defaultViewMode = "table",
    enabledViewModes = ["table", "gallery", "list"],
    actions,
    enableMultiSelect = false,
    onBatchAction,
    batchActions,
    enableInlineEdit = false,
    onInlineEdit,
    onInlineSave,
    emptyState,
    tableId,
    enablePresets = false,
    getRowId,
    paginationMode = "pages",
    pageSize = 10,
    galleryColumns,
    enableColumnResizing = false,
    enableColumnPinning = false,
    enableGrouping = false,
    enableSearch = true,
    onRefresh,
    className,
  } = props;

  const data = useMemo(
    () => viewResult?.items ?? dataProp ?? [],
    [viewResult?.items, dataProp],
  );

  // Selection store — one per component instance
  const selectionStoreRef = useRef<StoreApi<SelectionStoreState>>(null!);
  if (!selectionStoreRef.current) {
    selectionStoreRef.current = createSelectionStore();
  }

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);

  // Preset system
  const adapter = useTableStorageAdapter();
  const realtimeMode = useTableRealtimeMode();

  const presets = useTablePresets(tableId ?? "__no_table_id__", {
    adapter,
    realtimeMode,
    enabled: enablePresets && !!tableId,
  });

  // Preset dialogs
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const [columnDialogOpen, setColumnDialogOpen] = useState(false);
  const [editingFilterPreset, setEditingFilterPreset] = useState<FilterPreset | null>(null);
  const [editingColumnPreset, setEditingColumnPreset] = useState<ColumnPreset | null>(null);

  // Table engine
  const table = useTable<TData>({
    data,
    columns,
    getRowId: getRowId
      ? (row, idx) => getRowId(row)
      : undefined,
    enableSorting: true,
    enableFiltering: true,
    enableColumnResizing,
    enablePinning: enableColumnPinning,
    enableGrouping,
    enableRowSelection: enableMultiSelect,
    manualPagination: !!viewResult,
    pageCount: viewResult?.total
      ? Math.ceil(viewResult.total / pageSize)
      : undefined,
    initialState: {
      pagination: { pageIndex: 0, pageSize },
    },
  });

  const rowModel = table.getRowModel();
  const prePagRows = table.getPrePaginationRowModel();
  const isEmpty = data.length === 0;
  const isFilteredEmpty = !isEmpty && prePagRows.rows.length === 0;

  // View mode change handler
  const handleViewModeChange = useCallback(
    (mode: ViewMode) => {
      setViewMode(mode);
      if (enablePresets && tableId) {
        presets.setViewMode(mode);
      }
    },
    [enablePresets, tableId, presets],
  );

  // Inline save handler that dispatches to the correct prop
  const handleInlineSaveTable = useCallback(
    (item: TData, field: string, value: unknown) => {
      onInlineEdit?.(item, field, value);
    },
    [onInlineEdit],
  );

  const handleInlineSaveItem = useCallback(
    (item: TData, changes: Partial<TData>) => {
      onInlineSave?.(item, changes);
    },
    [onInlineSave],
  );

  // Batch action handler
  const handleBatchAction = useCallback(
    (actionId: string, selectedIds: string[]) => {
      if (!onBatchAction) return;
      const selectedItems = data.filter((item) => {
        const id = getRowId?.(item) ?? String(data.indexOf(item));
        return selectedIds.includes(id);
      });
      onBatchAction(actionId, selectedItems);
    },
    [onBatchAction, data, getRowId],
  );

  return (
    <SelectionContext.Provider value={selectionStoreRef.current}>
      <div className={cn("flex flex-col gap-3", className)}>
        <DataTableToolbar
          table={table}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          enabledViewModes={enabledViewModes}
          enableSearch={enableSearch}
          onRefresh={onRefresh}
          showColumnVisibility={viewMode === "table"}
        >
          {enablePresets && tableId && (
            <PresetPicker
              filterPresets={presets.filterPresets}
              columnPresets={presets.columnPresets}
              activeFilterId={presets.activeFilterPreset?.id ?? null}
              activeColumnId={presets.activeColumnPreset?.id ?? null}
              onApplyFilter={presets.applyFilterPreset}
              onApplyColumn={presets.applyColumnPreset}
              onEditFilter={(p) => {
                setEditingFilterPreset(p);
                setFilterDialogOpen(true);
              }}
              onEditColumn={(p) => {
                setEditingColumnPreset(p);
                setColumnDialogOpen(true);
              }}
              onDeleteFilter={presets.deleteFilterPreset}
              onDeleteColumn={presets.deleteColumnPreset}
              onNewFilter={() => {
                setEditingFilterPreset(null);
                setFilterDialogOpen(true);
              }}
              onNewColumn={() => {
                setEditingColumnPreset(null);
                setColumnDialogOpen(true);
              }}
              pendingChangesCount={presets.pendingChanges.length}
            />
          )}
        </DataTableToolbar>

        {(isEmpty || isFilteredEmpty) ? (
          <EmptyState
            config={emptyState}
            isFiltered={isFilteredEmpty}
          />
        ) : (
          <>
            {viewMode === "table" && (
              <DataTable
                table={table}
                actions={actions}
                enableInlineEdit={enableInlineEdit}
                onInlineSave={handleInlineSaveTable}
                selectionStore={
                  enableMultiSelect ? selectionStoreRef.current : undefined
                }
                enableMultiSelect={enableMultiSelect}
                getRowId={getRowId}
              />
            )}

            {viewMode === "gallery" && (
              <GalleryView
                rows={rowModel.rows}
                columns={columns}
                itemDescriptor={itemDescriptor}
                renderCard={renderCard}
                actions={actions}
                enableInlineEdit={enableInlineEdit}
                onInlineSave={handleInlineSaveItem}
                selectionStore={
                  enableMultiSelect ? selectionStoreRef.current : undefined
                }
                enableMultiSelect={enableMultiSelect}
                getRowId={getRowId}
                galleryColumns={galleryColumns}
              />
            )}

            {viewMode === "list" && (
              <ListView
                rows={rowModel.rows}
                columns={columns}
                itemDescriptor={itemDescriptor}
                renderItem={renderItem}
                actions={actions}
                enableInlineEdit={enableInlineEdit}
                onInlineSave={handleInlineSaveItem}
                selectionStore={
                  enableMultiSelect ? selectionStoreRef.current : undefined
                }
                enableMultiSelect={enableMultiSelect}
                getRowId={getRowId}
              />
            )}
          </>
        )}

        {enableMultiSelect && (
          <MultiSelectBar
            store={selectionStoreRef.current}
            batchActions={batchActions}
            onBatchAction={handleBatchAction}
            totalCount={prePagRows.rows.length}
          />
        )}

        <DataTablePagination
          table={table}
          mode={paginationMode}
        />

        {enablePresets && (
          <>
            <FilterPresetDialog
              open={filterDialogOpen}
              onOpenChange={setFilterDialogOpen}
              columns={columns}
              preset={editingFilterPreset}
              onSave={presets.saveFilterPreset}
            />
            <ColumnPresetDialog
              open={columnDialogOpen}
              onOpenChange={setColumnDialogOpen}
              columns={columns}
              preset={editingColumnPreset}
              onSave={presets.saveColumnPreset}
            />
          </>
        )}
      </div>
    </SelectionContext.Provider>
  );
}
