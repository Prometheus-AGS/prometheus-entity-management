/**
 * table/selection-store.ts
 *
 * Zustand store for multi-select state, shared across all view modes.
 * Each EntityListView instance creates its own store via createSelectionStore()
 * so multiple lists on the same page don't interfere.
 */
import { createStore, type StoreApi } from "zustand";
import { useStore } from "zustand";
import React from "react";

export interface SelectionStoreState {
  selectedIds: Set<string>;
  isMultiSelectMode: boolean;

  toggle: (id: string) => void;
  select: (id: string) => void;
  deselect: (id: string) => void;
  selectAll: (ids: string[]) => void;
  deselectAll: () => void;
  setMultiSelectMode: (enabled: boolean) => void;
  toggleMultiSelectMode: () => void;
  isSelected: (id: string) => boolean;
  selectedCount: () => number;
  getSelectedIds: () => string[];
}

/**
 * Singleton used only so hooks can call `useSelectionStore` when multi-select is off.
 * Selectors should ignore this store’s state when the real `selectionStore` prop is undefined.
 */
export const selectionStorePlaceholder: StoreApi<SelectionStoreState> =
  createSelectionStore();

export function createSelectionStore(): StoreApi<SelectionStoreState> {
  return createStore<SelectionStoreState>((set, get) => ({
    selectedIds: new Set(),
    isMultiSelectMode: false,

    toggle: (id) =>
      set((state) => {
        const next = new Set(state.selectedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return { selectedIds: next };
      }),

    select: (id) =>
      set((state) => {
        if (state.selectedIds.has(id)) return state;
        const next = new Set(state.selectedIds);
        next.add(id);
        return { selectedIds: next };
      }),

    deselect: (id) =>
      set((state) => {
        if (!state.selectedIds.has(id)) return state;
        const next = new Set(state.selectedIds);
        next.delete(id);
        return { selectedIds: next };
      }),

    selectAll: (ids) =>
      set(() => ({ selectedIds: new Set(ids) })),

    deselectAll: () =>
      set(() => ({ selectedIds: new Set(), isMultiSelectMode: false })),

    setMultiSelectMode: (enabled) =>
      set(() => ({
        isMultiSelectMode: enabled,
        selectedIds: enabled ? get().selectedIds : new Set(),
      })),

    toggleMultiSelectMode: () => {
      const current = get().isMultiSelectMode;
      get().setMultiSelectMode(!current);
    },

    isSelected: (id) => get().selectedIds.has(id),
    selectedCount: () => get().selectedIds.size,
    getSelectedIds: () => Array.from(get().selectedIds),
  }));
}

export function useSelectionStore<T>(
  store: StoreApi<SelectionStoreState>,
  selector: (state: SelectionStoreState) => T,
): T {
  return useStore(store, selector);
}

export const SelectionContext = React.createContext<StoreApi<SelectionStoreState> | null>(null);

export function useSelectionContext(): StoreApi<SelectionStoreState> {
  const store = React.useContext(SelectionContext);
  if (!store) throw new Error("useSelectionContext must be used within a SelectionContext.Provider");
  return store;
}
