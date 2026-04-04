/**
 * Pure Entity List View demo — showcases the TanStack-free multi-view
 * entity list system with all three view modes, presets, actions,
 * multi-select, inline editing, and configurable empty states.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  EntityListView,
  pureTextColumn,
  pureNumberColumn,
  pureDateColumn,
  pureEnumColumn,
  pureBooleanColumn,
  viewAction,
  editAction,
  deleteAction,
  TableStorageProvider,
  ZustandPersistAdapter,
} from "@prometheus-ags/prometheus-entity-management";
import type {
  PureColumnDef,
  ItemDescriptor,
  BatchActionDef,
  EmptyStateConfig,
} from "@prometheus-ags/prometheus-entity-management";
import { Users, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/shared/ui";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------
interface DemoUser {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  salary: number;
  active: boolean;
  joinedAt: string;
  avatar: string;
  [key: string]: unknown;
}

function generateUsers(count: number): DemoUser[] {
  const names = [
    "Alice Chen", "Bob Kim", "Carlos Rivera", "Diana Patel",
    "Eve Nakamura", "Frank O'Brien", "Grace Liu", "Henry Wilson",
    "Iris Santos", "Jack Thompson", "Karen Wu", "Leo Morales",
    "Maya Johnson", "Noah Lee", "Olivia Park", "Paul Singh",
  ];
  const roles = ["admin", "lead", "developer", "designer", "analyst"];
  const departments = ["Engineering", "Design", "Product", "Operations"];

  return Array.from({ length: count }, (_, i) => ({
    id: `user_${i + 1}`,
    name: names[i % names.length],
    email: `${names[i % names.length].toLowerCase().replace(/[^a-z]/g, ".")}@company.com`,
    role: roles[i % roles.length],
    department: departments[i % departments.length],
    salary: 60000 + Math.floor(Math.random() * 80000),
    active: Math.random() > 0.2,
    joinedAt: new Date(2020 + Math.floor(i / 4), i % 12, 1 + (i % 28)).toISOString(),
    avatar: `https://api.dicebear.com/7.x/initials/svg?seed=${names[i % names.length]}`,
  }));
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------
const ROLE_OPTIONS = [
  { value: "admin",     label: "Admin",     badgeClassName: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  { value: "lead",      label: "Lead",      badgeClassName: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  { value: "developer", label: "Developer", badgeClassName: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  { value: "designer",  label: "Designer",  badgeClassName: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  { value: "analyst",   label: "Analyst",   badgeClassName: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400" },
];

const columns: PureColumnDef<DemoUser>[] = [
  pureTextColumn({ field: "name", header: "Name", editable: true }),
  pureTextColumn({ field: "email", header: "Email" }),
  pureEnumColumn({ field: "role", header: "Role", options: ROLE_OPTIONS, editable: true }),
  pureTextColumn({ field: "department", header: "Department", editable: true }),
  pureNumberColumn({ field: "salary", header: "Salary", editable: true }),
  pureBooleanColumn({ field: "active", header: "Active", editable: true }),
  pureDateColumn({ field: "joinedAt", header: "Joined" }),
];

// ---------------------------------------------------------------------------
// Item descriptor for gallery/list views
// ---------------------------------------------------------------------------
const itemDescriptor: ItemDescriptor<DemoUser> = {
  title: "name",
  subtitle: "email",
  avatar: "avatar",
  badges: [
    {
      field: "role",
      options: ROLE_OPTIONS.map((r) => ({
        value: r.value,
        label: r.label,
        className: r.badgeClassName,
      })),
    },
  ],
  metadata: [
    { field: "department", label: "Dept" },
    {
      field: "salary",
      label: "Salary",
      format: (v) => `$${Number(v).toLocaleString()}`,
    },
  ],
};

// ---------------------------------------------------------------------------
// Batch actions
// ---------------------------------------------------------------------------
const batchActions: BatchActionDef[] = [
  { id: "deactivate", label: "Deactivate" },
  { id: "delete", label: "Delete selected", destructive: true },
];

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------
const emptyConfig: EmptyStateConfig = {
  icon: Users,
  title: "No team members",
  description: "Create your first team member to get started.",
  action: { label: "Add member", onClick: () => alert("Open create dialog") },
  filteredTitle: "No members match your filters",
  filteredDescription: "Try adjusting your search or filter criteria.",
  filteredAction: { label: "Clear filters", onClick: () => {} },
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
const adapter = new ZustandPersistAdapter({ storageKey: "pure-demo-presets" });

export function PureDemoPage() {
  const [data, setData] = useState(() => generateUsers(32));
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }, []);

  const actions = useMemo(
    () => [
      viewAction<DemoUser>({
        onClick: (user) => showToast(`Viewing ${user.name}`),
      }),
      editAction<DemoUser>({
        onClick: (user) => showToast(`Editing ${user.name}`),
      }),
      deleteAction<DemoUser>({
        onClick: (user) => {
          setData((prev) => prev.filter((u) => u.id !== user.id));
          showToast(`Deleted ${user.name}`);
        },
        confirm: "Delete this team member?",
      }),
    ],
    [showToast],
  );

  const handleBatchAction = useCallback(
    (action: string, items: DemoUser[]) => {
      if (action === "delete") {
        const ids = new Set(items.map((i) => i.id));
        setData((prev) => prev.filter((u) => !ids.has(u.id)));
        showToast(`Deleted ${items.length} member(s)`);
      } else if (action === "deactivate") {
        const ids = new Set(items.map((i) => i.id));
        setData((prev) =>
          prev.map((u) => (ids.has(u.id) ? { ...u, active: false } : u)),
        );
        showToast(`Deactivated ${items.length} member(s)`);
      }
    },
    [showToast],
  );

  const handleInlineSave = useCallback(
    (item: DemoUser, changes: Partial<DemoUser>) => {
      setData((prev) =>
        prev.map((u) => (u.id === item.id ? { ...u, ...changes } : u)),
      );
      showToast(`Updated ${item.name}`);
    },
    [showToast],
  );

  const handleInlineEdit = useCallback(
    (item: DemoUser, field: string, value: unknown) => {
      setData((prev) =>
        prev.map((u) =>
          u.id === item.id ? { ...u, [field]: value } : u,
        ),
      );
      showToast(`Updated ${field} for ${item.name}`);
    },
    [showToast],
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Pure Entity List View"
        subtitle={`${data.length} members · TanStack-free multi-view demo`}
      >
        <Button size="sm" onClick={() => showToast("Add member clicked")}>
          <UserPlus className="w-3.5 h-3.5" />
          Add Member
        </Button>
      </PageHeader>

      <div className="flex-1 overflow-auto p-6">
        <TableStorageProvider adapter={adapter} realtimeMode="auto-apply">
          <EntityListView
            data={data}
            columns={columns}
            itemDescriptor={itemDescriptor}
            actions={actions}
            enableMultiSelect
            batchActions={batchActions}
            onBatchAction={handleBatchAction}
            enableInlineEdit
            onInlineEdit={handleInlineEdit}
            onInlineSave={handleInlineSave}
            enabledViewModes={["table", "gallery", "list"]}
            defaultViewMode="table"
            emptyState={emptyConfig}
            getRowId={(row) => row.id}
            tableId="pure-demo-users"
            enablePresets
            paginationMode="pages"
            pageSize={10}
            galleryColumns={{ sm: 1, md: 2, lg: 3, xl: 4 }}
          />
        </TableStorageProvider>
      </div>

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 rounded-xl bg-foreground/[0.07] px-4 py-2.5 text-sm font-medium">
          {toast}
        </div>
      )}
    </div>
  );
}
