import React, { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/ui";
import {
  ProjectStatusBadge,
  PriorityBadge,
  UserAvatar,
  ProgressBar,
} from "@/components/shared/entity-badges";
import { EntityTable, SortHeader } from "@/components/shared/entity-table";
import { Sheet, ConfirmDialog, Field, Input, Textarea, Select } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  useProject,
  useProjectTasks,
  useProjectsCrud,
} from "@/features/projects/project-hooks";
import { useUser, useUsersList } from "@/features/users/user-hooks";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Pencil, Trash2, Eye } from "lucide-react";
import type { Project, User } from "@/types";

// ── Relation cell components (proper React components so hooks work) ──────

function OwnerCell({ ownerId }: { ownerId: string }) {
  const { data: owner } = useUser(ownerId);
  return <UserAvatar user={owner} size="xs" showName />;
}

// ── Column definitions ────────────────────────────────────────────────────

function buildColumns(
  onEdit: (p: Project) => void,
  onDelete: (p: Project) => void,
  onView: (p: Project) => void
): ColumnDef<Project>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      size: 260,
      header: ({ column }) => <SortHeader column={column} label="Project" />,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-[--color-text-primary] truncate">
            {row.original.name}
          </p>
          <p className="text-[10px] text-[--color-text-muted] truncate max-w-[230px]">
            {row.original.description}
          </p>
        </div>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Status" />,
      cell: ({ getValue }) => (
        <ProjectStatusBadge status={getValue() as Project["status"]} />
      ),
    },
    {
      id: "priority",
      accessorKey: "priority",
      size: 100,
      header: ({ column }) => <SortHeader column={column} label="Priority" />,
      cell: ({ getValue }) => (
        <PriorityBadge priority={getValue() as Project["priority"]} />
      ),
    },
    {
      id: "progress",
      accessorKey: "progress",
      size: 130,
      header: ({ column }) => <SortHeader column={column} label="Progress" />,
      cell: ({ getValue }) => (
        <div className="flex items-center gap-2">
          <ProgressBar value={getValue() as number} className="flex-1" />
          <span className="text-xs text-[--color-text-muted] tabular-nums">
            {getValue() as number}%
          </span>
        </div>
      ),
    },
    {
      id: "budget",
      accessorKey: "budget",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Budget" />,
      cell: ({ row }) => (
        <div>
          <p className="text-xs text-[--color-text-primary]">
            {formatCurrency(row.original.budget)}
          </p>
          <p className="text-[10px] text-[--color-text-muted]">
            {formatCurrency(row.original.spent)} spent
          </p>
        </div>
      ),
    },
    {
      id: "ownerId",
      accessorKey: "ownerId",
      size: 150,
      header: () => (
        <span className="text-xs text-[--color-text-muted]">Owner</span>
      ),
      cell: ({ getValue }) => (
        <OwnerCell ownerId={getValue() as string} />
      ),
    },
    {
      id: "dueDate",
      accessorKey: "dueDate",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Due" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-[--color-text-secondary]">
          {getValue() ? formatDate(getValue() as string) : "—"}
        </span>
      ),
    },
    {
      id: "__actions__",
      size: 72,
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex items-center gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); onView(row.original); }}
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>
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

// ── Status / Priority options ─────────────────────────────────────────────

const STATUS_OPTS = [
  { value: "planning",  label: "Planning"  },
  { value: "active",    label: "Active"    },
  { value: "on-hold",   label: "On Hold"   },
  { value: "completed", label: "Completed" },
  { value: "archived",  label: "Archived"  },
];
const PRIORITY_OPTS = [
  { value: "low",      label: "Low"      },
  { value: "medium",   label: "Medium"   },
  { value: "high",     label: "High"     },
  { value: "critical", label: "Critical" },
];

// ── Detail sheet ──────────────────────────────────────────────────────────

