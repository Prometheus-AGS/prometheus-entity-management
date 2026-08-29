import { useCallback, useMemo, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import type { GraphState } from "@prometheus-ags/entity-graph-core";
import {
  getActiveSubscriberCount,
  subscribeSubscriberStats,
} from "@prometheus-ags/entity-graph-core";
import { useGraphStoreApi } from "../graph-store";

function collectGraphDevStats(
  entities: GraphState["entities"],
  patches: GraphState["patches"],
  entityStates: GraphState["entityStates"],
  listsState: GraphState["lists"],
) {
  const entityCounts: Record<string, number> = {};
  let totalEntities = 0;
  for (const type of Object.keys(entities)) {
    const bucket = entities[type];
    if (!bucket) continue;
    const count = Object.keys(bucket).length;
    if (count > 0) entityCounts[type] = count;
    totalEntities += count;
  }

  const listKeys = Object.keys(listsState);
  const patchedEntities: Array<{ type: string; id: string }> = [];
  for (const type of Object.keys(patches)) {
    const bucket = patches[type];
    if (!bucket) continue;
    for (const id of Object.keys(bucket)) {
      const patch = bucket[id];
      if (patch && Object.keys(patch).length > 0) patchedEntities.push({ type, id });
    }
  }

  const staleEntities: Array<{ type: string; id: string }> = [];
  const fetchingEntities: Array<{ type: string; id: string }> = [];
  for (const key of Object.keys(entityStates)) {
    const separator = key.indexOf(":");
    if (separator === -1) continue;
    const entity = { type: key.slice(0, separator), id: key.slice(separator + 1) };
    const state = entityStates[key];
    if (state.stale) staleEntities.push(entity);
    if (state.isFetching) fetchingEntities.push(entity);
  }

  return {
    entityCounts,
    totalEntities,
    listCount: listKeys.length,
    patchedEntities,
    staleEntities,
    fetchingEntities,
    lists: listKeys.map((key) => ({
      key,
      idCount: listsState[key]?.ids.length ?? 0,
      isFetching: Boolean(listsState[key]?.isFetching || listsState[key]?.isFetchingMore),
      isStale: Boolean(listsState[key]?.stale),
    })),
  };
}

function subscriberCountServerSnapshot() {
  return 0;
}

/** Lightweight compatibility hook retained on the normal package root. */
export function useGraphDevTools() {
  const storeApi = useGraphStoreApi();
  const subscribe = useCallback(
    (onChange: () => void) => subscribeSubscriberStats(onChange, storeApi),
    [storeApi],
  );
  const getSubscriberCount = useCallback(
    () => getActiveSubscriberCount(storeApi),
    [storeApi],
  );
  const subscriberCount = useSyncExternalStore(
    subscribe,
    getSubscriberCount,
    subscriberCountServerSnapshot,
  );

  const entities = useStore(storeApi, (state) => state.entities);
  const patches = useStore(storeApi, (state) => state.patches);
  const entityStates = useStore(storeApi, (state) => state.entityStates);
  const listsState = useStore(storeApi, (state) => state.lists);

  const graphPart = useMemo(
    () => collectGraphDevStats(entities, patches, entityStates, listsState),
    [entities, patches, entityStates, listsState],
  );

  return { ...graphPart, subscriberCount };
}
