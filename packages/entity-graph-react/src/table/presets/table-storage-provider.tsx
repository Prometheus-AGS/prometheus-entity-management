/**
 * table/presets/table-storage-provider.tsx
 *
 * React context provider for the default TableStorageAdapter and realtime config.
 * Tables without this provider fall back to MemoryAdapter and "auto-apply".
 */
import React, { createContext, useContext, useMemo } from "react";
import type { TableStorageAdapter } from "./storage";
import { MemoryAdapter } from "./memory-adapter";

interface TableStorageContextValue {
  adapter: TableStorageAdapter;
  realtimeMode: "auto-apply" | "notify";
}

const TableStorageContext = createContext<TableStorageContextValue>({
  adapter: new MemoryAdapter(),
  realtimeMode: "auto-apply",
});

export interface TableStorageProviderProps {
  adapter: TableStorageAdapter;
  realtimeMode?: "auto-apply" | "notify";
  children: React.ReactNode;
}

export function TableStorageProvider({
  adapter,
  realtimeMode = "auto-apply",
  children,
}: TableStorageProviderProps) {
  const value = useMemo(
    () => ({ adapter, realtimeMode }),
    [adapter, realtimeMode],
  );
  return (
    <TableStorageContext.Provider value={value}>
      {children}
    </TableStorageContext.Provider>
  );
}

export function useTableStorageAdapter(): TableStorageAdapter {
  return useContext(TableStorageContext).adapter;
}

export function useTableRealtimeMode(): "auto-apply" | "notify" {
  return useContext(TableStorageContext).realtimeMode;
}
