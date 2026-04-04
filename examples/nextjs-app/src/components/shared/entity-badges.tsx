import React from "react";
import { cn } from "@/lib/utils";
import { Badge } from "./ui";
import { Button } from "@/components/ui/button";
import type { User, Project, Task } from "@/types";

// ── User avatar ────────────────────────────────────────────────────────────

interface UserAvatarProps {
  user: User | null | undefined;
  size?: "xs" | "sm" | "md";
  showName?: boolean;
}

export function UserAvatar({ user, size = "sm", showName = false }: UserAvatarProps) {
  const sz =
    size === "xs" ? "w-5 h-5 text-[9px]" :
    size === "sm" ? "w-7 h-7 text-xs"    :
                    "w-9 h-9 text-sm";

  if (!user) {
    return (
      <div
        className={cn(
          "rounded-full bg-[--color-surface-3] flex items-center justify-center text-[--color-text-muted] font-medium shrink-0",
          sz
        )}
      >
        ?
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-semibold text-white shrink-0",
          sz
        )}
        style={{ background: user.avatarColor }}
      >
        {user.avatarInitials}
      </div>
      {showName && (
        <span className="text-sm text-[--color-text-primary] truncate">{user.name}</span>
      )}
    </div>
  );
}

// ── Status badges ─────────────────────────────────────────────────────────

export function ProjectStatusBadge({ status }: { status: Project["status"] }) {
  const map: Record<Project["status"], { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
    planning:   { label: "Planning",   variant: "info"    },
    active:     { label: "Active",     variant: "success" },
    "on-hold":  { label: "On Hold",    variant: "warning" },
    completed:  { label: "Completed",  variant: "muted"   },
    archived:   { label: "Archived",   variant: "muted"   },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={variant}>{label}</Badge>;
}

export function TaskStatusBadge({ status }: { status: Task["status"] }) {
  const map: Record<Task["status"], { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
    backlog:      { label: "Backlog",     variant: "muted"    },
    todo:         { label: "To Do",       variant: "default"  },
    "in-progress":{ label: "In Progress", variant: "info"     },
    review:       { label: "Review",      variant: "warning"  },
    done:         { label: "Done",        variant: "success"  },
    cancelled:    { label: "Cancelled",   variant: "danger"   },
  };
  const { label, variant } = map[status] ?? { label: status, variant: "default" as const };
  return <Badge variant={variant}>{label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: "low"|"medium"|"high"|"critical" }) {
  const map = {
    low:      { label: "Low",      variant: "muted"    as const, dot: "bg-zinc-500"   },
    medium:   { label: "Medium",   variant: "default"  as const, dot: "bg-blue-400"   },
    high:     { label: "High",     variant: "warning"  as const, dot: "bg-amber-400"  },
    critical: { label: "Critical", variant: "danger"   as const, dot: "bg-red-400"    },
  };
  const { label, variant, dot } = map[priority];
  return (
    <Badge variant={variant}>
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", dot)} />
      {label}
    </Badge>
  );
}

// ── Progress bar ──────────────────────────────────────────────────────────

export function ProgressBar({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  return (
    <div className={cn("h-1.5 rounded-full bg-[--color-surface-3] overflow-hidden", className)}>
      <div
        className="h-full rounded-full bg-[--color-ember] transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}

// ── Button ────────────────────────────────────────────────────────────────

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}

export function Btn({
  variant = "secondary",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...props
}: BtnProps) {
  const buttonVariant =
    variant === "primary" ? "default" :
    variant === "secondary" ? "secondary" :
    variant === "danger" ? "destructive" :
    "ghost";
  return (
    <Button
      variant={buttonVariant}
      size={size === "sm" ? "sm" : "default"}
      className={cn("font-medium", className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      )}
      {children}
    </Button>
  );
}
