"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  RealtimeManager,
  useEntity,
  useEntityMutation,
  useGraphStoreApi,
} from "@prometheus-ags/prometheus-entity-management";
import type {
  ChangeSet,
  RealtimeAdapter,
  UnsubscribeFn,
} from "@prometheus-ags/prometheus-entity-management";
import { confirmTaskUpdate } from "./task-actions";
import type { Task } from "@/types";

interface RequestMarker {
  requestId: string;
  preload: string;
}

function createManualRealtimeAdapter(): RealtimeAdapter & {
  emit: (changeSet: ChangeSet) => void;
} {
  const handlers = new Set<(changeSet: ChangeSet) => void>();
  return {
    name: "next-client-takeover",
    subscribe: (_config, handler) => {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    emit: (changeSet) => {
      for (const handler of handlers) handler(changeSet);
    },
  };
}

export function useNextRuntime() {
  const store = useGraphStoreApi();
  const [clientFetchCount, setClientFetchCount] = useState(0);
  const requestQuery = useEntity<RequestMarker, RequestMarker>({
    type: "NextRequest",
    id: "current",
    fetch: async () => {
      setClientFetchCount((count) => count + 1);
      return {
        requestId: "unexpected-client-fetch",
        preload: "client",
      };
    },
    normalize: (marker) => marker,
  });
  const taskQuery = useEntity<Task, Task>({
    type: "Task",
    id: "t1",
    fetch: async () => {
      setClientFetchCount((count) => count + 1);
      const task = store.getState().readEntity<Task>("Task", "t1");
      if (!task) throw new Error("Hydrated task t1 is unavailable");
      return task;
    },
    normalize: (task) => task,
  });
  const [realtimeReady, setRealtimeReady] = useState(false);
  const adapterRef = useRef<ReturnType<typeof createManualRealtimeAdapter> | null>(null);
  const unregisterRef = useRef<UnsubscribeFn | null>(null);

  const mutation = useEntityMutation<
    { status: Task["status"] },
    Task,
    Task
  >({
    type: "Task",
    mutate: async ({ status }) => {
      return confirmTaskUpdate({ id: "t1", status });
    },
    optimistic: ({ status }) => ({ id: "t1", patch: { status } }),
    normalize: (confirmed) => ({ id: confirmed.id, data: confirmed }),
  });

  useEffect(() => {
    const adapter = createManualRealtimeAdapter();
    const manager = new RealtimeManager({ store, flushInterval: 0 });
    adapterRef.current = adapter;
    unregisterRef.current = manager.register(adapter, [{ type: "Task" }]);
    setRealtimeReady(true);
    return () => {
      unregisterRef.current?.();
      unregisterRef.current = null;
      adapterRef.current = null;
    };
  }, [store]);

  const confirmMutation = useCallback(
    () => mutation.trigger({ status: "review" }),
    [mutation],
  );

  const emitRealtime = useCallback(() => {
    adapterRef.current?.emit({
      timestamp: new Date().toISOString(),
      changes: [
        {
          op: "update",
          type: "Task",
          id: "t1",
          patch: { priority: "high", updatedAt: new Date().toISOString() },
        },
      ],
    });
  }, []);

  return {
    request: requestQuery.data,
    task: taskQuery.data,
    clientFetchCount,
    mutation: mutation.state,
    confirmMutation,
    realtimeReady,
    emitRealtime,
  };
}
