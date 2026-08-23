/**
 * Upgrade fixture: v2-to-v3 — React table and presentation types.
 *
 * Proves the "after" state of the migration documented in
 * site/docs/migration/v2-to-v3.mdx ("React presentation types"): column
 * builders, action items, and empty-state configuration are imported from the
 * React package. The headless table engine stays in core; the React-only
 * presentation surface ships from `@prometheus-ags/prometheus-entity-management`.
 */
import {
  actionsColumn,
  booleanColumn,
  dateColumn,
  EmptyState,
  type ActionItem,
  type EmptyStateConfig,
} from "@prometheus-ags/prometheus-entity-management";

interface Project {
  id: string;
  name: string;
  active: boolean;
  updatedAt: string;
}

const archiveAction: ActionItem<Project> = {
  label: "Archive",
  destructive: true,
  onClick: (row) => {
    void row.id;
  },
};

export const columns = [
  booleanColumn<Project>({ field: "active", header: "Active" }),
  dateColumn<Project>({ field: "updatedAt", header: "Updated" }),
  actionsColumn<Project>([archiveAction]),
];

const emptyConfig: EmptyStateConfig = {
  title: "No projects",
  description: "Create a project to see it listed here.",
};

export function ProjectEmptyState() {
  return <EmptyState config={emptyConfig} />;
}
