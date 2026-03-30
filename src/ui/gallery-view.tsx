/**
 * ui/gallery-view.tsx
 *
 * Responsive CSS Grid card layout with field-descriptor-driven
 * default cards and renderCard() override.
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
  GalleryColumns,
} from "../table/types";
import type { SelectionStoreState } from "../table/selection-store";
import { useSelectionStore, selectionStorePlaceholder } from "../table/selection-store";
import { ActionButtonRow } from "./action-column";
import { InlineItemEditor } from "./inline-editor";
import { cn } from "./utils";

interface GalleryViewProps<TData extends Record<string, unknown>> {
  rows: Row<TData>[];
  columns: ColumnDef<TData>[];
  itemDescriptor?: ItemDescriptor<TData>;
  renderCard?: (item: TData, context: ItemRenderContext<TData>) => ReactNode;
  actions?: ActionDef<TData>[];
  enableInlineEdit?: boolean;
  onInlineSave?: (item: TData, changes: Partial<TData>) => void | Promise<void>;
  selectionStore?: StoreApi<SelectionStoreState>;
  enableMultiSelect?: boolean;
  getRowId?: (row: TData) => string;
  galleryColumns?: GalleryColumns;
  className?: string;
}

export function GalleryView<TData extends Record<string, unknown>>({
  rows,
  columns,
  itemDescriptor,
  renderCard,
  actions = [],
  enableInlineEdit,
  onInlineSave,
  selectionStore,
  enableMultiSelect,
  getRowId,
  galleryColumns,
  className,
}: GalleryViewProps<TData>) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const breakpointClasses = galleryColumns
    ? buildBreakpointClasses(galleryColumns)
    : "";

  return (
    <div
      className={cn(
        !galleryColumns &&
          "grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]",
        breakpointClasses,
        className,
      )}
    >
      {rows.map((row) => {
        const id = getRowId?.(row.original) ?? row.id;
        const isEditing = editingId === id;

        return (
          <GalleryCard
            key={id}
            row={row}
            itemId={id}
            columns={columns}
            itemDescriptor={itemDescriptor}
            renderCard={renderCard}
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
// Gallery card
// ---------------------------------------------------------------------------
interface GalleryCardProps<TData extends Record<string, unknown>> {
  row: Row<TData>;
  itemId: string;
  columns: ColumnDef<TData>[];
  itemDescriptor?: ItemDescriptor<TData>;
  renderCard?: (item: TData, context: ItemRenderContext<TData>) => ReactNode;
  actions: ActionDef<TData>[];
  isEditing: boolean;
  enableInlineEdit?: boolean;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onInlineSave: (changes: Partial<TData>) => void;
  selectionStore?: StoreApi<SelectionStoreState>;
  enableMultiSelect?: boolean;
}

function GalleryCard<TData extends Record<string, unknown>>({
  row,
  itemId,
  columns,
  itemDescriptor,
  renderCard,
  actions,
  isEditing,
  enableInlineEdit,
  onStartEdit,
  onCancelEdit,
  onInlineSave,
  selectionStore,
  enableMultiSelect,
}: GalleryCardProps<TData>) {
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

  if (renderCard) {
    return (
      <div
        className={cn(
          "relative rounded-lg border bg-card transition-shadow hover:shadow-md",
          isSelected && "ring-2 ring-primary",
        )}
      >
        {enableMultiSelect && isMultiSelectMode && (
          <div className="absolute left-2 top-2 z-10">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggle(itemId)}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-ring"
              aria-label={`Select item ${itemId}`}
            />
          </div>
        )}
        {renderCard(row.original, context)}
      </div>
    );
  }

  const item = row.original;
  const desc = itemDescriptor;

  const cardEditProps = enableInlineEdit
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
        "relative flex flex-col rounded-lg border bg-card transition-shadow hover:shadow-md",
        isSelected && "ring-2 ring-primary",
        enableInlineEdit && "cursor-default",
      )}
      {...cardEditProps}
    >
      {enableMultiSelect && isMultiSelectMode && (
        <div className="absolute left-2 top-2 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => toggle(itemId)}
            className="h-4 w-4 rounded border-primary text-primary focus:ring-ring"
            aria-label={`Select item ${itemId}`}
          />
        </div>
      )}

      {desc?.image && !!(item as Record<string, unknown>)[desc.image] && (
        <div className="aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
          <img
            src={String((item as Record<string, unknown>)[desc.image])}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="flex items-start gap-2">
          {desc?.avatar && !!(item as Record<string, unknown>)[desc.avatar] && (
            <img
              src={String((item as Record<string, unknown>)[desc.avatar])}
              alt=""
              className="h-8 w-8 rounded-full object-cover"
            />
          )}
          <div className="flex-1 min-w-0">
            {desc?.title && (
              <h3 className="truncate font-medium text-sm">
                {String((item as Record<string, unknown>)[desc.title] ?? "")}
              </h3>
            )}
            {desc?.subtitle && (
              <p className="truncate text-xs text-muted-foreground">
                {String((item as Record<string, unknown>)[desc.subtitle] ?? "")}
              </p>
            )}
          </div>
        </div>

        {desc?.description && !!(item as Record<string, unknown>)[desc.description] && (
          <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
            {String((item as Record<string, unknown>)[desc.description])}
          </p>
        )}

        {desc?.badges && desc.badges.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {desc.badges.map((badge) => {
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

        {desc?.metadata && desc.metadata.length > 0 && (
          <div className="mt-2 space-y-0.5">
            {desc.metadata.map((meta) => {
              const val = (item as Record<string, unknown>)[meta.field];
              return (
                <div key={meta.field} className="flex items-center gap-1 text-[11px] text-muted-foreground">
                  <span className="font-medium">{meta.label}:</span>
                  <span>{meta.format ? meta.format(val) : String(val ?? "")}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {isEditing && (
        <div className="border-t p-4">
          <InlineItemEditor
            item={item}
            columns={columns}
            itemDescriptor={desc}
            onSave={onInlineSave}
            onCancel={onCancelEdit}
          />
        </div>
      )}

      {!isEditing && actions.length > 0 && (
        <div className="flex items-center justify-end border-t px-3 py-2">
          <ActionButtonRow item={item} actions={actions} />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Breakpoint class helper
// ---------------------------------------------------------------------------
function buildBreakpointClasses(cols: GalleryColumns): string {
  const classes = ["grid gap-4"];
  if (cols.sm) classes.push(`grid-cols-${cols.sm}`);
  else classes.push("grid-cols-1");
  if (cols.md) classes.push(`md:grid-cols-${cols.md}`);
  if (cols.lg) classes.push(`lg:grid-cols-${cols.lg}`);
  if (cols.xl) classes.push(`xl:grid-cols-${cols.xl}`);
  return classes.join(" ");
}
