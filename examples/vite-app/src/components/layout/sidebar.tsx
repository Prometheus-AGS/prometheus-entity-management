import React from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FolderKanban, CheckSquare,
  Users, Flame, ChevronRight, Radio, Settings, LayoutGrid,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects",  label: "Projects",  icon: FolderKanban },
  { to: "/tasks",     label: "Tasks",     icon: CheckSquare },
  { to: "/team",      label: "Team",      icon: Users },
  { to: "/realtime",  label: "Realtime",  icon: Radio },
  { to: "/settings",  label: "Settings",  icon: Settings },
  { to: "/ui-demo",   label: "UI Demo",   icon: LayoutGrid },
  { to: "/pure-demo", label: "Pure Demo", icon: LayoutGrid },
];

export function Sidebar() {
  const { location } = useRouterState();

  return (
    <aside className="w-[228px] shrink-0 flex flex-col bg-card/90 backdrop-blur-md supports-backdrop-filter:bg-card/78">
      {/* Logo — Space Grotesk + ember accent (brand template nav) */}
      <div className="flex items-center gap-2.5 px-5 h-14">
        <div className="relative flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
          <Flame className="w-5 h-5 text-primary" aria-hidden />
        </div>
        <div className="min-w-0 leading-tight">
          <span className="font-display text-[0.95rem] font-bold tracking-tight text-foreground block truncate">
            Prometheus<span className="text-primary">.</span>
          </span>
          <span className="text-[0.6rem] font-mono uppercase tracking-[0.12em] text-muted-foreground">
            Entity graph
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5" aria-label="Primary">
        {NAV.map(({ to, label, icon: Icon }) => {
          const active = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
          return (
            <Link key={to} to={to}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium font-sans transition-colors duration-150",
                active
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80"
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "")} />
              {label}
              {active && <ChevronRight className="w-3 h-3 ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 bg-muted/35">
        <p className="text-[10px] text-muted-foreground font-mono leading-snug">
          prometheus-entity-management
        </p>
        <p className="text-[10px] text-muted-foreground">v0.1.0 · Vite + React 19</p>
      </div>
    </aside>
  );
}
