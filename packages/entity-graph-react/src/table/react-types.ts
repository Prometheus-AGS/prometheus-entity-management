import type { ComponentType, ReactNode } from "react";
import type {
  CellContext,
  HeaderContext,
  Row,
} from "@prometheus-ags/entity-graph-core";

export type HeaderRenderer<TData> =
  | string
  | ((context: HeaderContext<TData>) => ReactNode);

export type CellRenderer<TData> =
  | string
  | ((context: CellContext<TData>) => ReactNode);

export interface ActionDef<TData> {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  onClick: (item: TData) => void;
  destructive?: boolean;
  hidden?: (item: TData) => boolean;
  disabled?: (item: TData) => boolean;
  confirm?: string | ((item: TData) => string);
  variant?: "primary" | "default" | "ghost" | "destructive";
}

export interface ItemDescriptorBadge<TData> {
  field: keyof TData & string;
  options?: Array<{ value: string; label: string; className?: string }>;
}

export interface ItemDescriptorMeta<TData> {
  field: keyof TData & string;
  label: string;
  format?: (value: unknown) => string;
}

export interface ItemDescriptor<TData> {
  title: keyof TData & string;
  subtitle?: keyof TData & string;
  image?: keyof TData & string;
  icon?: (keyof TData & string) | ComponentType<{ className?: string }>;
  avatar?: keyof TData & string;
  badges?: ItemDescriptorBadge<TData>[];
  metadata?: ItemDescriptorMeta<TData>[];
  description?: keyof TData & string;
}

export interface ItemRenderContext<TData> {
  isSelected: boolean;
  isEditing: boolean;
  isMultiSelectMode: boolean;
  onToggleSelect: () => void;
  onEdit: () => void;
  onSave: (changes: Partial<TData>) => void;
  onCancel: () => void;
  actions: ActionDef<TData>[];
  row: Row<TData>;
}

export interface EmptyStateConfig {
  icon?: ComponentType<{ className?: string }>;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  filteredTitle?: string;
  filteredDescription?: string;
  filteredAction?: { label: string; onClick: () => void };
}

export interface BatchActionDef {
  id: string;
  label: string;
  icon?: ComponentType<{ className?: string }>;
  destructive?: boolean;
}

export interface GalleryColumns {
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
}
