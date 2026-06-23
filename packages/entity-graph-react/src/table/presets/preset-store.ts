/**
 * table/presets/preset-store.ts
 *
 * Zustand store for reactive preset state across all tables.
 * Holds loaded presets, active selections, pending remote changes,
 * and the configurable auto-apply vs notify behavior.
 */
import { createStore, type StoreApi } from "zustand";
import type { ViewMode } from "@prometheus-ags/entity-graph-core";
import type {
  FilterPreset,
  ColumnPreset,
  PresetChangeEvent,
  UnsubscribeFn,
} from "./types";
import type { TableStorageAdapter } from "./storage";

export interface TablePresetSlice {
  filters: FilterPreset[];
  columns: ColumnPreset[];
  activeFilterId: string | null;
  activeColumnId: string | null;
  activeViewMode: ViewMode;
}

export interface PresetStoreState {
  presets: Record<string, TablePresetSlice>;
  pendingChanges: PresetChangeEvent[];
  realtimeMode: "auto-apply" | "notify";

  getTablePresets: (tableId: string) => TablePresetSlice;

  loadPresets: (tableId: string, adapter: TableStorageAdapter) => Promise<void>;
  applyFilterPreset: (tableId: string, presetId: string | null) => void;
  applyColumnPreset: (tableId: string, presetId: string | null) => void;
  setViewMode: (tableId: string, mode: ViewMode) => void;

  saveFilterPreset: (
    tableId: string,
    preset: FilterPreset,
    adapter: TableStorageAdapter,
  ) => Promise<void>;
  saveColumnPreset: (
    tableId: string,
    preset: ColumnPreset,
    adapter: TableStorageAdapter,
  ) => Promise<void>;
  deleteFilterPreset: (
    tableId: string,
    presetId: string,
    adapter: TableStorageAdapter,
  ) => Promise<void>;
  deleteColumnPreset: (
    tableId: string,
    presetId: string,
    adapter: TableStorageAdapter,
  ) => Promise<void>;

  handleRemoteChange: (event: PresetChangeEvent, adapter: TableStorageAdapter) => void;
  acknowledgePendingChange: (index: number) => void;
  dismissPendingChanges: (tableId: string) => void;
}

const defaultSlice: TablePresetSlice = {
  filters: [],
  columns: [],
  activeFilterId: null,
  activeColumnId: null,
  activeViewMode: "table",
};

export function createPresetStore(
  realtimeMode: "auto-apply" | "notify" = "auto-apply",
): StoreApi<PresetStoreState> {
  return createStore<PresetStoreState>((set, get) => ({
    presets: {},
    pendingChanges: [],
    realtimeMode,

    getTablePresets: (tableId) =>
      get().presets[tableId] ?? defaultSlice,

    loadPresets: async (tableId, adapter) => {
      const [filters, columns, active] = await Promise.all([
        adapter.loadFilterPresets(tableId),
        adapter.loadColumnPresets(tableId),
        adapter.loadActivePresets(tableId),
      ]);

      set((state) => ({
        presets: {
          ...state.presets,
          [tableId]: {
            filters,
            columns,
            activeFilterId: active.filterId ?? null,
            activeColumnId: active.columnId ?? null,
            activeViewMode: active.viewMode ?? "table",
          },
        },
      }));
    },

    applyFilterPreset: (tableId, presetId) => {
      set((state) => {
        const slice = state.presets[tableId] ?? { ...defaultSlice };
        return {
          presets: {
            ...state.presets,
            [tableId]: { ...slice, activeFilterId: presetId },
          },
        };
      });
    },

    applyColumnPreset: (tableId, presetId) => {
      set((state) => {
        const slice = state.presets[tableId] ?? { ...defaultSlice };
        return {
          presets: {
            ...state.presets,
            [tableId]: { ...slice, activeColumnId: presetId },
          },
        };
      });
    },

    setViewMode: (tableId, mode) => {
      set((state) => {
        const slice = state.presets[tableId] ?? { ...defaultSlice };
        return {
          presets: {
            ...state.presets,
            [tableId]: { ...slice, activeViewMode: mode },
          },
        };
      });
    },

    saveFilterPreset: async (tableId, preset, adapter) => {
      await adapter.saveFilterPreset(tableId, preset);
      set((state) => {
        const slice = state.presets[tableId] ?? { ...defaultSlice };
        const idx = slice.filters.findIndex((p) => p.id === preset.id);
        const filters = [...slice.filters];
        if (idx >= 0) filters[idx] = preset;
        else filters.push(preset);
        return {
          presets: {
            ...state.presets,
            [tableId]: { ...slice, filters },
          },
        };
      });
    },

    saveColumnPreset: async (tableId, preset, adapter) => {
      await adapter.saveColumnPreset(tableId, preset);
      set((state) => {
        const slice = state.presets[tableId] ?? { ...defaultSlice };
        const idx = slice.columns.findIndex((p) => p.id === preset.id);
        const columns = [...slice.columns];
        if (idx >= 0) columns[idx] = preset;
        else columns.push(preset);
        return {
          presets: {
            ...state.presets,
            [tableId]: { ...slice, columns },
          },
        };
      });
    },

    deleteFilterPreset: async (tableId, presetId, adapter) => {
      await adapter.deleteFilterPreset(tableId, presetId);
      set((state) => {
        const slice = state.presets[tableId] ?? { ...defaultSlice };
        return {
          presets: {
            ...state.presets,
            [tableId]: {
              ...slice,
              filters: slice.filters.filter((p) => p.id !== presetId),
              activeFilterId:
                slice.activeFilterId === presetId ? null : slice.activeFilterId,
            },
          },
        };
      });
    },

    deleteColumnPreset: async (tableId, presetId, adapter) => {
      await adapter.deleteColumnPreset(tableId, presetId);
      set((state) => {
        const slice = state.presets[tableId] ?? { ...defaultSlice };
        return {
          presets: {
            ...state.presets,
            [tableId]: {
              ...slice,
              columns: slice.columns.filter((p) => p.id !== presetId),
              activeColumnId:
                slice.activeColumnId === presetId ? null : slice.activeColumnId,
            },
          },
        };
      });
    },

    handleRemoteChange: (event, adapter) => {
      const mode = get().realtimeMode;
      if (mode === "auto-apply") {
        get().loadPresets(event.tableId, adapter);
      } else {
        set((state) => ({
          pendingChanges: [...state.pendingChanges, event],
        }));
      }
    },

    acknowledgePendingChange: (index) => {
      set((state) => ({
        pendingChanges: state.pendingChanges.filter((_, i) => i !== index),
      }));
    },

    dismissPendingChanges: (tableId) => {
      set((state) => ({
        pendingChanges: state.pendingChanges.filter(
          (e) => e.tableId !== tableId,
        ),
      }));
    },
  }));
}
