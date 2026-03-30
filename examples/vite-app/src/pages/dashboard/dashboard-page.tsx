import { PageHeader, StatCard } from "@/components/shared/ui";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ProjectStatusBadge,
  TaskStatusBadge,
  PriorityBadge,
  UserAvatar,
  ProgressBar,
} from "@/components/shared/entity-badges";
import { useProjectsList } from "@/features/projects/project-hooks";
import { useTasksList } from "@/features/tasks/task-hooks";
import { useUsersList } from "@/features/users/user-hooks";
import { formatRelative, formatCurrency } from "@/lib/utils";
import { FolderKanban, CheckSquare, Users, TrendingUp } from "lucide-react";

export function DashboardPage() {
  const { items: projects, isLoading: pLoading } = useProjectsList();
  const { items: tasks } = useTasksList();
  const { items: users } = useUsersList();

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const openTasks     = tasks.filter((t) => !["done", "cancelled"].includes(t.status)).length;
  const inProgress    = tasks.filter((t) => t.status === "in-progress").length;
  const totalBudget   = projects.reduce((s, p) => s + p.budget, 0);
  const totalSpent    = projects.reduce((s, p) => s + p.spent, 0);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Dashboard"
        subtitle="Prometheus AGS — project and task overview"
      />

      <div className="flex-1 overflow-auto p-6 flex flex-col gap-6">
        <div className="grid grid-cols-4 gap-4">
          <StatCard
            label="Active Projects"
            value={activeProjects}
            delta={`${projects.length} total`}
            icon={<FolderKanban className="w-4 h-4" />}
          />
          <StatCard
            label="Open Tasks"
            value={openTasks}
            delta={`${inProgress} in progress`}
            deltaDir="up"
            icon={<CheckSquare className="w-4 h-4" />}
          />
          <StatCard
            label="Team Members"
            value={users.length}
            delta="All departments"
            icon={<Users className="w-4 h-4" />}
          />
          <StatCard
            label="Total Budget"
            value={formatCurrency(totalBudget)}
            delta={`${formatCurrency(totalSpent)} spent`}
            icon={<TrendingUp className="w-4 h-4" />}
          />
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-5 gap-4 flex-1 min-h-0">
          <Card className="col-span-3 flex flex-col min-h-0">
            <CardHeader className="flex items-center justify-between gap-3">
              <CardTitle className="text-sm font-semibold">Projects</CardTitle>
              <span className="text-xs text-muted-foreground">{activeProjects} active</span>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto flex flex-col gap-2 pt-1">
              {pLoading
                ? Array.from({ length: 4 }, (_, i) => `skeleton-project-${i}`).map((id) => (
                    <div key={id} className="rounded-xl bg-muted/75 px-4 py-3">
                      <div className="h-3 w-3/4 rounded bg-muted-foreground/15 animate-pulse mb-2" />
                      <div className="h-2 w-full rounded bg-muted-foreground/15 animate-pulse" />
                    </div>
                  ))
                : projects
                    .filter((p) => p.status !== "archived")
                    .map((p) => {
                      const owner = users.find((u) => u.id === p.ownerId);
                      return (
                        <div key={p.id} className="rounded-xl bg-muted/50 px-4 py-3 transition-colors hover:bg-muted/80">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {p.name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate mt-0.5">
                                {p.description}
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <PriorityBadge priority={p.priority} />
                              <ProjectStatusBadge status={p.status} />
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <ProgressBar value={p.progress} className="flex-1" />
                            <span className="text-xs text-muted-foreground tabular-nums w-8 text-right">
                              {p.progress}%
                            </span>
                            <UserAvatar user={owner} size="xs" />
                          </div>
                        </div>
                      );
                    })}
            </CardContent>
          </Card>

          <Card className="col-span-2 flex flex-col min-h-0">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">Recent Tasks</CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto flex flex-col gap-2 pt-1">
              {tasks.slice(0, 12).map((t) => {
                const assignee = users.find((u) => u.id === t.assigneeId);
                return (
                  <div key={t.id} className="rounded-xl bg-muted/45 px-4 py-2.5 transition-colors hover:bg-muted/75">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-xs font-medium text-foreground truncate">
                        {t.title}
                      </p>
                      <TaskStatusBadge status={t.status} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelative(t.updatedAt)}
                      </span>
                      {assignee ? (
                        <UserAvatar user={assignee} size="xs" />
                      ) : (
                        <span className="text-[10px] text-muted-foreground">Unassigned</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
