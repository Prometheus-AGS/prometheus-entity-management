import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme/theme-toggle";

// ── Page header (brand: glass strip + theme toggle — see docs/branding/branding-template.html) ─

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-4 shrink-0 bg-card/80 backdrop-blur-md supports-backdrop-filter:bg-card/70">
      <div className="min-w-0">
        <h1 className="font-display text-lg font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-0.5 font-body max-w-[65ch]">
            {subtitle}
          </p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {children}
        <ThemeToggle />
      </div>
    </header>
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: string;
  deltaDir?: "up" | "down" | "neutral";
  icon?: React.ReactNode;
}

export function StatCard({
  label,
  value,
  delta,
  deltaDir = "neutral",
  icon,
}: StatCardProps) {
  return (
    <div className="rounded-xl bg-card p-4 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] font-semibold font-sans text-muted-foreground uppercase tracking-[0.08em]">
          {label}
        </span>
        {icon && <span className="text-muted-foreground">{icon}</span>}
      </div>
      <div className="text-2xl font-semibold font-display tracking-tight text-foreground">
        {value}
      </div>
      {delta && (
        <div
          className={cn(
            "text-xs font-medium",
            deltaDir === "up"   ? "text-emerald-600 dark:text-emerald-400" :
            deltaDir === "down" ? "text-red-600 dark:text-red-400"     :
            "text-muted-foreground"
          )}
        >
          {delta}
        </div>
      )}
    </div>
  );
}

// ── Badge ──────────────────────────────────────────────────────────────────

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "muted" | "ember";

const BADGE_VARIANTS: Record<BadgeVariant, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
  danger:  "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-300",
  info:    "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300",
  muted:   "bg-muted/85 text-muted-foreground",
  ember:   "bg-primary/12 text-primary",
};

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium",
        BADGE_VARIANTS[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
