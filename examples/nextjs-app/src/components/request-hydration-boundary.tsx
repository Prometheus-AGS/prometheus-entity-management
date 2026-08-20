"use client";

/**
 * RequestHydrationBoundary
 *
 * The SSR-safe counterpart to GraphHydrationProvider for request-scoped
 * payloads:
 *
 * 1. Server pass and first client render both render `fallback` — identical
 *    HTML, so hydration cannot mismatch.
 * 2. On mount (client only) the payload is written into the client-owned
 *    entity graph: entities via `upsertEntity` + `setEntityFetched`, list
 *    slots via `setListResult` (which stamps `lastFetched` and clears
 *    `stale`).
 * 3. Only then are graph-reading children mounted, so their staleness
 *    predicates see fresh data inside `staleTime` and never fire a duplicate
 *    fetch for prefetched data.
 *
 * The process-global store is never written on the server; request-scoped
 * data lives in per-request graphs (`createRequestGraph`) until it crosses
 * the RSC boundary as serializable props.
 */

import { useEffect, useRef, useState } from "react";
/**
 * Infrastructure component — direct useGraphStore access is intentional here.
 * This boundary bridges RSC-prefetched data into the client-side entity graph.
 * It is NOT a UI component and does not violate the "Components never touch
 * stores directly" rule from CLAUDE.md.
 */
import { useGraphStore } from "@prometheus-ags/prometheus-entity-management";
import type { HydrationPayload } from "@/lib/hydration-payload";

interface RequestHydrationBoundaryProps {
  payload: HydrationPayload;
  fallback: React.ReactNode;
  children: React.ReactNode;
}

export function RequestHydrationBoundary({
  payload,
  fallback,
  children,
}: RequestHydrationBoundaryProps) {
  const [hydrated, setHydrated] = useState(false);
  const writtenRef = useRef(false);

  useEffect(() => {
    if (writtenRef.current) return;
    writtenRef.current = true;
    const store = useGraphStore.getState();
    for (const { type, id, data } of payload.entities) {
      store.upsertEntity(type, id, data);
      store.setEntityFetched(type, id);
    }
    for (const list of payload.lists) {
      store.setListResult(list.key, list.ids, { total: list.total });
    }
    setHydrated(true);
  }, [payload]);

  return hydrated ? <>{children}</> : <>{fallback}</>;
}
