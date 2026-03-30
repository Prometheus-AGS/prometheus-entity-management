/**
 * table/presets/storage.ts
 *
 * Pluggable storage adapter interface for preset persistence.
 * Adapters implement CRUD + optional realtime subscription.
 */
import type {
  FilterPreset,
  ColumnPreset,
  ActivePresets,
  PresetChangeEvent,
  UnsubscribeFn,
} from "./types";

export interface TableStorageAdapter {
  loadFilterPresets(tableId: string): Promise<FilterPreset[]>;
  saveFilterPreset(tableId: string, preset: FilterPreset): Promise<void>;
  deleteFilterPreset(tableId: string, presetId: string): Promise<void>;

  loadColumnPresets(tableId: string): Promise<ColumnPreset[]>;
  saveColumnPreset(tableId: string, preset: ColumnPreset): Promise<void>;
  deleteColumnPreset(tableId: string, presetId: string): Promise<void>;

  loadActivePresets(tableId: string): Promise<ActivePresets>;
  saveActivePresets(tableId: string, active: ActivePresets): Promise<void>;

  subscribe?(
    tableId: string,
    callback: (event: PresetChangeEvent) => void,
  ): UnsubscribeFn;
}
