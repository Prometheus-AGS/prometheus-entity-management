"use client";

/**
 * GraphHydrationProvider
 *
 * Key Next.js SSR pattern for prometheus-entity-management:
 *
 * 1. Server Component fetches initial data (zero client-side loading state)
 * 2. Serialises entities as JSON and passes as `initialEntities` prop
 * 3. This client provider writes them into the Zustand entity graph
 *    synchronously before the first render — so useEntity / useEntityList
 *    hooks see data immediately with no loading flash.
 * 4. Subsequent mutations and realtime updates flow through normally.
 *
 * This is fundamentally different from TanStack Query's dehydrate/hydrate:
 * - There's no per-query cache to serialize — just flat entity maps
 * - Any component anywhere subscribed to these (type, id) pairs gets
 *   the data immediately, not just the component that "owns" the query
 */

import { useRef } from "react";
/**
 * Infrastructure component — direct useGraphStore access is intentional here.
 * This provider bridges SSR-fetched data into the client-side entity graph
 * before any child component renders. It is NOT a UI component and does not
 * violate the "Components never touch stores directly" rule from CLAUDE.md.
 */
import { useGraphStore } from "prometheus-entity-management";

export interface InitialEntity {
  type: string;
  id: string;
  data: Record<string, unknown>;
}

interface GraphHydrationProviderProps {
  initialEntities: InitialEntity[];
  children: React.ReactNode;
}

export function GraphHydrationProvider({
  initialEntities,
  children,
}: GraphHydrationProviderProps) {
  const hydrated = useRef(false);

  // Synchronous hydration on first render — before any child renders
  if (!hydrated.current && initialEntities.length > 0) {
    hydrated.current = true;
    const store = useGraphStore.getState();
    for (const { type, id, data } of initialEntities) {
      store.upsertEntity(type, id, data);
      store.setEntityFetched(type, id);
    }
  }

  return <>{children}</>;
}
