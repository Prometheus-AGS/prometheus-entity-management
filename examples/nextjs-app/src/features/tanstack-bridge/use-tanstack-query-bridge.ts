import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useGraphStore } from "@prometheus-ags/prometheus-entity-management";

export type BridgeDemoPost = { id: string; title: string };

const DEMO_TYPE = "BridgeDemoPost" as const;

async function fetchBridgePost(id: string): Promise<BridgeDemoPost> {
  await new Promise((r) => setTimeout(r, 220));
  return {
    id,
    title: `Fetched by TanStack Query → synced to graph (${id})`,
  };
}

/**
 * TanStack Query owns the request lifecycle; on success we upsert into the entity graph
 * so any `readEntity` / `useEntity` subscriber sees the same row.
 */
export function useTanStackQueryBridgePost(postId: string) {
  return useQuery({
    queryKey: ["tanstack-bridge-demo", postId],
    queryFn: () => fetchBridgePost(postId),
  });
}

/** Writes successful Query results into the graph (hook layer — not a component calling the store). */
export function useSyncQueryResultToGraph(data: BridgeDemoPost | undefined) {
  useEffect(() => {
    if (!data) return;
    useGraphStore.getState().upsertEntity(DEMO_TYPE, data.id, data);
  }, [data]);
}

export function useBridgePostFromGraph(postId: string) {
  return useGraphStore((s) => s.readEntity<BridgeDemoPost>(DEMO_TYPE, postId));
}
