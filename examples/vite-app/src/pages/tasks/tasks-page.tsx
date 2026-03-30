import React, { useState, useCallback } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { useEntityAugment } from "prometheus-entity-management";
import { PageHeader } from "@/components/shared/ui";
import { TaskStatusBadge, PriorityBadge, UserAvatar } from "@/components/shared/entity-badges";
import { EntityTable, SortHeader } from "@/components/shared/entity-table";
import { Sheet, ConfirmDialog, Field, Input, Textarea, Select } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { useProject, useProjectsList } from "@/features/projects/project-hooks";
import {
  useTaskStatusMutation,
  useTasksCrud,
} from "@/features/tasks/task-hooks";
import { useUser, useUsersList } from "@/features/users/user-hooks";
import { formatDate, formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { Task, Project, User } from "@/types";

// ── Option arrays ─────────────────────────────────────────────────────────

const STATUS_OPTS = [
  { value: "backlog",      label: "Backlog"      },
  { value: "todo",         label: "To Do"        },
  { value: "in-progress",  label: "In Progress"  },
  { value: "review",       label: "Review"       },
  { value: "done",         label: "Done"         },
  { value: "cancelled",    label: "Cancelled"    },
];
const PRIORITY_OPTS = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" },
];

// ── Proper React component cell renderers ─────────────────────────────────

