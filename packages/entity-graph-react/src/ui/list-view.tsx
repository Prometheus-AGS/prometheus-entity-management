/**
 * ui/list-view.tsx
 *
 * Configurable list view with per-item type dispatch,
 * inline expand-in-place editing, and selection support.
 */
import { useState, useCallback } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import type { StoreApi } from "zustand";
import type {
  Row,
  ActionDef,
  ColumnDef,
  ItemDescriptor,
  ItemRenderContext,
} from "@prometheus-ags/entity-graph-core";
import type { SelectionStoreState } from "../table/selection-store";
import { useSelectionStore, selectionStorePlaceholder } from "../table/selection-store";
import { ActionButtonRow } from "./action-column";
import { InlineItemEditor } from "./inline-editor";
import { cn } from "./utils";

interface ListViewProps<TData extends object> {
  rows: Row<TData>[];
  columns: ColumnDef<TData>[];
  itemDescriptor?: ItemDescriptor<TData>;
  renderItem?: (item: TData, context: ItemRenderContext<TData>) => ReactNode;
  actions?: ActionDef<TData>[];
  enableInlineEdit?: boolean;
  onInlineSave?: (item: TData, changes: Partial<TData>) => void | Promise<void>;
  selectionStore?: StoreApi<SelectionStoreState>;
  enableMultiSelect?: boolean;
  getRowId?: (row: TData) => string;
  className?: string;
}