function ProjectDetailSheet({
  projectId,
  onClose,
  onEdit,
}: {
  projectId: string | null;
  onClose: () => void;
  onEdit: () => void;
}) {
  const { data: project } = useProject(projectId);
  const { data: owner } = useUser(project?.ownerId);
  const { items: tasks } = useProjectTasks(projectId);

  if (!project) return null;

  return (
    <Sheet
      open={!!projectId}
      onClose={onClose}
      title={project.name}
      subtitle={`${project.status} · ${project.progress}% complete`}
      footer={
        <>
          <Button size="sm" variant="ghost" onClick={onClose} className="flex-1">
            Close
          </Button>
          <Button size="sm" onClick={onEdit} className="flex-1">
            <Pencil className="w-3.5 h-3.5" />Edit
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-[--color-text-secondary]">{project.description}</p>

        <div className="grid grid-cols-2 gap-3">
          {([
            ["Status",   <ProjectStatusBadge key="s" status={project.status} />],
            ["Priority", <PriorityBadge key="p" priority={project.priority} />],
            ["Budget",   formatCurrency(project.budget)],
            ["Spent",    formatCurrency(project.spent)],
            ["Start",    project.startDate ? formatDate(project.startDate) : "—"],
            ["Due",      project.dueDate   ? formatDate(project.dueDate)   : "—"],
          ] as [string, React.ReactNode][]).map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wide mb-1">
                {label}
              </p>
              <div className="text-sm text-[--color-text-primary]">{value}</div>
            </div>
          ))}
        </div>

        <div>
          <p className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wide mb-1.5">
            Progress
          </p>
          <ProgressBar value={project.progress} />
          <p className="text-xs text-[--color-text-muted] mt-1">{project.progress}% complete</p>
        </div>

        <div>
          <p className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wide mb-1.5">
            Owner
          </p>
          <UserAvatar user={owner} showName />
        </div>

        <div>
          <p className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wide mb-1.5">
            Tasks ({tasks.length})
          </p>
          <div className="flex flex-col gap-1">
            {tasks.slice(0, 5).map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-md bg-[--color-surface-2]"
              >
                <span className="text-xs text-[--color-text-primary] truncate">{t.title}</span>
                <span className={`text-[10px] ml-2 shrink-0 ${t.status === "done" ? "text-emerald-400" : "text-[--color-text-muted]"}`}>
                  {t.status}
                </span>
              </div>
            ))}
            {tasks.length > 5 && (
              <p className="text-[10px] text-[--color-text-muted]">+ {tasks.length - 5} more</p>
            )}
          </div>
        </div>

        <div>
          <p className="text-[10px] font-medium text-[--color-text-muted] uppercase tracking-wide mb-1.5">
            Tags
          </p>
          <div className="flex flex-wrap gap-1">
            {project.tags.map((t) => (
              <span
                key={t}
                className="text-[10px] px-1.5 py-0.5 rounded bg-[--color-surface-3] text-[--color-text-muted]"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Sheet>
  );
}

// ── Form sheet ────────────────────────────────────────────────────────────

function ProjectFormSheet({
  crud,
}: {
  crud: ReturnType<typeof useProjectsCrud>;
}) {
  const { items: users } = useUsersList();

  const isCreate = crud.mode === "create";
  const buf      = isCreate ? crud.createBuffer : crud.editBuffer;
  const setField = isCreate ? crud.setCreateField : crud.setField;
  const handleSave  = isCreate ? crud.create    : crud.save;
  const handleClose = isCreate ? crud.cancelCreate : crud.cancelEdit;
  const isPending   = isCreate ? crud.isCreating   : crud.isSaving;
  const error       = isCreate ? crud.createError  : crud.saveError;
  const userOpts    = users.map((u) => ({ value: u.id, label: u.name }));

  type K = keyof Project;

  return (
    <Sheet
      open={crud.mode === "create" || crud.mode === "edit"}
      onClose={handleClose}
      title={isCreate ? "New Project" : "Edit Project"}
      subtitle={
        !isCreate && crud.dirty.isDirty
          ? `${crud.dirty.changed.size} field${crud.dirty.changed.size > 1 ? "s" : ""} modified`
          : undefined
      }
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
            {isCreate ? "Create Project" : "Save Changes"}
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

        <Field label="Name" required dirty={crud.dirty.changed.has("name" as K)}>
          <Input
            value={String(buf.name ?? "")}
            onChange={(e) => setField("name" as K, e.target.value as Project[K])}
            placeholder="Project name"
          />
        </Field>

        <Field label="Description">
          <Textarea
            value={String(buf.description ?? "")}
            onChange={(e) => setField("description" as K, e.target.value as Project[K])}
            placeholder="Brief description…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Status">
            <Select
              value={String(buf.status ?? "planning")}
              onChange={(e) => setField("status" as K, e.target.value as Project[K])}
              options={STATUS_OPTS}
            />
          </Field>
          <Field label="Priority">
            <Select
              value={String(buf.priority ?? "medium")}
              onChange={(e) => setField("priority" as K, e.target.value as Project[K])}
              options={PRIORITY_OPTS}
            />
          </Field>
        </div>

        <Field label="Owner">
          <Select
            value={String(buf.ownerId ?? "")}
            onChange={(e) => setField("ownerId" as K, e.target.value as Project[K])}
            options={userOpts}
            placeholder="Select owner…"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Budget ($)">
            <Input
              type="number"
              value={String(buf.budget ?? "")}
              onChange={(e) => setField("budget" as K, Number(e.target.value) as Project[K])}
              placeholder="0"
            />
          </Field>
          <Field label="Progress (%)">
            <Input
              type="number"
              min={0}
              max={100}
              value={String(buf.progress ?? 0)}
              onChange={(e) => setField("progress" as K, Number(e.target.value) as Project[K])}
            />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start Date">
            <Input
              type="date"
              value={String(buf.startDate ?? "")}
              onChange={(e) => setField("startDate" as K, e.target.value as Project[K])}
            />
          </Field>
          <Field label="Due Date">
            <Input
              type="date"
              value={String(buf.dueDate ?? "")}
              onChange={(e) => setField("dueDate" as K, e.target.value as Project[K])}
            />
          </Field>
        </div>

        <Field label="Tags" hint="Comma-separated, e.g. rust, ai, infra">
          <Input
            value={Array.isArray(buf.tags) ? (buf.tags as string[]).join(", ") : ""}
            onChange={(e) =>
              setField("tags" as K, e.target.value.split(",").map((s) => s.trim()).filter(Boolean) as Project[K])
            }
            placeholder="rust, ai, infra"
          />
        </Field>
      </div>
    </Sheet>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────

export function ProjectsPage() {
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const crud = useProjectsCrud();

  const columns = buildColumns(
    (p) => crud.startEdit(p.id),
    (p) => setDeleteTarget(p),
    (p) => crud.openDetail(p.id),
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Projects"
        subtitle={`${crud.list.viewTotal ?? "…"} projects`}
      >
        <Button size="sm" onClick={crud.startCreate}>
          <Plus className="w-3.5 h-3.5" />
          New Project
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-hidden">
        <EntityTable
          viewResult={crud.list}
          columns={columns}
          selectedId={crud.selectedId}
          onRowClick={(p) => crud.openDetail(p.id)}
          searchPlaceholder="Search projects…"
          paginationMode="loadMore"
        />
      </div>

      {/* Detail panel */}
      <ProjectDetailSheet
        projectId={crud.mode === "detail" ? crud.selectedId : null}
        onClose={() => crud.select(null)}
        onEdit={() => crud.startEdit()}
      />

      {/* Create / edit form */}
      <ProjectFormSheet crud={crud} />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await crud.deleteEntity(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title={`Delete "${deleteTarget?.name}"?`}
        message="This will permanently delete the project and all its associated tasks. This action cannot be undone."
        loading={crud.isDeleting}
      />
    </div>
  );
}
