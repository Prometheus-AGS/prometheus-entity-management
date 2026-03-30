/**
 * ui/action-column.tsx
 *
 * ActionDef system with built-in CRUD action helpers.
 * Renders as a dropdown menu in table rows, icon buttons in gallery
 * cards and list items.
 */
import { useState, useRef, useEffect } from "react";
import type { ActionDef } from "../table/types";
import { cn } from "./utils";

// ---------------------------------------------------------------------------
// Built-in action helpers
// ---------------------------------------------------------------------------
export function viewAction<T>(opts: {
  onClick: (item: T) => void;
  label?: string;
}): ActionDef<T> {
  return {
    id: "view",
    label: opts.label ?? "View",
    icon: EyeIcon,
    onClick: opts.onClick,
    variant: "ghost",
  };
}

export function editAction<T>(opts: {
  onClick: (item: T) => void;
  label?: string;
}): ActionDef<T> {
  return {
    id: "edit",
    label: opts.label ?? "Edit",
    icon: PencilIcon,
    onClick: opts.onClick,
    variant: "ghost",
  };
}

export function deleteAction<T>(opts: {
  onClick: (item: T) => void;
  label?: string;
  confirm?: string;
}): ActionDef<T> {
  return {
    id: "delete",
    label: opts.label ?? "Delete",
    icon: TrashIcon,
    onClick: opts.onClick,
    destructive: true,
    confirm: opts.confirm ?? "Are you sure you want to delete this item?",
    variant: "destructive",
  };
}

// ---------------------------------------------------------------------------
// Action dropdown (for table rows)
// ---------------------------------------------------------------------------
interface ActionDropdownProps<T> {
  item: T;
  actions: ActionDef<T>[];
  className?: string;
}

export function ActionDropdown<T>({
  item,
  actions,
  className,
}: ActionDropdownProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ActionDef<T> | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const visibleActions = actions.filter((a) => !a.hidden?.(item));

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  if (visibleActions.length === 0) return null;

  function executeAction(action: ActionDef<T>) {
    if (action.confirm) {
      setConfirmAction(action);
      setIsOpen(false);
      return;
    }
    action.onClick(item);
    setIsOpen(false);
  }

  return (
    <div className={cn("relative inline-block", className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent text-muted-foreground"
      >
        <MoreIcon className="h-4 w-4" />
        <span className="sr-only">Actions</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-1 min-w-[160px] rounded-md border bg-popover py-1 shadow-md">
          {visibleActions.map((action) => (
            <button
              key={action.id}
              type="button"
              disabled={action.disabled?.(item)}
              onClick={() => executeAction(action)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
                action.destructive && "text-destructive hover:text-destructive",
              )}
            >
              {action.icon && <action.icon className="h-4 w-4" />}
              {action.label}
            </button>
          ))}
        </div>
      )}

      {confirmAction && (
        <ConfirmDialog
          message={
            typeof confirmAction.confirm === "function"
              ? confirmAction.confirm(item)
              : (confirmAction.confirm as string)
          }
          destructive={confirmAction.destructive}
          onConfirm={() => {
            confirmAction.onClick(item);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Action button row (for gallery cards and list items)
// ---------------------------------------------------------------------------
interface ActionButtonRowProps<T> {
  item: T;
  actions: ActionDef<T>[];
  maxVisible?: number;
  className?: string;
}

export function ActionButtonRow<T>({
  item,
  actions,
  maxVisible = 2,
  className,
}: ActionButtonRowProps<T>) {
  const visibleActions = actions.filter((a) => !a.hidden?.(item));
  const inline = visibleActions.slice(0, maxVisible);
  const overflow = visibleActions.slice(maxVisible);
  const [confirmAction, setConfirmAction] = useState<ActionDef<T> | null>(null);

  function executeAction(action: ActionDef<T>) {
    if (action.confirm) {
      setConfirmAction(action);
      return;
    }
    action.onClick(item);
  }

  return (
    <div className={cn("flex items-center gap-1", className)}>
      {inline.map((action) => (
        <button
          key={action.id}
          type="button"
          onClick={() => executeAction(action)}
          disabled={action.disabled?.(item)}
          aria-label={action.label}
          title={action.label}
          className={cn(
            "inline-flex h-7 w-7 items-center justify-center rounded-md hover:bg-accent disabled:pointer-events-none disabled:opacity-50",
            action.destructive && "text-destructive hover:text-destructive",
          )}
        >
          {action.icon && <action.icon className="h-3.5 w-3.5" />}
        </button>
      ))}

      {overflow.length > 0 && (
        <ActionDropdown item={item} actions={overflow} />
      )}

      {confirmAction && (
        <ConfirmDialog
          message={
            typeof confirmAction.confirm === "function"
              ? confirmAction.confirm(item)
              : (confirmAction.confirm as string)
          }
          destructive={confirmAction.destructive}
          onConfirm={() => {
            confirmAction.onClick(item);
            setConfirmAction(null);
          }}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------
function ConfirmDialog({
  message,
  destructive,
  onConfirm,
  onCancel,
}: {
  message: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-sm rounded-lg border bg-background p-6 shadow-lg">
        <p className="text-sm">{message}</p>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              "inline-flex h-9 items-center rounded-md px-4 text-sm font-medium text-white",
              destructive
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-primary hover:bg-primary/90",
            )}
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------
function MoreIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <title>More actions</title>
      <circle cx="12" cy="12" r="1" /><circle cx="12" cy="5" r="1" /><circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function EyeIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <title>View</title>
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PencilIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <title>Edit</title>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}

function TrashIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <title>Delete</title>
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}
