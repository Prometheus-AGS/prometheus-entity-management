import React, { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import {
  textColumn,
  numberColumn,
  dateColumn,
  enumColumn,
  actionsColumn,
} from "prometheus-entity-management";
import { PageHeader } from "@/components/shared/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EntityTable } from "@/components/shared/entity-table";
import { Sheet } from "@/components/shared/sheet";
import { useTasksCrud } from "@/features/tasks/task-hooks";
import { cn } from "@/lib/utils";
import type { Task } from "@/types";
import { Label } from "@/components/ui/label";
import { Plus, Pencil, Trash2, Eye, Code2, Table, PanelRight, Loader2 } from "lucide-react";

// ── Tab navigation ────────────────────────────────────────────────────────

type DemoTab = "columns" | "table" | "sheets";

const TABS: Array<{ id: DemoTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: "columns", label: "Column Helpers", icon: Code2 },
  { id: "table",   label: "EntityTable",    icon: Table },
  { id: "sheets",  label: "Sheets",         icon: PanelRight },
];

// ── Column helper demos ───────────────────────────────────────────────────

function buildDemoColumns(
  onView: (t: Task) => void,
  onEdit: (t: Task) => void,
  onDelete: (t: Task) => void,
): ColumnDef<Task>[] {
  return [
    textColumn<Task>({
      field: "title",
      header: "Title",
      size: 260,
      cell: (v) => (
        <span className="font-medium text-[--color-text-primary] truncate block">{v}</span>
      ),
    }),
    enumColumn<Task>({
      field: "status",
      header: "Status",
      size: 130,
      options: [
        { value: "backlog",      label: "Backlog",     className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
        { value: "todo",         label: "To Do",       className: "bg-muted text-muted-foreground" },
        { value: "in-progress",  label: "In Progress", className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
        { value: "review",       label: "Review",      className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
        { value: "done",         label: "Done",        className: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
        { value: "cancelled",    label: "Cancelled",   className: "bg-red-500/15 text-red-600 dark:text-red-400" },
      ],
    }),
    enumColumn<Task>({
      field: "priority",
      header: "Priority",
      size: 110,
      options: [
        { value: "low",      label: "Low",      className: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
        { value: "medium",   label: "Medium",   className: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
        { value: "high",     label: "High",     className: "bg-amber-500/15 text-amber-600 dark:text-amber-400" },
        { value: "critical", label: "Critical", className: "bg-red-500/15 text-red-600 dark:text-red-400" },
      ],
    }),
    numberColumn<Task>({
      field: "storyPoints",
      header: "Points",
      size: 80,
    }),
    numberColumn<Task>({
      field: "loggedHours",
      header: "Logged",
      size: 90,
      format: (v) => `${v}h`,
    }),
    dateColumn<Task>({
      field: "dueDate",
      header: "Due Date",
      size: 130,
    }),
    dateColumn<Task>({
      field: "createdAt",
      header: "Created",
      size: 130,
    }),
    actionsColumn<Task>([
      { label: "View",   icon: Eye,    onClick: onView },
      { label: "Edit",   icon: Pencil, onClick: onEdit },
      { label: "Delete", icon: Trash2, onClick: onDelete, destructive: true },
    ]),
  ];
}

// ── Code preview block ────────────────────────────────────────────────────

function CodeBlock({ title, code }: { title: string; code: string }) {
  return (
    <div className="rounded-lg bg-muted/50 overflow-hidden">
      <div className="px-3 py-2 bg-muted/80">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wide">{title}</span>
      </div>
      <pre className="px-4 py-3 text-xs font-mono text-[--color-text-secondary] overflow-x-auto leading-relaxed">
        {code}
      </pre>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function UIDemoPage() {
  const [activeTab, setActiveTab] = useState<DemoTab>("columns");

  const crud = useTasksCrud({
    listQueryKey: ["tasks-ui-demo"],
    initialView: { sort: [{ field: "updatedAt", direction: "desc" }] },
  });

  const columns = buildDemoColumns(
    (t) => crud.openDetail(t.id),
    (t) => crud.startEdit(t.id),
    (t) => crud.deleteEntity(t.id),
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="UI Components"
        subtitle="Library-bundled EntityTable, column helpers, and sheet components"
      >
        <Button size="sm" onClick={crud.startCreate}>
          <Plus className="w-3.5 h-3.5" />
          New Task
        </Button>
      </PageHeader>

      {/* Tab bar */}
      <div className="flex items-center gap-1 px-4 py-2 shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab(id)}
            className={cn(
              "gap-1.5 text-xs font-medium h-8 px-3",
              activeTab === id
                ? "bg-primary/12 text-primary hover:bg-primary/15 hover:text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </Button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "columns" && (
          <ColumnsDemo columns={columns} crud={crud} />
        )}
        {activeTab === "table" && (
          <TableDemo crud={crud} columns={columns} />
        )}
        {activeTab === "sheets" && (
          <SheetsDemo crud={crud} />
        )}
      </div>

      {/* Sheets rendered at page level so they work from any tab */}
      {crud.mode === "detail" && crud.selectedId && (
        <DetailPreviewSheet crud={crud} />
      )}
      {(crud.mode === "create" || crud.mode === "edit") && (
        <FormPreviewSheet crud={crud} />
      )}
    </div>
  );
}

// ── Tab: Column Helpers ───────────────────────────────────────────────────

function ColumnsDemo({ columns, crud }: { columns: ColumnDef<Task>[]; crud: ReturnType<typeof useTasksCrud> }) {
  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-[--color-text-primary] mb-1">Column Helper Functions</h2>
          <p className="text-sm text-[--color-text-muted]">
            Type-safe column builders that carry TanStack Table config and entity-store metadata for filtering.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <CodeBlock
            title="textColumn"
            code={`textColumn<Task>({
  field: "title",
  header: "Title",
  size: 260,
  cell: (v) => <span>{v}</span>,
})`}
          />
          <CodeBlock
            title="enumColumn"
            code={`enumColumn<Task>({
  field: "status",
  header: "Status",
  options: [
    { value: "backlog", label: "Backlog",
      className: "bg-zinc-500/15 ..." },
    { value: "done", label: "Done",
      className: "bg-emerald-500/15 ..." },
  ],
})`}
          />
          <CodeBlock
            title="numberColumn"
            code={`numberColumn<Task>({
  field: "loggedHours",
  header: "Logged",
  format: (v) => \`\${v}h\`,
})`}
          />
          <CodeBlock
            title="dateColumn"
            code={`dateColumn<Task>({
  field: "dueDate",
  header: "Due Date",
  size: 130,
})`}
          />
          <CodeBlock
            title="actionsColumn"
            code={`actionsColumn<Task>([
  { label: "View",   icon: Eye,
    onClick: onView },
  { label: "Edit",   icon: Pencil,
    onClick: onEdit },
  { label: "Delete", icon: Trash2,
    onClick: onDelete,
    destructive: true },
])`}
          />
          <CodeBlock
            title="SortHeader"
            code={`<SortHeader
  column={column}
  label="Title"
/>
// Renders ↑ ↓ ↕ indicators
// Toggles sort direction on click`}
          />
        </div>

        <div className="pt-4">
          <h3 className="text-xs font-semibold text-[--color-text-primary] uppercase tracking-wide mb-3">
            Live Preview
          </h3>
          <div className="rounded-xl bg-muted/30 overflow-hidden h-[300px]">
            <EntityTable
              viewResult={crud.list}
              columns={columns}
              searchPlaceholder="Search tasks…"
              paginationMode="loadMore"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tab: EntityTable ──────────────────────────────────────────────────────

function TableDemo({ crud, columns }: { crud: ReturnType<typeof useTasksCrud>; columns: ColumnDef<Task>[] }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 bg-muted/40 shrink-0">
        <div className="max-w-4xl mx-auto">
          <p className="text-xs text-[--color-text-muted]">
            Full-featured data table with sorting synced to useEntityView, skeleton loading, empty state, and load-more pagination.
            Built on TanStack Table with columns built using the library's helper functions.
          </p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <EntityTable
          viewResult={crud.list}
          columns={columns}
          selectedId={crud.selectedId}
          onRowClick={(t) => crud.openDetail(t.id)}
          searchPlaceholder="Search tasks…"
          paginationMode="loadMore"
        />
      </div>
    </div>
  );
}

// ── Tab: Sheets ───────────────────────────────────────────────────────────

function SheetsDemo({ crud }: { crud: ReturnType<typeof useTasksCrud> }) {
  return (
    <div className="overflow-y-auto h-full">
      <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6">
        <div>
          <h2 className="text-base font-semibold text-[--color-text-primary] mb-1">Sheet Components</h2>
          <p className="text-sm text-[--color-text-muted]">
            Slide-over panels for detail views and forms. EntityDetailSheet renders read-only fields from a FieldDescriptor array.
            EntityFormSheet drives create/edit forms with dirty tracking.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-xl bg-muted/50 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-[--color-text-muted]" />
              <h3 className="text-sm font-semibold text-[--color-text-primary]">EntityDetailSheet</h3>
            </div>
            <p className="text-xs text-[--color-text-muted]">
              Read-only detail view with field descriptors, edit/delete buttons, and confirmation dialog.
            </p>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const firstTask = crud.list.items[0];
                if (firstTask) crud.openDetail(firstTask.id);
              }}
            >
              Open Detail Sheet
            </Button>
          </div>

          <div className="rounded-xl bg-muted/50 p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Pencil className="w-4 h-4 text-[--color-text-muted]" />
              <h3 className="text-sm font-semibold text-[--color-text-primary]">EntityFormSheet</h3>
            </div>
            <p className="text-xs text-[--color-text-muted]">
              Create/edit form with dirty tracking, field-level modified indicators, and save/cancel actions.
            </p>
            <Button variant="secondary" size="sm" onClick={crud.startCreate}>
              Open Create Form
            </Button>
          </div>
        </div>

        <CodeBlock
          title="FieldDescriptor usage"
          code={`const fields: FieldDescriptor<Task>[] = [
  { field: "title", label: "Title",
    type: "text", required: true },
  { field: "status", label: "Status",
    type: "enum", options: STATUS_OPTS },
  { field: "priority", label: "Priority",
    type: "enum", options: PRIORITY_OPTS },
  { field: "dueDate", label: "Due Date",
    type: "date" },
  { field: "estimatedHours", label: "Est. Hours",
    type: "number" },
];`}
        />

        <CodeBlock
          title="EntityDetailSheet"
          code={`<EntityDetailSheet
  crud={crud}
  fields={fields}
  title={(e) => e.title}
  description={(e) => \`\${e.status} · \${e.priority}\`}
  showEditButton
  showDeleteButton
/>`}
        />

        <CodeBlock
          title="EntityFormSheet"
          code={`<EntityFormSheet
  crud={crud}
  fields={fields}
  createTitle="New Task"
  editTitle={(e) => \`Edit: \${e.title}\`}
/>`}
        />
      </div>
    </div>
  );
}

// ── Preview sheet implementations ─────────────────────────────────────────

function DetailPreviewSheet({ crud }: { crud: ReturnType<typeof useTasksCrud> }) {
  const task = crud.detail;
  if (!task) return null;

  return (
    <Sheet
      open
      onClose={() => crud.select(null)}
      title={task.title}
      subtitle={`${task.status} · ${task.priority}`}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={() => crud.select(null)} className="flex-1">
            Close
          </Button>
          <Button size="sm" onClick={() => crud.startEdit()} className="flex-1">
            <Pencil className="w-3.5 h-3.5" />Edit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <DetailRow label="Description" value={task.description || "—"} />
        <DetailRow label="Status" value={task.status} />
        <DetailRow label="Priority" value={task.priority} />
        <DetailRow label="Story Points" value={task.storyPoints != null ? String(task.storyPoints) : "—"} />
        <DetailRow label="Logged Hours" value={`${task.loggedHours}h`} />
        <DetailRow label="Due Date" value={task.dueDate ?? "—"} />
        <DetailRow label="Created" value={task.createdAt} />
        <DetailRow label="Tags" value={task.tags.length > 0 ? task.tags.join(", ") : "—"} />
      </div>
    </Sheet>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-[--color-text-primary]">{value}</p>
    </div>
  );
}

function FormPreviewSheet({ crud }: { crud: ReturnType<typeof useTasksCrud> }) {
  const isCreate = crud.mode === "create";
  const buf = isCreate ? crud.createBuffer : crud.editBuffer;
  const setField = isCreate ? crud.setCreateField : crud.setField;
  const handleSave = isCreate ? crud.create : crud.save;
  const handleClose = isCreate ? crud.cancelCreate : crud.cancelEdit;
  const isPending = isCreate ? crud.isCreating : crud.isSaving;

  type K = keyof Task;

  const STATUS_OPTS = [
    { value: "backlog", label: "Backlog" },
    { value: "todo", label: "To Do" },
    { value: "in-progress", label: "In Progress" },
    { value: "review", label: "Review" },
    { value: "done", label: "Done" },
  ];

  const PRIORITY_OPTS = [
    { value: "low", label: "Low" },
    { value: "medium", label: "Medium" },
    { value: "high", label: "High" },
    { value: "critical", label: "Critical" },
  ];

  return (
    <Sheet
      open
      onClose={handleClose}
      title={isCreate ? "New Task (Library Form)" : "Edit Task (Library Form)"}
      subtitle={
        !isCreate && crud.dirty.isDirty
          ? `${crud.dirty.changed.size} field${crud.dirty.changed.size > 1 ? "s" : ""} modified`
          : undefined
      }
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose} className="flex-1">Cancel</Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || (!isCreate && !crud.dirty.isDirty)}
            className="flex-1"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isCreate ? "Create" : "Save"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Title" dirty={crud.dirty.changed.has("title" as K)}>
          <Input
            value={String(buf.title ?? "")}
            onChange={(e) => setField("title" as K, e.target.value as Task[K])}
            placeholder="Task title"
            className="bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
          />
        </FormField>

        <FormField label="Status">
          <Select
            value={String(buf.status ?? "backlog")}
            onValueChange={(v) => setField("status" as K, v as Task[K])}
          >
            <SelectTrigger className="h-8 bg-muted/70 border-0 text-sm focus:ring-2 focus:ring-primary/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Priority">
          <Select
            value={String(buf.priority ?? "medium")}
            onValueChange={(v) => setField("priority" as K, v as Task[K])}
          >
            <SelectTrigger className="h-8 bg-muted/70 border-0 text-sm focus:ring-2 focus:ring-primary/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PRIORITY_OPTS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Story Points">
          <Input
            type="number"
            value={String(buf.storyPoints ?? "")}
            onChange={(e) => setField("storyPoints" as K, (e.target.value ? Number(e.target.value) : null) as Task[K])}
            placeholder="—"
            className="bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0"
          />
        </FormField>
      </div>
    </Sheet>
  );
}

function FormField({ label, children, dirty }: { label: string; children: React.ReactNode; dirty?: boolean }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className={cn(
        "text-xs font-medium",
        dirty ? "text-primary" : "text-[--color-text-secondary]"
      )}>
        {label}
        {dirty && <span className="ml-1.5 text-[10px] font-normal opacity-70">modified</span>}
      </Label>
      {children}
    </div>
  );
}
