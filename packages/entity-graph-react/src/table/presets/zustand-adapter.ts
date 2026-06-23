/**
 * table/presets/zustand-adapter.ts
 *
 * Zustand-backed storage adapter with persist middleware.
 * Supports localStorage, sessionStorage, or IndexedDB.
 * Emits change events locally and syncs across tabs via storage events.
 */
import { createStore, type StoreApi } from "zustand";
import { persist, type PersistStorage } from "zustand/middleware";
import type { TableStorageAdapter } from "./storage";
import type {
  FilterPreset,
  ColumnPreset,
  ActivePresets,
  PresetChangeEvent,
  UnsubscribeFn,
} from "./types";

interface ZustandPresetState {
  tables: Record<
    string,
    {
      filters: FilterPreset[];
      columns: ColumnPreset[];
      active: ActivePresets;
    }
  >;
}

export interface ZustandAdapterOptions {
  storageKey?: string;
  storage?: PersistStorage<ZustandPresetState>;
}

export class ZustandPersistAdapter implements TableStorageAdapter {
  private store: StoreApi<ZustandPresetState>;
  private listeners = new Map<string, Set<(event: PresetChangeEvent) => void>>();

  constructor(options: ZustandAdapterOptions = {}) {
    const storageKey = options.storageKey ?? "prometheus-table-presets";

    this.store = createStore<ZustandPresetState>()(
      persist(
        () => ({ tables: {} }),
        {
          name: storageKey,
          storage: options.storage,
        },
      ),
    );

    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === storageKey && e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue) as { state: ZustandPresetState };
            if (parsed.state) {
              this.store.setState(parsed.state);
              for (const [tableId, callbacks] of this.listeners) {
                for (const cb of callbacks) {
                  cb({
                    tableId,
                    presetType: "filter",
                    presetId: "",
                    operation: "updated",
                    source: "remote",
                    timestamp: Date.now(),
                  });
                }
              }
            }
          } catch {
            // ignore parse errors from external storage changes
          }
        }
      });
    }
  }

  private getTable(tableId: string) {
    return (
      this.store.getState().tables[tableId] ?? {
        filters: [],
        columns: [],
        active: {},
      }
    );
  }

  private setTable(
    tableId: string,
    updater: (
      prev: { filters: FilterPreset[]; columns: ColumnPreset[]; active: ActivePresets },
    ) => { filters: FilterPreset[]; columns: ColumnPreset[]; active: ActivePresets },
  ) {
    this.store.setState((state) => ({
      tables: {
        ...state.tables,
        [tableId]: updater(
          state.tables[tableId] ?? { filters: [], columns: [], active: {} },
        ),
      },
    }));
  }

  private emit(event: PresetChangeEvent) {
    const callbacks = this.listeners.get(event.tableId);
    if (callbacks) {
      for (const cb of callbacks) cb(event);
    }
  }

  async loadFilterPresets(tableId: string): Promise<FilterPreset[]> {
    return this.getTable(tableId).filters;
  }

  async saveFilterPreset(tableId: string, preset: FilterPreset): Promise<void> {
    this.setTable(tableId, (prev) => {
      const idx = prev.filters.findIndex((p) => p.id === preset.id);
      const filters = [...prev.filters];
      if (idx >= 0) filters[idx] = preset;
      else filters.push(preset);
      return { ...prev, filters };
    });
    this.emit({
      tableId,
      presetType: "filter",
      presetId: preset.id,
      operation: this.getTable(tableId).filters.some((p) => p.id === preset.id)
        ? "updated"
        : "created",
      preset,
      source: "local",
      timestamp: Date.now(),
    });
  }

  async deleteFilterPreset(tableId: string, presetId: string): Promise<void> {
    this.setTable(tableId, (prev) => ({
      ...prev,
      filters: prev.filters.filter((p) => p.id !== presetId),
    }));
    this.emit({
      tableId,
      presetType: "filter",
      presetId,
      operation: "deleted",
      source: "local",
      timestamp: Date.now(),
    });
  }

  async loadColumnPresets(tableId: string): Promise<ColumnPreset[]> {
    return this.getTable(tableId).columns;
  }

  async saveColumnPreset(tableId: string, preset: ColumnPreset): Promise<void> {
    this.setTable(tableId, (prev) => {
      const idx = prev.columns.findIndex((p) => p.id === preset.id);
      const columns = [...prev.columns];
      if (idx >= 0) columns[idx] = preset;
      else columns.push(preset);
      return { ...prev, columns };
    });
    this.emit({
      tableId,
      presetType: "column",
      presetId: preset.id,
      operation: "updated",
      preset,
      source: "local",
      timestamp: Date.now(),
    });
  }

  async deleteColumnPreset(tableId: string, presetId: string): Promise<void> {
    this.setTable(tableId, (prev) => ({
      ...prev,
      columns: prev.columns.filter((p) => p.id !== presetId),
    }));
    this.emit({
      tableId,
      presetType: "column",
      presetId,
      operation: "deleted",
      source: "local",
      timestamp: Date.now(),
    });
  }

  async loadActivePresets(tableId: string): Promise<ActivePresets> {
    return this.getTable(tableId).active;
  }

  async saveActivePresets(tableId: string, active: ActivePresets): Promise<void> {
    this.setTable(tableId, (prev) => ({ ...prev, active }));
  }

  subscribe(
    tableId: string,
    callback: (event: PresetChangeEvent) => void,
  ): UnsubscribeFn {
    if (!this.listeners.has(tableId)) this.listeners.set(tableId, new Set());
    this.listeners.get(tableId)!.add(callback);
    return () => {
      this.listeners.get(tableId)?.delete(callback);
    };
  }
}
