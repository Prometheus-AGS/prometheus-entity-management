"use client";

/**
 * GraphHydrationProvider
 *
 * Key Next.js SSR pattern for prometheus-entity-management:
 *
 * 1. Server Component fetches initial data (zero client-side loading state)
 * 2. Serialises the request-owned graph and passes it as a client prop
 * 3. This client provider creates one isolated Zustand graph from that
 *    snapshot before rendering descendants.
 * 4. Subsequent mutations and realtime updates flow through normally.
 *
 * This is fundamentally different from TanStack Query's dehydrate/hydrate:
 * - There's no per-query cache to serialize — just flat entity maps
 * - Any component anywhere subscribed to these (type, id) pairs gets
 *   the data immediately, not just the component that "owns" the query
 */

import { useState } from "react";
import { GraphStoreProvider } from "@prometheus-ags/prometheus-entity-management";
import {
  hydrateGraphStore,
  type DehydratedGraphSnapshot,
} from "@/features/next-runtime/graph-snapshot";

interface GraphHydrationProviderProps {
  snapshot: DehydratedGraphSnapshot;
  children: React.ReactNode;
}

export function GraphHydrationProvider({
  snapshot,
  children,
}: GraphHydrationProviderProps) {
  const [store] = useState(() => hydrateGraphStore(snapshot));
  return <GraphStoreProvider store={store}>{children}</GraphStoreProvider>;
}