/** Inline status selector — optimistic patch via useEntityAugment, server confirm via feature mutation hook. */
function InlineStatusCell({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const { augment, clear } = useEntityAugment<Task>("Task", task.id);
  const statusMutation = useTaskStatusMutation();

  const handleChange = useCallback(
    async (status: Task["status"]) => {
      setOpen(false);
      augment({ status });
      try {
        await statusMutation.mutate({ id: task.id, status });
        clear();
      } catch {
        clear();
      }
    },
    [task.id, augment, clear, statusMutation]
  );

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        className="h-auto p-0 hover:bg-transparent hover:opacity-80"
      >
        <TaskStatusBadge status={task.status} />
      </Button>
      {open && (
        <div className="absolute top-full left-0 mt-1 z-20 bg-card rounded-lg shadow-xl py-1 min-w-[140px] animate-fade-in">
          {STATUS_OPTS.map((o) => (
            <Button
              key={o.value}
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); handleChange(o.value as Task["status"]); }}
              className={cn(
                "w-full justify-start px-3 py-1.5 h-auto rounded-none text-xs font-normal",
                o.value === task.status
                  ? "text-[--color-ember]"
                  : "text-[--color-text-secondary]"
              )}
            >
              {o.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

function ProjectCell({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  return (
    <span className="text-xs text-[--color-text-secondary] truncate block max-w-[140px]">
      {project?.name ?? "—"}
    </span>
  );
}

function AssigneeCell({ assigneeId }: { assigneeId: string | null }) {
  const { data: user } = useUser(assigneeId);
  if (!assigneeId)
    return <span className="text-xs text-[--color-text-muted]">Unassigned</span>;
  return <UserAvatar user={user} size="xs" showName />;
}

// ── Column definitions ────────────────────────────────────────────────────

function buildTaskColumns(
  onEdit: (t: Task) => void,
  onDelete: (t: Task) => void
): ColumnDef<Task>[] {
  return [
    {
      id: "title",
      accessorKey: "title",
      size: 280,
      header: ({ column }) => <SortHeader column={column} label="Task" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[--color-text-primary] truncate">
            {row.original.title}
          </p>
          {row.original.tags.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {row.original.tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="text-[9px] px-1 py-0.5 rounded bg-[--color-surface-3] text-[--color-text-muted]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      size: 140,
      header: ({ column }) => <SortHeader column={column} label="Status" />,
      cell: ({ row }) => <InlineStatusCell task={row.original} />,
    },
    {
      id: "priority",
      accessorKey: "priority",
      size: 100,
      header: ({ column }) => <SortHeader column={column} label="Priority" />,
      cell: ({ getValue }) => (
        <PriorityBadge priority={getValue() as Task["priority"]} />
      ),
    },
    {
      id: "projectId",
      accessorKey: "projectId",
      size: 160,
      header: () => (
        <span className="text-xs text-[--color-text-muted]">Project</span>
      ),
      cell: ({ getValue }) => (
        <ProjectCell projectId={getValue() as string} />
      ),
    },
    {
      id: "assigneeId",
      accessorKey: "assigneeId",
      size: 140,
      header: () => (
        <span className="text-xs text-[--color-text-muted]">Assignee</span>
      ),
      cell: ({ getValue }) => (
        <AssigneeCell assigneeId={getValue() as string | null} />
      ),
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Due" />,
      cell: ({ getValue }) => {
        const v = getValue() as string | null;
        const isOverdue = v && new Date(v) < new Date();
        return (
          <span className={cn("text-xs", isOverdue ? "text-red-400" : "text-[--color-text-secondary]")}>
            {v ? formatDate(v) : "—"}
          </span>
        );
      },
    },
    {
      id: "updatedAt",
      accessorKey: "updatedAt",
      size: 100,
      header: ({ column }) => <SortHeader column={column} label="Updated" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-[--color-text-muted]">
          {formatRelative(getValue() as string)}
        </span>
      ),
    },
    {
      id: "__actions__",
      size: 56,
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onEdit(row.original); }}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={(e) => { e.stopPropagation(); onDelete(row.original); }}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      ),
    },
  ];
}

// ── Task form sheet ───────────────────────────────────────────────────────

function TaskFormSheet({
  crud,
}: {
  crud: ReturnType<typeof useTasksCrud>;
}) {
  const { items: projects } = useProjectsList();
  const { items: users } = useUsersList();

  const isCreate   = crud.mode === "create";
  const buf        = isCreate ? crud.createBuffer : crud.editBuffer;
  const setField   = isCreate ? crud.setCreateField : crud.setField;
  const handleSave  = isCreate ? crud.create         : crud.save;
  const handleClose = isCreate ? crud.cancelCreate    : crud.cancelEdit;
  const isPending   = isCreate ? crud.isCreating      : crud.isSaving;
  const error       = isCreate ? crud.createError     : crud.saveError;

  type K = keyof Task;

  const projectOpts = projects.map((p) => ({ value: p.id, label: p.name }));
  const userOpts    = users.map((u) => ({ value: u.id, label: u.name }));

  return (
    <Sheet
      open={crud.mode === "create" || crud.mode === "edit"}
      onClose={handleClose}
      title={isCreate ? "New Task" : "Edit Task"}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={handleClose} className="flex-1">
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isPending || (!isCreate && !crud.dirty.isDirty)}
            className="flex-1"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isCreate ? "Create Task" : "Save Changes"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="px-3 py-2 rounded-md bg-red-950/40 border border-red-800/40 text-xs text-red-400">
            {error}
          </div>
        )}

        <Field label="Title" required dirty={crud.dirty.changed.has("title" as K)}>
          <Input
            value={String(buf.title ?? "")}
            onChange={(e) => setField("title" as K, e.target.value as Task[K])}
            placeholder="Task title"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={String(buf.description ?? "")}
            onChange={(e) => setField("description" as K, e.target.value as Task[K])}
            placeholder="What needs to be done?"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select
              value={String(buf.status ?? "backlog")}
              onChange={(e) => setField("status" as K, e.target.value as Task[K])}
              options={STATUS_OPTS}
            />
          </Field>
          <Field label="Priority">
            <Select
              value={String(buf.priority ?? "medium")}
              onChange={(e) => setField("priority" as K, e.target.value as Task[K])}
              options={PRIORITY_OPTS}
            />
          </Field>
        </div>

        <Field label="Project" required dirty={crud.dirty.changed.has("projectId" as K)}>
          <Select
            value={String(buf.projectId ?? "")}
            onChange={(e) => setField("projectId" as K, e.target.value as Task[K])}
            options={projectOpts}
            placeholder="Select project…"
          />
        </Field>

        <Field label="Assignee">
          <Select
            value={String(buf.assigneeId ?? "")}
            onChange={(e) =>
              setField("assigneeId" as K, (e.target.value || null) as Task[K])
            }
            options={userOpts}
            placeholder="Unassigned"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Est. Hours">
            <Input
              type="number"
              min={0}
              value={String(buf.estimatedHours ?? "")}
              onChange={(e) =>
                setField(
                  "estimatedHours" as K,
                  (e.target.value ? Number(e.target.value) : null) as Task[K]
                )
              }
              placeholder="—"
            />
          </Field>
          <Field label="Story Points">
            <Input
              type="number"
              min={0}
              value={String(buf.storyPoints ?? "")}
              onChange={(e) =>
                setField(
                  "storyPoints" as K,
                  (e.target.value ? Number(e.target.value) : null) as Task[K]
                )
              }
              placeholder="—"
            />
          </Field>
        </div>

        <Field label="Due Date">
          <Input
            type="date"
            value={String(buf.dueDate ?? "")}
            onChange={(e) =>
              setField("dueDate" as K, (e.target.value || null) as Task[K])
            }
          />
        </Field>

        <Field label="Tags" hint="Comma-separated, e.g. rust, api, bugfix">
          <Input
            value={Array.isArray(buf.tags) ? (buf.tags as string[]).join(", ") : ""}
            onChange={(e) =>
              setField(
                "tags" as K,
                e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as Task[K]
              )
            }
            placeholder="rust, api, bugfix"
          />
        </Field>
      </div>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function TasksPage() {
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);

  const crud = useTasksCrud();

  const columns = buildTaskColumns(
    (t) => crud.startEdit(t.id),
    (t) => setDeleteTarget(t)
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Tasks"
        subtitle={`${crud.list.viewTotal ?? "…"} tasks`}
      >
        <Button size="sm" onClick={crud.startCreate}>
          <Plus className="w-3.5 h-3.5" />
          New Task
        </Button>
      </PageHeader>

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

      <TaskFormSheet crud={crud} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await crud.deleteEntity(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title={`Delete "${deleteTarget?.title}"?`}
        message="This task will be permanently deleted."
        loading={crud.isDeleting}
      />
    </div>
  );
}
