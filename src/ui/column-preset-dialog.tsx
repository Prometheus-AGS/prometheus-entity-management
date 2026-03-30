/**
 * ui/column-preset-dialog.tsx
 *
 * Full dialog for building/editing named column presets.
 * Column picker, drag-to-reorder, width controls, pinning toggles,
 * visibility checkboxes, and save/update to storage.
 */
import { useState } from "react";
import type { DragEvent } from "react";
import type { ColumnDef } from "../table/types";
import type { ColumnPreset, ColumnPresetEntry } from "../table/presets/types";
import { cn } from "./utils";

interface ColumnPresetDialogProps<TData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef<TData>[];
  preset?: ColumnPreset | null;
  onSave: (preset: Omit<ColumnPreset, "id" | "createdAt" | "updatedAt">) => void;
}

export function ColumnPresetDialog<TData>({
  open,
  onOpenChange,
  columns,
  preset,
  onSave,
}: ColumnPresetDialogProps<TData>) {
  const [name, setName] = useState(preset?.name ?? "");
  const [description, setDescription] = useState(preset?.description ?? "");
  const [isDefault, setIsDefault] = useState(preset?.isDefault ?? false);

  const [entries, setEntries] = useState<ColumnPresetEntry[]>(() => {
    if (preset?.columns) return [...preset.columns];
    return columns.map((col, idx) => ({
      id: col.accessorKey ?? col.id ?? `col_${idx}`,
      visible: true,
      width: col.size ?? 150,
      order: idx,
      pinned: false,
    }));
  });

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  function updateEntry(id: string, updates: Partial<ColumnPresetEntry>) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates } : e)),
    );
  }

  function handleDragStart(idx: number) {
    setDragIdx(idx);
  }

  function handleDragOver(e: DragEvent, idx: number) {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setEntries((prev) => {
      const items = [...prev];
      const [dragged] = items.splice(dragIdx, 1);
      items.splice(idx, 0, dragged);
      return items.map((item, i) => ({ ...item, order: i }));
    });
    setDragIdx(idx);
  }

  function handleDragEnd() {
    setDragIdx(null);
  }

  function getColumnLabel(id: string): string {
    const col = columns.find((c) => (c.accessorKey ?? c.id) === id);
    if (col && typeof col.header === "string") return col.header;
    return id;
  }

  function handleSave() {
    onSave({
      name,
      description: description || undefined,
      isDefault,
      columns: entries,
    });
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {preset ? "Edit Column Preset" : "New Column Preset"}
          </h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 hover:opacity-100"
            aria-label="Close dialog"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-6 py-4">
          <div className="space-y-2">
            <label htmlFor="column-preset-name" className="text-sm font-medium">
              Name
            </label>
            <input
              id="column-preset-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My column layout"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="column-preset-description" className="text-sm font-medium">
              Description
            </label>
            <input
              id="column-preset-description"
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>

          <fieldset className="space-y-2 border-0 p-0">
            <legend className="text-sm font-medium">Columns</legend>
            <ul
              className="max-h-[300px] list-none overflow-auto rounded-md border p-0"
              aria-label="Column order and visibility"
            >
              {entries.map((entry, idx) => (
                <li
                  key={entry.id}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  className={cn(
                    "flex items-center gap-3 border-b px-3 py-2 last:border-b-0",
                    dragIdx === idx && "bg-muted",
                  )}
                >
                  <button
                    type="button"
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragEnd={handleDragEnd}
                    className="inline-flex flex-shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground hover:bg-muted"
                    aria-label={`Reorder column ${getColumnLabel(entry.id)}`}
                  >
                    <GripIcon className="h-4 w-4" />
                  </button>

                  <input
                    type="checkbox"
                    checked={entry.visible}
                    onChange={(e) =>
                      updateEntry(entry.id, { visible: e.target.checked })
                    }
                    className="h-4 w-4 flex-shrink-0 rounded border-primary text-primary focus:ring-ring"
                    aria-label={`Show column ${getColumnLabel(entry.id)}`}
                  />

                  <span className="flex-1 text-sm font-medium truncate">
                    {getColumnLabel(entry.id)}
                  </span>

                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={entry.width ?? 150}
                      onChange={(e) =>
                        updateEntry(entry.id, {
                          width: Number(e.target.value) || 150,
                        })
                      }
                      className="h-7 w-16 rounded border border-input bg-background px-1 text-xs text-center"
                      aria-label={`Width in pixels for ${getColumnLabel(entry.id)}`}
                    />
                    <select
                      value={entry.pinned || "none"}
                      onChange={(e) =>
                        updateEntry(entry.id, {
                          pinned:
                            e.target.value === "none"
                              ? false
                              : (e.target.value as "left" | "right"),
                        })
                      }
                      className="h-7 w-[70px] rounded border border-input bg-background px-1 text-xs"
                      aria-label={`Pin ${getColumnLabel(entry.id)}`}
                    >
                      <option value="none">None</option>
                      <option value="left">Left</option>
                      <option value="right">Right</option>
                    </select>
                  </div>
                </li>
              ))}
            </ul>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-ring"
            />
            Set as default column layout
          </label>
        </div>

        <div className="flex justify-end gap-2 border-t px-6 py-4">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim()}
            className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {preset ? "Update" : "Save"} Preset
          </button>
        </div>
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <title>Close</title>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  );
}

function GripIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <title>Drag handle</title>
      <circle cx="9" cy="12" r="1" /><circle cx="9" cy="5" r="1" /><circle cx="9" cy="19" r="1" />
      <circle cx="15" cy="12" r="1" /><circle cx="15" cy="5" r="1" /><circle cx="15" cy="19" r="1" />
    </svg>
  );
}
