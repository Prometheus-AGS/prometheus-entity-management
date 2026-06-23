/**
 * table/presets/memory-adapter.ts
 *
 * In-memory storage adapter — zero-config default.
 * Data lives only for the session lifetime.
 */
import type { TableStorageAdapter } from "./storage";
import type { FilterPreset, ColumnPreset, ActivePresets } from "./types";

export class MemoryAdapter implements TableStorageAdapter {
  private filters = new Map<string, FilterPreset[]>();
  private columns = new Map<string, ColumnPreset[]>();
  private active = new Map<string, ActivePresets>();

  async loadFilterPresets(tableId: string): Promise<FilterPreset[]> {
    return this.filters.get(tableId) ?? [];
  }

  async saveFilterPreset(tableId: string, preset: FilterPreset): Promise<void> {
    const list = this.filters.get(tableId) ?? [];
    const idx = list.findIndex((p) => p.id === preset.id);
    if (idx >= 0) {
      list[idx] = preset;
    } else {
      list.push(preset);
    }
    this.filters.set(tableId, list);
  }

  async deleteFilterPreset(tableId: string, presetId: string): Promise<void> {
    const list = this.filters.get(tableId) ?? [];
    this.filters.set(
      tableId,
      list.filter((p) => p.id !== presetId),
    );
  }

  async loadColumnPresets(tableId: string): Promise<ColumnPreset[]> {
    return this.columns.get(tableId) ?? [];
  }

  async saveColumnPreset(tableId: string, preset: ColumnPreset): Promise<void> {
    const list = this.columns.get(tableId) ?? [];
    const idx = list.findIndex((p) => p.id === preset.id);
    if (idx >= 0) {
      list[idx] = preset;
    } else {
      list.push(preset);
    }
    this.columns.set(tableId, list);
  }

  async deleteColumnPreset(tableId: string, presetId: string): Promise<void> {
    const list = this.columns.get(tableId) ?? [];
    this.columns.set(
      tableId,
      list.filter((p) => p.id !== presetId),
    );
  }

  async loadActivePresets(tableId: string): Promise<ActivePresets> {
    return this.active.get(tableId) ?? {};
  }

  async saveActivePresets(tableId: string, active: ActivePresets): Promise<void> {
    this.active.set(tableId, active);
  }
}
