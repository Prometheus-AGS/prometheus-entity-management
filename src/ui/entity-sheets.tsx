/**
 * ui/EntitySheets.tsx
 *
 * EntityDetailSheet — right-panel detail view with edit/delete actions.
 * EntityFormSheet   — right-panel create / edit form with field-level dirty tracking.
 */
import React from "react";
import { X, Loader2, Pencil, Trash2 } from "lucide-react";
import { cn } from "./utils";
import type { CRUDState } from "../crud/use-entity-crud";
import { getValueAtPath } from "../object-path";
import { MarkdownFieldEditor, MarkdownFieldRenderer } from "../schema";

// ---------------------------------------------------------------------------
// Field descriptors
// ---------------------------------------------------------------------------
export type FieldType = "text" | "textarea" | "number" | "email" | "url" | "date" | "boolean" | "enum" | "json" | "markdown" | "custom";

export interface FieldDescriptor<TEntity> {
  field: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  options?: Array<{ value: string; label: string }>;
  hint?: string;
  render?: (value: unknown, entity: TEntity) => React.ReactNode;
  editControl?: (value: unknown, onChange: (v: unknown) => void, entity: Partial<TEntity>) => React.ReactNode;
  hideOnCreate?: boolean;
  hideOnEdit?: boolean;
  readonlyOnEdit?: boolean;
}

