/**
 * table/presets/types.ts
 *
 * Types for named filter and column presets,
 * plus realtime change events.
 */
import type { ViewMode } from "@prometheus-ags/entity-graph-core";

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filter: import("@prometheus-ags/entity-graph-core").FilterSpec;
  sort?: import("@prometheus-ags/entity-graph-core").SortSpec;
  search?: { query: string; fields: string[] };
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ColumnPresetEntry {
  id: string;
  visible: boolean;
  width?: number;
  minWidth?: number;
  order: number;
  pinned?: "left" | "right" | false;
  formatOptions?: Record<string, unknown>;
}

export interface ColumnPreset {
  id: string;
  name: string;
  description?: string;
  columns: ColumnPresetEntry[];
  isDefault?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type PresetChangeOperation = "created" | "updated" | "deleted";

export interface PresetChangeEvent {
  tableId: string;
  presetType: "filter" | "column";
  presetId: string;
  operation: PresetChangeOperation;
  preset?: FilterPreset | ColumnPreset;
  source: "local" | "remote";
  timestamp: number;
}

export interface ActivePresets {
  filterId?: string;
  columnId?: string;
  viewMode?: ViewMode;
}

export type UnsubscribeFn = () => void;
