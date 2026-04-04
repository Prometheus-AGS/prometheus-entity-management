import React, { useState } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/shared/ui";
import { EntityTable, SortHeader } from "@/components/shared/entity-table";
import { Sheet, ConfirmDialog, Field, Input, Select } from "@/components/shared/sheet";
import { Button } from "@/components/ui/button";
import { useUsersCrud } from "@/features/users/user-hooks";
import { formatDate, cn } from "@/lib/utils";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import type { User } from "@/types";

// ── Options ────────────────────────────────────────────────────────────────

const ROLE_OPTS = [
  { value: "admin",     label: "Admin"     },
  { value: "lead",      label: "Lead"      },
  { value: "developer", label: "Developer" },
  { value: "designer",  label: "Designer"  },
  { value: "analyst",   label: "Analyst"   },
];

const STATUS_OPTS = [
  { value: "active",  label: "Active"  },
  { value: "away",    label: "Away"    },
  { value: "offline", label: "Offline" },
];

const DEPT_OPTS = [
  { value: "Engineering",  label: "Engineering"  },
  { value: "Design",       label: "Design"       },
  { value: "Product",      label: "Product"      },
  { value: "Operations",   label: "Operations"   },
];

// ── Cell sub-components ───────────────────────────────────────────────────

function RoleBadge({ role }: { role: User["role"] }) {
  const variantMap: Record<User["role"], string> = {
    admin:     "bg-orange-500/15 text-orange-500 dark:text-orange-400",
    lead:      "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    developer: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
    designer:  "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    analyst:   "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400",
  };
  return (
    <span className={cn(
      "inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium capitalize",
      variantMap[role]
    )}>
      {role}
    </span>
  );
}

function StatusDot({ status }: { status: User["status"] }) {
  const dotClass = status === "active" ? "bg-emerald-400" : status === "away" ? "bg-amber-400" : "bg-zinc-600";
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2 h-2 rounded-full shrink-0", dotClass)} />
      <span className="text-xs capitalize text-[--color-text-secondary]">{status}</span>
    </div>
  );
}

function MemberCell({ user }: { user: User }) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
        style={{ background: user.avatarColor }}
      >
        {user.avatarInitials}
      </span>
      <div>
        <p className="text-sm font-medium text-[--color-text-primary]">{user.name}</p>
        <p className="text-xs text-[--color-text-muted]">{user.email}</p>
      </div>
    </div>
  );
}

// ── Column definitions ─────────────────────────────────────────────────────

function buildColumns(
  onEdit: (u: User) => void,
  onDelete: (u: User) => void
): ColumnDef<User>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      size: 220,
      header: ({ column }) => <SortHeader column={column} label="Member" />,
      cell: ({ row }) => <MemberCell user={row.original} />,
    },
    {
      id: "role",
      accessorKey: "role",
      size: 110,
      header: ({ column }) => <SortHeader column={column} label="Role" />,
      cell: ({ getValue }) => <RoleBadge role={getValue() as User["role"]} />,
    },
    {
      id: "department",
      accessorKey: "department",
      size: 130,
      header: ({ column }) => <SortHeader column={column} label="Department" />,
      cell: ({ getValue }) => (
        <span className="text-sm text-[--color-text-secondary]">{getValue() as string}</span>
      ),
    },
    {
      id: "status",
      accessorKey: "status",
      size: 100,
      header: ({ column }) => <SortHeader column={column} label="Status" />,
      cell: ({ getValue }) => <StatusDot status={getValue() as User["status"]} />,
    },
    {
      id: "joinedAt",
      accessorKey: "joinedAt",
      size: 120,
      header: ({ column }) => <SortHeader column={column} label="Joined" />,
      cell: ({ getValue }) => (
        <span className="text-xs text-[--color-text-muted]">
          {formatDate(getValue() as string)}
        </span>
      ),
    },
    {
      id: "__actions__",
      size: 56,
      enableSorting: false,
      header: () => null,
      cell: ({ row }) => (
        <div className="flex gap-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity">
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

// ── Form sheet ─────────────────────────────────────────────────────────────

function UserFormSheet({
  crud,
}: {
  crud: ReturnType<typeof useUsersCrud>;
}) {
  const isCreate   = crud.mode === "create";
  const buf        = isCreate ? crud.createBuffer : crud.editBuffer;
  const setField   = isCreate ? crud.setCreateField : crud.setField;
  const handleSave  = isCreate ? crud.create         : crud.save;
  const handleClose = isCreate ? crud.cancelCreate    : crud.cancelEdit;
  const isPending   = isCreate ? crud.isCreating      : crud.isSaving;
  const error       = isCreate ? crud.createError     : crud.saveError;

  type K = keyof User;

  return (
    <Sheet
      open={crud.mode === "create" || crud.mode === "edit"}
      onClose={handleClose}
      title={isCreate ? "Add Member" : "Edit Member"}
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
            {isCreate ? "Add Member" : "Save"}
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

        <Field
          label="Full Name"
          required
          dirty={crud.dirty.changed.has("name" as K)}
        >
          <Input
            value={String(buf.name ?? "")}
            onChange={(e) => setField("name" as K, e.target.value as User[K])}
            placeholder="Full name"
          />
        </Field>

        <Field
          label="Email"
          required
          dirty={crud.dirty.changed.has("email" as K)}
        >
          <Input
            type="email"
            value={String(buf.email ?? "")}
            onChange={(e) => setField("email" as K, e.target.value as User[K])}
            placeholder="email@prometheus.dev"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <Select
              value={String(buf.role ?? "developer")}
              onChange={(e) => setField("role" as K, e.target.value as User[K])}
              options={ROLE_OPTS}
            />
          </Field>
          <Field label="Department">
            <Select
              value={String(buf.department ?? "Engineering")}
              onChange={(e) => setField("department" as K, e.target.value as User[K])}
              options={DEPT_OPTS}
            />
          </Field>
        </div>

        <Field label="Status">
          <Select
            value={String(buf.status ?? "active")}
            onChange={(e) => setField("status" as K, e.target.value as User[K])}
            options={STATUS_OPTS}
          />
        </Field>
      </div>
    </Sheet>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export function TeamPage() {
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  const crud = useUsersCrud();

  const columns = buildColumns(
    (u) => crud.startEdit(u.id),
    (u) => setDeleteTarget(u)
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Team"
        subtitle={`${crud.list.viewTotal ?? "…"} members`}
      >
        <Button size="sm" onClick={crud.startCreate}>
          <Plus className="w-3.5 h-3.5" />
          Add Member
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-hidden">
        <EntityTable
          viewResult={crud.list}
          columns={columns}
          onRowClick={(u) => crud.startEdit(u.id)}
          searchPlaceholder="Search members…"
          paginationMode="none"
        />
      </div>

      <UserFormSheet crud={crud} />

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await crud.deleteEntity(deleteTarget.id);
            setDeleteTarget(null);
          }
        }}
        title={`Remove ${deleteTarget?.name}?`}
        message="This member will be permanently removed from the system."
        loading={crud.isDeleting}
      />
    </div>
  );
}
