/**
 * ui/filter-preset-dialog.tsx
 *
 * Full dialog for building/editing named filter presets.
 * Supports clause add/remove, field picker, operator selector,
 * value input, AND/OR logic, and save/update to storage.
 */
import { useState, useId } from "react";
import type { ColumnDef } from "@prometheus-ags/entity-graph-core";
import type { FilterPreset } from "../table/presets/types";
import type { FilterClause, FilterOperator } from "@prometheus-ags/entity-graph-core";
import { cn } from "./utils";

interface FilterClauseState {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface FilterPresetDialogProps<TData> {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  columns: ColumnDef<TData>[];
  preset?: FilterPreset | null;
  onSave: (preset: Omit<FilterPreset, "id" | "createdAt" | "updatedAt">) => void;
}

const operators = [
  { value: "eq", label: "equals" },
  { value: "neq", label: "not equals" },
  { value: "contains", label: "contains" },
  { value: "starts_with", label: "starts with" },
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "in", label: "in list" },
  { value: "is_null", label: "is empty" },
  { value: "is_not_null", label: "is not empty" },
];

let nextClauseId = 0;

export function FilterPresetDialog<TData>({
  open,
  onOpenChange,
  columns,
  preset,
  onSave,
}: FilterPresetDialogProps<TData>) {
  const nameId = useId();
  const descriptionId = useId();
  const [name, setName] = useState(preset?.name ?? "");
  const [description, setDescription] = useState(preset?.description ?? "");
  const [isDefault, setIsDefault] = useState(preset?.isDefault ?? false);
  const [logic, setLogic] = useState<"and" | "or">("and");
  const [clauses, setClauses] = useState<FilterClauseState[]>(() => {
    if (!preset?.filter) return [];
    const filterSpec = preset.filter;
    const rawClauses = Array.isArray(filterSpec) ? filterSpec : (filterSpec.clauses ?? []);
    return rawClauses
      .filter((c): c is FilterClause => "field" in c)
      .map((c) => ({
        id: `clause_${++nextClauseId}`,
        field: c.field,
        operator: c.op,
        value: String(c.value ?? ""),
      }));
  });

  const filterableColumns = columns.filter(
    (c) => c.enableFiltering !== false && (c.accessorKey || c.id),
  );

  function addClause() {
    setClauses((prev) => [
      ...prev,
      {
        id: `clause_${++nextClauseId}`,
        field: filterableColumns[0]?.accessorKey ?? filterableColumns[0]?.id ?? "",
        operator: "eq",
        value: "",
      },
    ]);
  }

  function removeClause(id: string) {
    setClauses((prev) => prev.filter((c) => c.id !== id));
  }

  function updateClause(id: string, updates: Partial<FilterClauseState>) {
    setClauses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  }

  function handleSave() {
    const filterClauses = clauses
      .filter((c) => c.field)
      .map((c) => ({
        field: c.field,
        op: c.operator as FilterOperator,
        value: c.value,
      }));

    onSave({
      name,
      description: description || undefined,
      isDefault,
      filter: {
        logic,
        clauses: filterClauses,
      },
    });
    onOpenChange(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border bg-background shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">
            {preset ? "Edit Filter Preset" : "New Filter Preset"}
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
            <label htmlFor={nameId} className="text-sm font-medium">
              Name
            </label>
            <input
              id={nameId}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My filter"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor={descriptionId} className="text-sm font-medium">
              Description
            </label>
            <input
              id={descriptionId}
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
            />
          </div>

          <fieldset className="space-y-2 border-0 p-0">
            <legend className="sr-only">Filter conditions</legend>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Conditions</span>
              <div className="flex items-center gap-1 rounded-md border p-0.5">
                <button
                  type="button"
                  onClick={() => setLogic("and")}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    logic === "and"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  AND
                </button>
                <button
                  type="button"
                  onClick={() => setLogic("or")}
                  className={cn(
                    "rounded px-2 py-0.5 text-xs font-medium",
                    logic === "or"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  OR
                </button>
              </div>
            </div>

            <div className="space-y-2">
              {clauses.map((clause, idx) => (
                <div key={clause.id} className="flex items-center gap-2">
                  {idx > 0 && (
                    <span className="text-xs text-muted-foreground w-8 text-center">
                      {logic.toUpperCase()}
                    </span>
                  )}
                  {idx === 0 && <span className="w-8 text-center text-xs text-muted-foreground">Where</span>}
                  <select
                    value={clause.field}
                    onChange={(e) => updateClause(clause.id, { field: e.target.value })}
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    aria-label={`Field for condition ${idx + 1}`}
                  >
                    {filterableColumns.map((col) => (
                      <option key={col.accessorKey ?? col.id} value={col.accessorKey ?? col.id}>
                        {typeof col.header === "string" ? col.header : (col.accessorKey ?? col.id)}
                      </option>
                    ))}
                  </select>
                  <select
                    value={clause.operator}
                    onChange={(e) => updateClause(clause.id, { operator: e.target.value })}
                    className="h-8 w-[130px] rounded-md border border-input bg-background px-2 text-sm"
                    aria-label={`Operator for condition ${idx + 1}`}
                  >
                    {operators.map((op) => (
                      <option key={op.value} value={op.value}>
                        {op.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={clause.value}
                    onChange={(e) => updateClause(clause.id, { value: e.target.value })}
                    placeholder="Value"
                    className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
                    aria-label={`Value for condition ${idx + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeClause(clause.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
                    aria-label={`Remove condition ${idx + 1}`}
                  >
                    <XIcon className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addClause}
              className="inline-flex h-8 items-center gap-1 rounded-md border border-dashed border-input px-3 text-xs text-muted-foreground hover:text-foreground hover:border-foreground"
            >
              <PlusIcon className="h-3 w-3" />
              Add condition
            </button>
          </fieldset>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="h-4 w-4 rounded border-primary text-primary focus:ring-ring"
            />
            Set as default filter
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Close</title>
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
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
