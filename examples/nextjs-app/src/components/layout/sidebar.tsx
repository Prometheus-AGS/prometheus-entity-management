"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Users,
  Flame,
  ChevronRight,
  Radio,
  Settings,
  LayoutGrid,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects", label: "Projects", icon: FolderKanban },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/team", label: "Team", icon: Users },
  { href: "/realtime", label: "Realtime", icon: Radio },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/ui-demo", label: "UI Demo", icon: LayoutGrid },
  { href: "/pure-demo", label: "Pure Demo", icon: LayoutGrid },
  { href: "/tanstack-bridge", label: "Query bridge", icon: Link2 },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[228px] shrink-0 flex flex-col bg-card/90 backdrop-blur-md supports-backdrop-filter:bg-card/78">
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

      <nav className="flex-1 px-3 py-4 flex flex-col gap-0.5" aria-label="Primary">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium font-sans transition-colors duration-150",
                active
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/80",
              )}
            >
              <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "")} />
              {label}
              {active && (
                <ChevronRight className="w-3 h-3 ml-auto opacity-60" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 bg-muted/35">
        <p className="text-[10px] text-muted-foreground font-mono leading-snug break-all">
          @prometheus-ags/prometheus-entity-management
        </p>
        <p className="text-[10px] text-muted-foreground">v1.0.0 · Next.js + React 19</p>
      </div>
    </aside>
  );
}
