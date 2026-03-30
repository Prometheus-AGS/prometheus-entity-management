/**
 * ui/empty-state.tsx
 *
 * Configurable empty view component with defaults for
 * both "no data" and "no results match filters" states.
 */
import React from "react";
import type { EmptyStateConfig } from "../table/types";
import { cn } from "./utils";

interface EmptyStateProps {
  config?: EmptyStateConfig | React.ReactNode;
  isFiltered?: boolean;
  className?: string;
}

export function EmptyState({ config, isFiltered = false, className }: EmptyStateProps) {
  if (React.isValidElement(config)) {
    return <>{config}</>;
  }

  const cfg = (config as EmptyStateConfig | undefined) ?? {};

  const title = isFiltered
    ? (cfg.filteredTitle ?? "No results found")
    : (cfg.title ?? "No items");
  const description = isFiltered
    ? (cfg.filteredDescription ?? "Try adjusting your search or filter criteria.")
    : (cfg.description ?? "Get started by creating your first item.");
  const action = isFiltered ? cfg.filteredAction : cfg.action;
  const IconComponent = cfg.icon;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      {IconComponent && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <IconComponent className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      {!IconComponent && (
        <div className="mb-4 rounded-full bg-muted p-3">
          <EmptyBoxIcon className="h-8 w-8 text-muted-foreground" />
        </div>
      )}
      <h3 className="mb-1 text-base font-semibold">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-muted-foreground">
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="inline-flex h-9 items-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

function EmptyBoxIcon({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <title>Empty</title>
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" y1="22" x2="12" y2="12" />
    </svg>
  );
}
