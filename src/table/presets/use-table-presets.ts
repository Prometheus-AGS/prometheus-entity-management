/**
 * table/presets/use-table-presets.ts
 *
 * Hook for loading, saving, and applying presets with realtime sync.
 */
import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useStore } from "zustand";
import type { ViewMode } from "../types";
import type {
  FilterPreset,
  ColumnPreset,
  PresetChangeEvent,
} from "./types";
import type { TableStorageAdapter } from "./storage";
import { createPresetStore, type PresetStoreState } from "./preset-store";
import { MemoryAdapter } from "./memory-adapter";

export interface UseTablePresetsOptions {
  adapter?: TableStorageAdapter;
  realtimeMode?: "auto-apply" | "notify";
  enabled?: boolean;
}

export interface UseTablePresetsResult {
  filterPresets: FilterPreset[];
  columnPresets: ColumnPreset[];
  activeFilterPreset: FilterPreset | null;
  activeColumnPreset: ColumnPreset | null;
  activeViewMode: ViewMode;
  pendingChanges: PresetChangeEvent[];

  applyFilterPreset: (id: string | null) => void;
  applyColumnPreset: (id: string | null) => void;
  setViewMode: (mode: ViewMode) => void;

  saveFilterPreset: (
    preset: Omit<FilterPreset, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateFilterPreset: (
    id: string,
    patch: Partial<FilterPreset>,
  ) => Promise<void>;
  saveColumnPreset: (
    preset: Omit<ColumnPreset, "id" | "createdAt" | "updatedAt">,
  ) => Promise<void>;
  updateColumnPreset: (
    id: string,
    patch: Partial<ColumnPreset>,
  ) => Promise<void>;
  deleteFilterPreset: (id: string) => Promise<void>;
  deleteColumnPreset: (id: string) => Promise<void>;

  acknowledgePendingChange: (index: number) => void;
  dismissPendingChanges: () => void;

  isLoading: boolean;
  isSubscribed: boolean;
}

let nextId = 0;
function generateId(): string {
  return `preset_${Date.now()}_${++nextId}`;
}

export function useTablePresets(
  tableId: string,
  options: UseTablePresetsOptions = {},
): UseTablePresetsResult {
  const { adapter, realtimeMode = "auto-apply", enabled = true } = options;

  const resolvedAdapter: TableStorageAdapter = adapter ?? new MemoryAdapter();
  const adapterRef = useRef<TableStorageAdapter>(resolvedAdapter);
  adapterRef.current = resolvedAdapter;

  const storeRef = useRef(createPresetStore(realtimeMode));
  const store = storeRef.current;

  const [isLoading, setIsLoading] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  // Load presets on mount
  useEffect(() => {
    if (!enabled) return;
    setIsLoading(true);
    store
      .getState()
      .loadPresets(tableId, adapterRef.current)
      .finally(() => setIsLoading(false));
  }, [tableId, enabled, store]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!enabled) return;
    const currentAdapter = adapterRef.current;
    if (!currentAdapter.subscribe) {
      setIsSubscribed(false);
      return;
    }
    const unsub = currentAdapter.subscribe(tableId, (event: PresetChangeEvent) => {
      store.getState().handleRemoteChange(event, currentAdapter);
    });
    setIsSubscribed(true);
    return () => unsub();
  }, [tableId, enabled, store]);

  const slice = useStore(store, (s) => s.presets[tableId] ?? s.getTablePresets(tableId));
  const allPendingChanges = useStore(store, (s) => s.pendingChanges);
  const pendingChanges = useMemo(
    () => allPendingChanges.filter((e) => e.tableId === tableId),
    [allPendingChanges, tableId],
  );

  const activeFilterPreset = useMemo(
    () => slice.filters.find((p) => p.id === slice.activeFilterId) ?? null,
    [slice.filters, slice.activeFilterId],
  );

  const activeColumnPreset = useMemo(
    () => slice.columns.find((p) => p.id === slice.activeColumnId) ?? null,
    [slice.columns, slice.activeColumnId],
  );

  const applyFilterPreset = useCallback(
    (id: string | null) => {
      store.getState().applyFilterPreset(tableId, id);
      adapterRef.current.saveActivePresets(tableId, {
        filterId: id ?? undefined,
        columnId: slice.activeColumnId ?? undefined,
        viewMode: slice.activeViewMode,
      });
    },
    [tableId, slice.activeColumnId, slice.activeViewMode, store],
  );

  const applyColumnPreset = useCallback(
    (id: string | null) => {
      store.getState().applyColumnPreset(tableId, id);
      adapterRef.current.saveActivePresets(tableId, {
        filterId: slice.activeFilterId ?? undefined,
        columnId: id ?? undefined,
        viewMode: slice.activeViewMode,
      });
    },
    [tableId, slice.activeFilterId, slice.activeViewMode, store],
  );

  const setViewMode = useCallback(
    (mode: ViewMode) => {
      store.getState().setViewMode(tableId, mode);
      adapterRef.current.saveActivePresets(tableId, {
        filterId: slice.activeFilterId ?? undefined,
        columnId: slice.activeColumnId ?? undefined,
        viewMode: mode,
      });
    },
    [tableId, slice.activeFilterId, slice.activeColumnId, store],
  );

  const saveFilterPreset = useCallback(
    async (preset: Omit<FilterPreset, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const full: FilterPreset = {
        ...preset,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await store.getState().saveFilterPreset(tableId, full, adapterRef.current);
    },
    [tableId, store],
  );

  const updateFilterPreset = useCallback(
    async (id: string, patch: Partial<FilterPreset>) => {
      const existing = slice.filters.find((p) => p.id === id);
      if (!existing) return;
      const updated: FilterPreset = {
        ...existing,
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      };
      await store.getState().saveFilterPreset(tableId, updated, adapterRef.current);
    },
    [tableId, slice.filters, store],
  );

  const saveColumnPreset = useCallback(
    async (preset: Omit<ColumnPreset, "id" | "createdAt" | "updatedAt">) => {
      const now = new Date().toISOString();
      const full: ColumnPreset = {
        ...preset,
        id: generateId(),
        createdAt: now,
        updatedAt: now,
      };
      await store.getState().saveColumnPreset(tableId, full, adapterRef.current);
    },
    [tableId, store],
  );

  const updateColumnPreset = useCallback(
    async (id: string, patch: Partial<ColumnPreset>) => {
      const existing = slice.columns.find((p) => p.id === id);
      if (!existing) return;
      const updated: ColumnPreset = {
        ...existing,
        ...patch,
        id,
        updatedAt: new Date().toISOString(),
      };
      await store.getState().saveColumnPreset(tableId, updated, adapterRef.current);
    },
    [tableId, slice.columns, store],
  );

  const deleteFilterPreset = useCallback(
    async (id: string) => {
      await store.getState().deleteFilterPreset(tableId, id, adapterRef.current);
    },
    [tableId, store],
  );

  const deleteColumnPreset = useCallback(
    async (id: string) => {
      await store.getState().deleteColumnPreset(tableId, id, adapterRef.current);
    },
    [tableId, store],
  );

  const acknowledgePendingChange = useCallback(
    (index: number) => {
      store.getState().acknowledgePendingChange(index);
    },
    [store],
  );

  const dismissPendingChanges = useCallback(() => {
    store.getState().dismissPendingChanges(tableId);
  }, [tableId, store]);

  return {
    filterPresets: slice.filters,
    columnPresets: slice.columns,
    activeFilterPreset,
    activeColumnPreset,
    activeViewMode: slice.activeViewMode,
    pendingChanges,

    applyFilterPreset,
    applyColumnPreset,
    setViewMode,
    saveFilterPreset,
    updateFilterPreset,
    saveColumnPreset,
    updateColumnPreset,
    deleteFilterPreset,
    deleteColumnPreset,
    acknowledgePendingChange,
    dismissPendingChanges,

    isLoading,
    isSubscribed,
  };
}