// ---------------------------------------------------------------------------
// Sheet wrapper
// ---------------------------------------------------------------------------
export function Sheet({ open, onClose, title, subtitle, children, footer, width = "w-[480px]" }: {
  open: boolean; onClose: () => void; title: string; subtitle?: string;
  children: React.ReactNode; footer?: React.ReactNode; width?: string;
}) {
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    if (open) window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <>
      <div onClick={onClose} className={cn("fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0 pointer-events-none")} />
      <div className={cn("fixed top-0 right-0 h-full z-50 flex flex-col border-l bg-background shadow-2xl transition-transform duration-300", width, open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 border-b shrink-0">
          <div><h2 className="text-base font-semibold">{title}</h2>{subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors mt-0.5"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="shrink-0 px-5 py-4 border-t flex items-center gap-2">{footer}</div>}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Generic field control
// ---------------------------------------------------------------------------
function FieldControl<TEntity extends object>({ descriptor, value, onChange, entity, readonly }: { descriptor: FieldDescriptor<TEntity>; value: unknown; onChange: (v: unknown) => void; entity: Partial<TEntity>; readonly?: boolean }) {
  if (descriptor.editControl && !readonly) return <>{descriptor.editControl(value, onChange, entity)}</>;
  if (readonly && descriptor.render) return <>{descriptor.render(value, entity as TEntity)}</>;
  if (readonly) return <p className="text-sm py-1">{value != null && value !== "" ? String(value) : "—"}</p>;
  const base = "h-8 px-2.5 rounded-md border bg-muted/50 text-sm focus:outline-none focus:ring-1 focus:ring-ring transition-colors w-full";
  switch (descriptor.type) {
    case "text": case "email": case "url":
      return <input type={descriptor.type} value={String(value ?? "")} onChange={e => onChange(e.target.value)} placeholder={descriptor.placeholder} className={base} />;
    case "number":
      return <input type="number" value={String(value ?? "")} onChange={e => onChange(e.target.valueAsNumber)} placeholder={descriptor.placeholder} className={base} />;
    case "textarea":
      return <textarea value={String(value ?? "")} onChange={e => onChange(e.target.value)} placeholder={descriptor.placeholder} className="w-full min-h-[80px] rounded-md border bg-muted/50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring transition-colors" />;
    case "markdown":
      return <MarkdownFieldEditor value={String(value ?? "")} onChange={(nextValue) => onChange(nextValue)} placeholder={descriptor.placeholder} />;
    case "date":
      return <input type="date" value={value ? new Date(value as string).toISOString().split("T")[0] : ""} onChange={e => onChange(e.target.value ? new Date(e.target.value).toISOString() : null)} className={base} />;
    case "boolean":
      return (
        <button type="button" role="switch" aria-checked={!!value} onClick={() => onChange(!value)}
          className={cn("relative inline-flex h-5 w-9 items-center rounded-full transition-colors", value ? "bg-primary" : "bg-input")}>
          <span className={cn("inline-block h-3.5 w-3.5 rounded-full bg-background shadow transition-transform", value ? "translate-x-4" : "translate-x-0.5")} />
        </button>
      );
    case "enum":
      return (
        <select value={String(value ?? "")} onChange={e => onChange(e.target.value)} className={cn(base, "appearance-none cursor-pointer")}>
          {!value && <option value="">Select…</option>}
          {(descriptor.options ?? []).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
    case "json":
      return (
        <textarea
          value={value != null ? JSON.stringify(value, null, 2) : ""}
          onChange={(event) => {
            const nextValue = event.target.value;
            try {
              onChange(nextValue ? JSON.parse(nextValue) : null);
            } catch {
              onChange(nextValue);
            }
          }}
          placeholder={descriptor.placeholder}
          className="w-full min-h-[120px] rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono resize-y focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
        />
      );
    default:
      return <input value={String(value ?? "")} onChange={e => onChange(e.target.value)} className={base} />;
  }
}

function FieldReadonlyValue<TEntity extends object>({ descriptor, value, entity }: { descriptor: FieldDescriptor<TEntity>; value: unknown; entity: TEntity }) {
  if (descriptor.render) return <>{descriptor.render(value, entity)}</>;
  if (descriptor.type === "markdown") return <MarkdownFieldRenderer value={String(value ?? "")} className="prose prose-sm max-w-none py-1" />;
  if (descriptor.type === "json") return <pre className="text-xs py-1 whitespace-pre-wrap break-words">{JSON.stringify(value ?? null, null, 2)}</pre>;
  return <p className="text-sm py-1">{value != null && value !== "" ? String(value) : "—"}</p>;
}

// ---------------------------------------------------------------------------
// EntityDetailSheet
// ---------------------------------------------------------------------------
export function EntityDetailSheet<TEntity extends object>({ crud, fields, title = "Details", description, children, showEditButton = true, showDeleteButton = true, deleteConfirmMessage = "This action cannot be undone." }: {
  crud: CRUDState<TEntity>; fields: FieldDescriptor<TEntity>[];
  title?: string | ((e: TEntity) => string);
  description?: string | ((e: TEntity) => string);
  children?: (entity: TEntity, crud: CRUDState<TEntity>) => React.ReactNode;
  showEditButton?: boolean; showDeleteButton?: boolean; deleteConfirmMessage?: string;
}) {
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const open = crud.mode === "detail" && !!crud.selectedId;
  const entity = crud.detail;
  const resolvedTitle = entity && typeof title === "function" ? title(entity) : String(title);
  const resolvedDesc = entity && description ? (typeof description === "function" ? description(entity) : description) : undefined;

  return (
    <Sheet open={open} onClose={() => crud.select(null)} title={resolvedTitle} subtitle={resolvedDesc}
      footer={<>
        {showEditButton && <button onClick={() => crud.startEdit()} className="flex-1 h-8 rounded-md border text-sm hover:bg-muted transition-colors flex items-center justify-center gap-1.5"><Pencil className="w-3.5 h-3.5" />Edit</button>}
        {showDeleteButton && <button onClick={() => setConfirmDelete(true)} className="h-8 w-8 flex items-center justify-center rounded-md border text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>}
      </>}>
      {crud.detailIsLoading && <div className="flex items-center justify-center h-32"><Loader2 className="w-4 h-4 animate-spin text-muted-foreground" /></div>}
      {entity && (
        <div className="flex flex-col gap-4">
          {fields.map(f => (
            <div key={f.field}>
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{f.label}</p>
              <FieldReadonlyValue descriptor={f} value={getValueAtPath(entity, f.field)} entity={entity} />
            </div>
          ))}
          {children && (<><div className="border-t my-1" />{children(entity, crud)}</>)}
        </div>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setConfirmDelete(false)} className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative bg-background border rounded-xl shadow-2xl w-full max-w-sm p-5 animate-in fade-in">
            <h3 className="text-sm font-semibold mb-1">Delete {resolvedTitle}?</h3>
            <p className="text-xs text-muted-foreground mb-4">{deleteConfirmMessage}</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="h-7 px-3 rounded border text-sm hover:bg-muted transition-colors">Cancel</button>
              <button onClick={async () => { await crud.deleteEntity(); setConfirmDelete(false); }} disabled={crud.isDeleting}
                className="h-7 px-3 rounded bg-destructive text-destructive-foreground text-sm hover:bg-destructive/90 transition-colors disabled:opacity-50 flex items-center gap-1">
                {crud.isDeleting && <Loader2 className="w-3 h-3 animate-spin" />}Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </Sheet>
  );
}

// ---------------------------------------------------------------------------
// EntityFormSheet
// ---------------------------------------------------------------------------
export function EntityFormSheet<TEntity extends object>({ crud, fields, createTitle = "Create", editTitle = "Edit" }: {
  crud: CRUDState<TEntity>; fields: FieldDescriptor<TEntity>[];
  createTitle?: string; editTitle?: string | ((e: TEntity) => string);
}) {
  const isCreate = crud.mode === "create"; const isEdit = crud.mode === "edit";
  const open = isCreate || isEdit;
  const buf = isCreate ? crud.createBuffer : crud.editBuffer;
  const setField = isCreate ? crud.setCreateField : crud.setField;
  const handleSave = isCreate ? crud.create : crud.save;
  const handleClose = isCreate ? crud.cancelCreate : crud.cancelEdit;
  const isPending = isCreate ? crud.isCreating : crud.isSaving;
  const error = isCreate ? crud.createError : crud.saveError;
  const resolvedTitle = isCreate ? createTitle : (crud.detail && typeof editTitle === "function" ? editTitle(crud.detail) : String(editTitle));
  const visibleFields = fields.filter(f => isCreate ? !f.hideOnCreate : !f.hideOnEdit);

  return (
    <Sheet open={open} onClose={handleClose} title={resolvedTitle}
      subtitle={isEdit && crud.dirty.isDirty ? `${crud.dirty.changed.size} field${crud.dirty.changed.size > 1 ? "s" : ""} modified` : undefined}
      footer={<>
        <button onClick={handleClose} disabled={isPending} className="flex-1 h-8 rounded-md border text-sm hover:bg-muted transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={isPending || (isEdit && !crud.dirty.isDirty)} className="flex-1 h-8 rounded-md bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5">
          {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}{isCreate ? "Create" : "Save changes"}
        </button>
      </>}>
      <div className="flex flex-col gap-4">
        {error && <div className="px-3 py-2 rounded-md bg-destructive/10 border border-destructive/20 text-xs text-destructive">{error}</div>}
        {visibleFields.map(f => {
          const isDirty = !isCreate && crud.dirty.changed.has(f.field);
          const currentValue = getValueAtPath(buf, f.field);
          return (
            <div key={f.field} className="flex flex-col gap-1.5">
              <label className={cn("text-xs font-medium", isDirty ? "text-primary" : "text-muted-foreground")}>
                {f.label}{f.required && <span className="text-destructive ml-0.5">*</span>}
                {isDirty && <span className="ml-1.5 text-[10px] font-normal opacity-70">modified</span>}
              </label>
              <FieldControl descriptor={f} value={currentValue} onChange={v => setField(f.field, v)} entity={buf} readonly={f.readonlyOnEdit && isEdit} />
              {f.hint && <p className="text-[10px] text-muted-foreground">{f.hint}</p>}
            </div>
          );
        })}
      </div>
    </Sheet>
  );
}