export function ListView<TData extends object>({
  rows,
  columns,
  itemDescriptor,
  renderItem,
  actions = [],
  enableInlineEdit,
  onInlineSave,
  selectionStore,
  enableMultiSelect,
  getRowId,
  className,
}: ListViewProps<TData>) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className={cn("divide-y rounded-md border", className)}>
      {rows.map((row) => {
        const id = getRowId?.(row.original) ?? row.id;
        const isEditing = editingId === id;

        return (
          <ListItem
            key={id}
            row={row}
            itemId={id}
            columns={columns}
            itemDescriptor={itemDescriptor}
            renderItem={renderItem}
            actions={actions}
            isEditing={isEditing}
            enableInlineEdit={enableInlineEdit}
            onStartEdit={() => setEditingId(id)}
            onCancelEdit={() => setEditingId(null)}
            onInlineSave={(changes) => {
              onInlineSave?.(row.original, changes);
              setEditingId(null);
            }}
            selectionStore={selectionStore}
            enableMultiSelect={enableMultiSelect}
          />
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// List item
// ---------------------------------------------------------------------------
interface ListItemProps<TData extends object> {
  row: Row<TData>;
  itemId: string;
  columns: ColumnDef<TData>[];
  itemDescriptor?: ItemDescriptor<TData>;
  renderItem?: (item: TData, context: ItemRenderContext<TData>) => ReactNode;
  actions: ActionDef<TData>[];
  isEditing: boolean;
  enableInlineEdit?: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onInlineSave: (changes: Partial<TData>) => void;
  selectionStore?: StoreApi<SelectionStoreState>;
  enableMultiSelect?: boolean;
}

function ListItem<TData extends object>({
  row,
  itemId,
  columns,
  itemDescriptor,
  renderItem,
  actions,
  isEditing,
  enableInlineEdit,
  onStartEdit,
  onCancelEdit,
  onInlineSave,
  selectionStore,
  enableMultiSelect,
}: ListItemProps<TData>) {
  const selStore = selectionStore ?? selectionStorePlaceholder;
  const isSelected = useSelectionStore(selStore, (s) =>
    selectionStore ? s.isSelected(itemId) : false,
  );
  const isMultiSelectMode = useSelectionStore(selStore, (s) =>
    selectionStore ? s.isMultiSelectMode : false,
  );
  const storeToggle = useSelectionStore(selStore, (s) => s.toggle);
  const toggle = useCallback(
    (id: string) => {
      if (selectionStore) storeToggle(id);
    },
    [selectionStore, storeToggle],
  );

  const context: ItemRenderContext<TData> = {
    isSelected,
    isEditing,
    isMultiSelectMode,
    onToggleSelect: () => toggle(itemId),
    onEdit: onStartEdit,
    onSave: onInlineSave,
    onCancel: onCancelEdit,
    actions,
    row,
  };

  const item = row.original;
  const desc = itemDescriptor;

  const rowEditProps = enableInlineEdit
    ? {
        role: "button" as const,
        tabIndex: 0 as const,
        onDoubleClick: () => onStartEdit(),
        onKeyDown: (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onStartEdit();
          }
        },
      }
    : {};

  return (
    <div
      className={cn(
        "transition-colors",
        isSelected && "bg-muted/50",
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30">
        {enableMultiSelect && isMultiSelectMode && (
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggle(itemId)}
            className="h-4 w-4 flex-shrink-0 rounded border-primary text-primary focus:ring-ring"
            aria-label={`Select item ${itemId}`}
          />
        )}

        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div
            className={cn("min-w-0 flex-1", enableInlineEdit && "cursor-default")}
            {...rowEditProps}
          >
            {renderItem ? (
              renderItem(item, context)
            ) : (
              <DefaultListItemContent item={item} descriptor={desc} />
            )}
          </div>

          {!isEditing && actions.length > 0 && (
            <div className="flex-shrink-0">
              <ActionButtonRow item={item} actions={actions} maxVisible={2} />
            </div>
          )}
        </div>
      </div>

      {isEditing && (
        <div className="px-4 pb-3">
          <InlineItemEditor
            item={item}
            columns={columns}
            itemDescriptor={desc}
            onSave={onInlineSave}
            onCancel={onCancelEdit}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Default list item content
// ---------------------------------------------------------------------------
function DefaultListItemContent<TData extends object>({
  item,
  descriptor,
}: {
  item: TData;
  descriptor?: ItemDescriptor<TData>;
}) {
  if (!descriptor) {
    const rec = item as Record<string, unknown>;
    const keys = Object.keys(rec);
    return (
      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {String(rec[keys[0]] ?? "")}
        </p>
        {keys[1] && (
          <p className="truncate text-xs text-muted-foreground">
            {String(rec[keys[1]] ?? "")}
          </p>
        )}
      </div>
    );
  }

  const IconComponent =
    typeof descriptor.icon === "function" ? descriptor.icon : null;
  const iconField =
    typeof descriptor.icon === "string" ? descriptor.icon : null;

  return (
    <div className="flex flex-1 items-center gap-3 min-w-0">
      {descriptor.avatar && !!(item as Record<string, unknown>)[descriptor.avatar] && (
        <img
          src={String((item as Record<string, unknown>)[descriptor.avatar])}
          alt=""
          className="h-9 w-9 flex-shrink-0 rounded-full object-cover"
        />
      )}

      {!descriptor.avatar && IconComponent && (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          <IconComponent className="h-4 w-4 text-muted-foreground" />
        </div>
      )}

      {!descriptor.avatar && iconField && !!(item as Record<string, unknown>)[iconField] && (
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-muted">
          <span className="text-sm">{String((item as Record<string, unknown>)[iconField])}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <p className="truncate text-sm font-medium">
          {String((item as Record<string, unknown>)[descriptor.title] ?? "")}
        </p>
        {descriptor.subtitle && (
          <p className="truncate text-xs text-muted-foreground">
            {String((item as Record<string, unknown>)[descriptor.subtitle] ?? "")}
          </p>
        )}
      </div>

      {descriptor.badges && descriptor.badges.length > 0 && (
        <div className="flex flex-shrink-0 gap-1">
          {descriptor.badges.map((badge) => {
            const val = String((item as Record<string, unknown>)[badge.field] ?? "");
            const opt = badge.options?.find((o) => o.value === val);
            return (
              <span
                key={badge.field}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium",
                  opt?.className,
                )}
              >
                {opt?.label ?? val}
              </span>
            );
          })}
        </div>
      )}

      {descriptor.metadata && descriptor.metadata.length > 0 && (
        <div className="hidden flex-shrink-0 gap-4 sm:flex">
          {descriptor.metadata.map((meta) => {
            const val = (item as Record<string, unknown>)[meta.field];
            return (
              <span key={meta.field} className="text-xs text-muted-foreground">
                {meta.format ? meta.format(val) : String(val ?? "")}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
