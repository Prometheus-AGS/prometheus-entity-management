"use client";

import { cn } from "@/lib/utils";
import type { ProductCategory, ProductStatus, PricingModel } from "@/lib/types";

/* ── Status badge ─────────────────────────────────────────────────────────── */
const STATUS_STYLES: Record<ProductStatus, string> = {
  ga:         "bg-emerald-50 text-emerald-700 border-emerald-200",
  beta:       "bg-blue-50 text-blue-700 border-blue-200",
  alpha:      "bg-amber-50 text-amber-700 border-amber-200",
  deprecated: "bg-zinc-100 text-zinc-500 border-zinc-200",
  planned:    "bg-purple-50 text-purple-700 border-purple-200",
};
const STATUS_LABELS: Record<ProductStatus, string> = {
  ga: "GA", beta: "Beta", alpha: "Alpha", deprecated: "Deprecated", planned: "Planned",
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border tracking-wide",
      STATUS_STYLES[status]
    )}>
      {STATUS_LABELS[status]}
    </span>
  );
}

/* ── Category chip ────────────────────────────────────────────────────────── */
const CAT_STYLES: Record<ProductCategory, string> = {
  infrastructure:   "bg-orange-50 text-orange-700",
  "developer-tools": "bg-indigo-50 text-indigo-700",
  "ai-ml":          "bg-purple-50 text-purple-700",
  security:         "bg-red-50 text-red-700",
  data:             "bg-teal-50 text-teal-700",
  mobile:           "bg-pink-50 text-pink-700",
};
const CAT_LABELS: Record<ProductCategory, string> = {
  infrastructure:   "Infrastructure",
  "developer-tools": "Dev Tools",
  "ai-ml":          "AI / ML",
  security:         "Security",
  data:             "Data",
  mobile:           "Mobile",
};

export function CategoryChip({ category }: { category: ProductCategory }) {
  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium",
      CAT_STYLES[category]
    )}>
      {CAT_LABELS[category]}
    </span>
  );
}

/* ── Pricing badge ────────────────────────────────────────────────────────── */
const PRICING_LABELS: Record<PricingModel, string> = {
  "open-source":  "Open Source",
  freemium:       "Freemium",
  subscription:   "Subscription",
  "usage-based":  "Usage-based",
  enterprise:     "Enterprise",
};

export function PricingBadge({ pricing }: { pricing: PricingModel }) {
  return (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium bg-[--color-surface-2] text-[--color-ink-3] border border-[--color-border]">
      {PRICING_LABELS[pricing]}
    </span>
  );
}

/* ── Stat pill ────────────────────────────────────────────────────────────── */
export function StatPill({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-[--color-ink-3]">
      <span className="text-[--color-ink-3]/60">{icon}</span>
      <span className="font-medium text-[--color-ink-2]">{typeof value === "number" ? value.toLocaleString() : value}</span>
      <span>{label}</span>
    </div>
  );
}

/* ── Button ───────────────────────────────────────────────────────────────── */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  loading?: boolean;
}
export function Btn({ variant = "secondary", size = "md", loading, className, children, disabled, ...props }: BtnProps) {
  const base = "inline-flex items-center justify-center gap-1.5 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:pointer-events-none";
  const sz = size === "sm" ? "h-7 px-2.5 text-xs" : "h-9 px-4 text-sm";
  const vars: Record<string, string> = {
    primary:   "bg-[--color-fire] text-white hover:bg-orange-600 shadow-sm",
    secondary: "bg-white text-[--color-ink-2] border border-[--color-border] hover:border-[--color-ink-3] shadow-sm",
    ghost:     "text-[--color-ink-3] hover:text-[--color-ink] hover:bg-[--color-surface-2]",
    danger:    "bg-red-50 text-red-700 border border-red-200 hover:bg-red-100",
  };
  return (
    <button className={cn(base, sz, vars[variant], className)} disabled={disabled || loading} {...props}>
      {loading && <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
      {children}
    </button>
  );
}

/* ── Skeleton ─────────────────────────────────────────────────────────────── */
export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded", className)} />;
}
