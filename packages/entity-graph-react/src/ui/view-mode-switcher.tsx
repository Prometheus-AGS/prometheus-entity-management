/**
 * ui/view-mode-switcher.tsx
 *
 * Icon toggle group for switching between table/gallery/list view modes.
 */
import type { ComponentType } from "react";
import type { ViewMode } from "@prometheus-ags/entity-graph-core";
import { cn } from "./utils";

interface ViewModeSwitcherProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  enabledModes?: ViewMode[];
  className?: string;
}

export function ViewModeSwitcher({
  mode,
  onModeChange,
  enabledModes = ["table", "gallery", "list"],
  className,
}: ViewModeSwitcherProps) {
  if (enabledModes.length <= 1) return null;

  const modes: Array<{ key: ViewMode; icon: ComponentType<{ className?: string }>; label: string }> = [
    { key: "table", icon: TableIcon, label: "Table view" },
    { key: "gallery", icon: GalleryIcon, label: "Gallery view" },
    { key: "list", icon: ListIcon, label: "List view" },
  ];

  return (
    <div className={cn("inline-flex items-center rounded-lg bg-muted/60 p-1 gap-0.5", className)}>
      {modes
        .filter((m) => enabledModes.includes(m.key))
        .map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => onModeChange(key)}
            title={label}
            className={cn(
              "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors",
              mode === key
                ? "bg-background text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            <span className="sr-only">{label}</span>
          </button>
        ))}
    </div>
  );
}

function TableIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Table</title>
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="3" y1="15" x2="21" y2="15" />
      <line x1="9" y1="3" x2="9" y2="21" />
    </svg>
  );
}

function GalleryIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Gallery</title>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}

function ListIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>List</title>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </svg>
  );
}
