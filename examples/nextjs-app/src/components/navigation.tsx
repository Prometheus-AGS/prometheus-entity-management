"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/products", label: "Products" },
  { href: "/reviews", label: "Reviews" },
] as const;

export function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-[--color-border] bg-[--color-surface]/80 backdrop-blur-sm">
      <div className="max-w-6xl mx-auto px-6 h-12 flex items-center gap-8">
        <Link
          href="/products"
          className="flex items-center gap-2 shrink-0"
        >
          <span className="text-[--color-fire] text-lg leading-none">⬡</span>
          <span className="font-display text-sm font-semibold tracking-tight text-[--color-ink]">
            Prometheus
          </span>
        </Link>

        <div className="flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "px-3 py-1.5 rounded-md text-xs font-medium font-ui transition-colors",
                  isActive
                    ? "text-[--color-fire] bg-[--color-fire-wash]"
                    : "text-[--color-ink-3] hover:text-[--color-ink] hover:bg-[--color-surface-2]"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-[10px] font-mono text-[--color-ink-3] tracking-wide">
            entity-graph demo
          </span>
        </div>
      </div>
    </nav>
  );
}
