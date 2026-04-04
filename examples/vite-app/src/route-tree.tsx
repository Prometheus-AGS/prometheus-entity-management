import {
  createRootRoute,
  createRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { AppShell } from "./components/layout/app-shell";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { DashboardPage } from "./pages/dashboard/dashboard-page";
import { ProjectsPage } from "./pages/projects/projects-page";
import { TasksPage } from "./pages/tasks/tasks-page";
import { TeamPage } from "./pages/team/team-page";
import { RealtimePage } from "./pages/realtime/realtime-page";
import { SettingsPage } from "./pages/settings/settings-page";
import { UIDemoPage } from "./pages/ui-demo/ui-demo-page";
import { PureDemoPage } from "./pages/pure-demo/pure-demo-page";
import { TanStackBridgePage } from "./pages/tanstack-bridge/tanstack-bridge-page";
import { AlertTriangle, RefreshCcw } from "lucide-react";

const rootRoute = createRootRoute({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="flex h-full items-center justify-center p-6">
        <Card className="w-full max-w-xl">
          <CardHeader className="flex items-start gap-3">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-destructive/12 p-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <CardTitle>Route Error</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  The current route failed to render. Refresh after fixing the issue or return to a stable page.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <pre className="overflow-x-auto rounded-xl bg-muted/70 p-4 text-xs text-muted-foreground">
              {error instanceof Error ? error.message : String(error)}
            </pre>
            <div className="flex items-center gap-2">
              <Button variant="default" onClick={() => window.location.assign("/dashboard")}>
                Go To Dashboard
              </Button>
              <Button variant="secondary" onClick={() => window.location.reload()}>
                <RefreshCcw className="h-4 w-4" />
                Reload
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  ),
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => { throw redirect({ to: "/dashboard" }); },
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/projects",
  component: ProjectsPage,
});

const tasksRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tasks",
  component: TasksPage,
});

const teamRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/team",
  component: TeamPage,
});

const realtimeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/realtime",
  component: RealtimePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const uiDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/ui-demo",
  component: UIDemoPage,
});

const pureDemoRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/pure-demo",
  component: PureDemoPage,
});

const tanstackBridgeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/tanstack-bridge",
  component: TanStackBridgePage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  dashboardRoute,
  projectsRoute,
  tasksRoute,
  teamRoute,
  realtimeRoute,
  settingsRoute,
  uiDemoRoute,
  pureDemoRoute,
  tanstackBridgeRoute,
]);
