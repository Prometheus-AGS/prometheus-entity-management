/**
 * ui/multi-select-bar.tsx
 *
 * Sticky batch action bar that appears when items are selected.
 * Connected to the SelectionStore — works across all view modes.
 */
import React, { useMemo } from "react";
import type { StoreApi } from "zustand";
import type { SelectionStoreState } from "../table/selection-store";
import { useSelectionStore } from "../table/selection-store";
import type { BatchActionDef } from "../table/types";
import { cn } from "./utils";

interface MultiSelectBarProps {
  store: StoreApi<SelectionStoreState>;
  batchActions?: BatchActionDef[];
  onBatchAction?: (actionId: string, selectedIds: string[]) => void;
  totalCount?: number;
  className?: string;
}

export function MultiSelectBar({
  store,
  batchActions = [],
  onBatchAction,
  totalCount,
  className,
}: MultiSelectBarProps) {
  const selectedIdsSet = useSelectionStore(store, (s) => s.selectedIds);
  const selectedCount = selectedIdsSet.size;
  const selectedIds = useMemo(() => Array.from(selectedIdsSet), [selectedIdsSet]);
  const deselectAll = useSelectionStore(store, (s) => s.deselectAll);
  const selectAll = useSelectionStore(store, (s) => s.selectAll);

  if (selectedCount === 0) return null;

  return (
    <div
      className={cn(
        "sticky bottom-0 z-40 flex items-center justify-between gap-4 rounded-xl bg-foreground/[0.07] px-4 py-3",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold">
          {selectedCount} item{selectedCount !== 1 ? "s" : ""} selected
        </span>
        {totalCount != null && totalCount > selectedCount && (
          <button
            type="button"
            onClick={() => {}}
            className="text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          >
            Select all {totalCount}
          </button>
        )}
        <button
          type="button"
          onClick={deselectAll}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Deselect all
        </button>
      </div>

      <div className="flex items-center gap-2">
        {batchActions.map((action) => (
          <button
            key={action.id}
            type="button"
            onClick={() => onBatchAction?.(action.id, selectedIds)}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition-colors",
              action.destructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-muted/80 text-foreground hover:bg-muted",
            )}
          >
            {action.icon && <action.icon className="h-3.5 w-3.5" />}
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
