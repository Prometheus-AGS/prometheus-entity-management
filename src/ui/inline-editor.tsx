/**
 * ui/inline-editor.tsx
 *
 * Shared inline editing primitives:
 * - InlineCellEditor: for table cells (double-click to edit)
 * - InlineItemEditor: expand-in-place form for gallery/list items
 */
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  useId,
} from "react";
import type { KeyboardEvent } from "react";
import type { ColumnDef, ItemDescriptor } from "../table/types";
import { cn } from "./utils";

// ---------------------------------------------------------------------------
// InlineCellEditor — table cell inline editing
// ---------------------------------------------------------------------------
interface InlineCellEditorProps<TData> {
  value: unknown;
  columnDef: ColumnDef<TData>;
  onSave: (value: unknown) => void;
  onCancel: () => void;
  className?: string;
  /** Associates the control with a `<label htmlFor>` in parent forms. */
  inputId?: string;
  /** Accessible name for the control (required when used without a visible label). */
  ariaLabel?: string;
}

export function InlineCellEditor<TData>({
  value: initialValue,
  columnDef,
  onSave,
  onCancel,
  className,
  inputId,
  ariaLabel,
}: InlineCellEditorProps<TData>) {
  const [value, setValue] = useState<unknown>(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);
  const selectRef = useRef<HTMLSelectElement>(null);
  const filterType = columnDef.meta?.entityMeta?.filterType ?? "text";

  useEffect(() => {
    if (filterType === "enum") {
      selectRef.current?.focus();
      return;
    }
    if (filterType === "boolean") return;
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [filterType]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        onSave(value);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    },
    [value, onSave, onCancel],
  );

  const handleBlur = useCallback(() => {
    onSave(value);
  }, [value, onSave]);

  if (filterType === "boolean") {
    return (
      <div className={cn("flex items-center", className)}>
        <input
          id={inputId}
          type="checkbox"
          checked={!!value}
          onChange={(e) => {
            setValue(e.target.checked);
            onSave(e.target.checked);
          }}
          className="h-4 w-4 rounded border-primary text-primary focus:ring-ring"
          aria-label={ariaLabel ?? "Edit boolean value"}
        />
      </div>
    );
  }

  if (filterType === "enum") {
    const options = columnDef.meta?.entityMeta?.enumOptions ?? [];
    return (
      <select
        ref={selectRef}
        id={inputId}
        value={String(value ?? "")}
        onChange={(e) => {
          setValue(e.target.value);
          onSave(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "h-8 w-full rounded-md border border-input bg-background px-2 text-sm",
          className,
        )}
        aria-label={ariaLabel ?? "Select value"}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    );
  }

  if (filterType === "number") {
    return (
      <input
        ref={inputRef}
        id={inputId}
        type="number"
        value={value != null ? String(value) : ""}
        onChange={(e) => setValue(e.target.value === "" ? null : Number(e.target.value))}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "h-8 w-full rounded-md border border-input bg-background px-2 text-sm",
          className,
        )}
        aria-label={ariaLabel ?? "Edit number"}
        placeholder="0"
      />
    );
  }

  if (filterType === "date" || filterType === "dateRange") {
    return (
      <input
        ref={inputRef}
        id={inputId}
        type="date"
        value={value != null ? String(value) : ""}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        className={cn(
          "h-8 w-full rounded-md border border-input bg-background px-2 text-sm",
          className,
        )}
        aria-label={ariaLabel ?? "Edit date"}
      />
    );
  }

  return (
    <input
      ref={inputRef}
      id={inputId}
      type="text"
      value={value != null ? String(value) : ""}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={handleKeyDown}
      onBlur={handleBlur}
      className={cn(
        "h-8 w-full rounded-md border border-input bg-background px-2 text-sm",
        className,
      )}
      aria-label={ariaLabel ?? "Edit text"}
      placeholder="Value"
    />
  );
}

// ---------------------------------------------------------------------------
// InlineItemEditor — expand-in-place form for gallery/list items
// ---------------------------------------------------------------------------
interface InlineItemEditorProps<TData extends object> {
  item: TData;
  columns: ColumnDef<TData>[];
  itemDescriptor?: ItemDescriptor<TData>;
  onSave: (changes: Partial<TData>) => void;
  onCancel: () => void;
  className?: string;
}

export function InlineItemEditor<TData extends object>({
  item,
  columns,
  itemDescriptor: _itemDescriptor,
  onSave,
  onCancel,
  className,
}: InlineItemEditorProps<TData>) {
  const baseId = useId();
  const [editValues, setEditValues] = useState<Record<string, unknown>>({});

  const editableFields = columns.filter(
    (c) => c.meta?.entityMeta?.editable && c.accessorKey,
  );

  function updateField(field: string, value: unknown) {
    setEditValues((prev) => ({ ...prev, [field]: value }));
  }

  function handleSave() {
    const changes: Partial<TData> = {};
    for (const [key, val] of Object.entries(editValues)) {
      (changes as Record<string, unknown>)[key] = val;
    }
    onSave(changes);
  }

  return (
    <div
      className={cn(
        "space-y-3 rounded-md border bg-muted/30 p-4 animate-in slide-in-from-top-2 duration-200",
        className,
      )}
    >
      {editableFields.map((col) => {
        const key = col.accessorKey as string;
        const label =
          typeof col.header === "string" ? col.header : key;
        const currentValue = key in editValues ? editValues[key] : (item as Record<string, unknown>)[key];
        const fieldId = `${baseId}-${key}`;

        return (
          <div key={key} className="space-y-1">
            <label htmlFor={fieldId} className="text-xs font-medium text-muted-foreground">
              {label}
            </label>
            <InlineCellEditor
              value={currentValue}
              columnDef={col}
              onSave={(v) => updateField(key, v)}
              onCancel={() => {}}
              inputId={fieldId}
              ariaLabel={label}
            />
          </div>
        );
      })}

      <div className="flex justify-end gap-2 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium hover:bg-accent"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSave}
          className="inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Save
        </button>
      </div>
    </div>
  );
}
