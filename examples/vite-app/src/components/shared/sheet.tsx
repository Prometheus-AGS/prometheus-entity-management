import React, { useEffect } from "react";
import { ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input as ShadcnInput } from "@/components/ui/input";
import { Textarea as ShadcnTextarea } from "@/components/ui/textarea";

// ── Sheet (side drawer) ───────────────────────────────────────────────────

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}

export function Sheet({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "w-[480px]",
}: SheetProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      <button
        type="button"
        aria-label={`Close ${title}`}
        disabled={!open}
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-200",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
      />
      {/* Panel */}
      <div
        className={cn(
          "fixed top-0 right-0 h-full z-50 flex flex-col bg-card shadow-2xl transition-transform duration-300 ease-out",
          width,
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-4 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-[--color-text-primary]">{title}</h2>
            {subtitle && (
              <p className="text-xs text-[--color-text-muted] mt-0.5">{subtitle}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-7 w-7 text-muted-foreground mt-0.5 shrink-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {/* Footer */}
        {footer && (
          <div className="shrink-0 px-5 py-4 bg-muted/30 flex items-center gap-2">
            {footer}
          </div>
        )}
      </div>
    </>
  );
}

// ── Confirm dialog ────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Delete",
  loading,
}: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div className="relative bg-card rounded-xl shadow-2xl w-full max-w-sm p-5 animate-fade-in">
        <h3 className="text-sm font-semibold text-[--color-text-primary] mb-1">{title}</h3>
        <p className="text-xs text-[--color-text-muted] mb-4">{message}</p>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={onConfirm} disabled={loading}>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Form field wrapper ────────────────────────────────────────────────────

interface FieldProps {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  dirty?: boolean;
}

export function Field({ label, required, hint, children, dirty }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label
        className={cn(
          "text-xs font-medium",
          dirty ? "text-[--color-ember]" : "text-[--color-text-secondary]"
        )}
      >
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
        {dirty && (
          <span className="ml-1.5 text-[10px] font-normal opacity-70">modified</span>
        )}
      </Label>
      {children}
      {hint && (
        <p className="text-[10px] text-[--color-text-muted]">{hint}</p>
      )}
    </div>
  );
}

// ── Input ─────────────────────────────────────────────────────────────────

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <ShadcnInput
    ref={ref}
    className={cn(
      "bg-muted/70 focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

// ── Textarea ──────────────────────────────────────────────────────────────

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <ShadcnTextarea
    ref={ref}
    className={cn(
      "border-0 bg-muted/70 min-h-[72px] resize-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-0",
      className
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

// ── Select ────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options: { value: string; label: string }[];
  placeholder?: string;
}

export function Select({ options, placeholder, className, ...props }: SelectProps) {
  return (
    <div className={cn("relative w-full", className)}>
      <select
        className="h-8 w-full appearance-none rounded-md bg-muted/70 px-2.5 pr-8 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all disabled:opacity-50"
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
    </div>
  );
}
