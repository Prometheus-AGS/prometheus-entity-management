"use client";

import { useRef, useState } from "react";
import {
  RealtimeManager,
  useGraphStoreApi,
  type ManagerOptions,
} from "@prometheus-ags/prometheus-entity-management";

export function useScopedRealtimeManager(options: Omit<ManagerOptions, "store">) {
  const store = useGraphStoreApi();
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [manager] = useState(
    () =>
      new RealtimeManager({
        store,
        flushInterval: options.flushInterval,
        onStatusChange: (...args) => optionsRef.current.onStatusChange?.(...args),
        onChangeReceived: (...args) => optionsRef.current.onChangeReceived?.(...args),
      }),
  );

  return manager;
}
