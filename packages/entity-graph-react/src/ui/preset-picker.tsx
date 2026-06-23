/**
 * ui/preset-picker.tsx
 *
 * Combined popover for selecting, managing, and deleting
 * saved filter and column presets.
 */
import { useState, useRef, useEffect } from "react";
import type { FilterPreset, ColumnPreset } from "../table/presets/types";
import { cn } from "./utils";

interface PresetPickerProps {
  filterPresets: FilterPreset[];
  columnPresets: ColumnPreset[];
  activeFilterId: string | null;
  activeColumnId: string | null;
  onApplyFilter: (id: string | null) => void;
  onApplyColumn: (id: string | null) => void;
  onEditFilter: (preset: FilterPreset) => void;
  onEditColumn: (preset: ColumnPreset) => void;
  onDeleteFilter: (id: string) => void;
  onDeleteColumn: (id: string) => void;
  onNewFilter: () => void;
  onNewColumn: () => void;
  pendingChangesCount?: number;
  className?: string;
}

export function PresetPicker({
  filterPresets,
  columnPresets,
  activeFilterId,
  activeColumnId,
  onApplyFilter,
  onApplyColumn,
  onEditFilter,
  onEditColumn,
  onDeleteFilter,
  onDeleteColumn,
  onNewFilter,
  onNewColumn,
  pendingChangesCount = 0,
  className,
}: PresetPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"filters" | "columns">("filters");
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

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
        aria-label="Open presets menu"
        className={cn(
          "inline-flex h-9 items-center gap-1 rounded-md border border-input bg-background px-3 text-sm hover:bg-accent",
          (activeFilterId || activeColumnId) && "border-primary text-primary",
        )}
      >
        <BookmarkIcon className="h-4 w-4" />
        Presets
        {pendingChangesCount > 0 && (
          <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] text-white">
            {pendingChangesCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className="absolute right-0 z-50 mt-1 w-[280px] rounded-md border bg-popover shadow-md"
        >
          <div className="flex border-b">
            <button
              type="button"
              onClick={() => setActiveTab("filters")}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium",
                activeTab === "filters"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Filters
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("columns")}
              className={cn(
                "flex-1 px-4 py-2 text-sm font-medium",
                activeTab === "columns"
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Columns
            </button>
          </div>

          <div className="max-h-[300px] overflow-auto p-2">
            {activeTab === "filters" ? (
              <>
                {activeFilterId && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyFilter(null);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                  >
                    Clear active filter
                  </button>
                )}
                {filterPresets.map((preset) => (
                  <PresetItem
                    key={preset.id}
                    name={preset.name}
                    description={preset.description}
                    isActive={preset.id === activeFilterId}
                    isDefault={preset.isDefault}
                    onApply={() => {
                      onApplyFilter(preset.id);
                      setIsOpen(false);
                    }}
                    onEdit={() => {
                      onEditFilter(preset);
                      setIsOpen(false);
                    }}
                    onDelete={() => onDeleteFilter(preset.id)}
                  />
                ))}
                {filterPresets.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No saved filter presets
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onNewFilter();
                    setIsOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-1 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground"
                >
                  <PlusIcon className="h-3 w-3" /> Save current as preset
                </button>
              </>
            ) : (
              <>
                {activeColumnId && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyColumn(null);
                      setIsOpen(false);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent"
                  >
                    Clear active column layout
                  </button>
                )}
                {columnPresets.map((preset) => (
                  <PresetItem
                    key={preset.id}
                    name={preset.name}
                    description={preset.description}
                    isActive={preset.id === activeColumnId}
                    isDefault={preset.isDefault}
                    onApply={() => {
                      onApplyColumn(preset.id);
                      setIsOpen(false);
                    }}
                    onEdit={() => {
                      onEditColumn(preset);
                      setIsOpen(false);
                    }}
                    onDelete={() => onDeleteColumn(preset.id)}
                  />
                ))}
                {columnPresets.length === 0 && (
                  <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                    No saved column presets
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onNewColumn();
                    setIsOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-1 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:border-foreground"
                >
                  <PlusIcon className="h-3 w-3" /> Save current as preset
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Preset list item
// ---------------------------------------------------------------------------
function PresetItem({
  name,
  description,
  isActive,
  isDefault,
  onApply,
  onEdit,
  onDelete,
}: {
  name: string;
  description?: string;
  isActive: boolean;
  isDefault?: boolean;
  onApply: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div
      className={cn(
        "group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-accent",
        isActive && "bg-primary/10",
      )}
    >
      <button
        type="button"
        onClick={onApply}
        className="flex flex-1 flex-col items-start min-w-0"
      >
        <span className="flex items-center gap-1 text-sm font-medium truncate">
          {name}
          {isDefault && (
            <span className="text-[10px] text-muted-foreground">(default)</span>
          )}
          {isActive && (
            <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          )}
        </span>
        {description && (
          <span className="text-xs text-muted-foreground truncate">
            {description}
          </span>
        )}
      </button>

      <div className="hidden items-center gap-0.5 group-hover:flex">
        <button
          type="button"
          onClick={onEdit}
          title="Edit"
          aria-label="Edit preset"
          className="inline-flex h-6 w-6 items-center justify-center rounded hover:bg-background"
        >
          <PencilIcon className="h-3 w-3" />
        </button>
        {showDeleteConfirm ? (
          <button
            type="button"
            onClick={() => {
              onDelete();
              setShowDeleteConfirm(false);
            }}
            className="inline-flex h-6 items-center rounded px-1 text-[10px] font-medium text-destructive hover:bg-destructive hover:text-destructive-foreground"
          >
            Confirm
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            title="Delete"
            aria-label="Delete preset"
            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground hover:bg-background hover:text-destructive"
          >
            <TrashIcon className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function BookmarkIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Presets</title>
      <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Add</title>
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Edit</title>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Delete</title>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
