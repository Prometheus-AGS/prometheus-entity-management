import { useMemo, useSyncExternalStore } from "react";
import { useStore } from "zustand";
import { useGraphStore, type GraphState } from "@prometheus-ags/entity-graph-core";
import { getActiveSubscriberCount, subscribeSubscriberStats } from "@prometheus-ags/entity-graph-core";

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
    const n = Object.keys(bucket).length;
    if (n > 0) entityCounts[type] = n;
    totalEntities += n;
  }

  const listKeys = Object.keys(listsState);
  const listCount = listKeys.length;

  const patchedEntities: Array<{ type: string; id: string }> = [];
  for (const type of Object.keys(patches)) {
    const bucket = patches[type];
    if (!bucket) continue;
    for (const id of Object.keys(bucket)) {
      const p = bucket[id];
      if (p && Object.keys(p).length > 0) patchedEntities.push({ type, id });
    }
  }

  const staleEntities: Array<{ type: string; id: string }> = [];
  const fetchingEntities: Array<{ type: string; id: string }> = [];
  for (const key of Object.keys(entityStates)) {
    const colon = key.indexOf(":");
    if (colon === -1) continue;
    const type = key.slice(0, colon);
    const id = key.slice(colon + 1);
    const es = entityStates[key];
    if (es.stale) staleEntities.push({ type, id });
    if (es.isFetching) fetchingEntities.push({ type, id });
  }

  const lists = listKeys.map((key) => ({
    key,
    idCount: listsState[key]?.ids.length ?? 0,
    isFetching: Boolean(listsState[key]?.isFetching || listsState[key]?.isFetchingMore),
    isStale: Boolean(listsState[key]?.stale),
  }));

  return {
    entityCounts,
    totalEntities,
    listCount,
    patchedEntities,
    staleEntities,
    fetchingEntities,
    lists,
  };
}

function subscriberCountServerSnapshot() {
  return 0;
}

/**
 * Debug-time snapshot of entity graph health: counts, list queries, patches, staleness,
 * in-flight fetches, and engine subscriber ref-counts.
 *
 * Mount inside a DevTools panel or debug route; subscriber totals update via
 * `useSyncExternalStore` when hooks register/unregister interest, and graph fields
 * update through the Zustand store.
 */
export function useGraphDevTools() {
  const subscriberCount = useSyncExternalStore(
    subscribeSubscriberStats,
    getActiveSubscriberCount,
    subscriberCountServerSnapshot
  );

  const entities = useStore(useGraphStore, (state) => state.entities);
  const patches = useStore(useGraphStore, (state) => state.patches);
  const entityStates = useStore(useGraphStore, (state) => state.entityStates);
  const listsState = useStore(useGraphStore, (state) => state.lists);

  const graphPart = useMemo(
    () => collectGraphDevStats(entities, patches, entityStates, listsState),
    [entities, patches, entityStates, listsState],
  );

  return { ...graphPart, subscriberCount };
}
