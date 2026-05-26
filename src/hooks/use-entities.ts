/**
 * `useEntities` — thin 2.0 hook (5-field API).
 *
 * Replaces the `useEntityList(opts)` pattern where each call site carried
 * its own `fetch` closure, query-key shape, and retry logic. Instead:
 *
 *   1. Register a transport once at app boot:
 *      `registerEntityTransport("Invoice", makeRestTransport({ supabase, table: "invoice" }))`
 *
 *   2. Consume anywhere:
 *      `const { items, isLoading, isError, error } = useEntities<Invoice>("Invoice")`
 *
 * - 4xx from transport → `TerminalError`, no retry, `isError: true`, `isLoading: false`
 * - 5xx/network → `TransientError`, up to `maxRetries` with exponential back-off
 * - `enabled: false` → no fetch, `isLoading: false` immediately
 * - SWR: within `staleTime` (from transport or engine default) → cached rows, no refetch
 * - AbortController per fetch; aborted on unmount, key change, or `refetch()`
 * - Transport `subscribe` wired on mount, torn down on unmount
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useStore } from "zustand";
import { useGraphStore, EMPTY_LIST_STATE } from "../graph";
import { serializeKey, getEngineOptions } from "../engine";
import { getEntityTransport } from "../transport/registry";
import { TerminalError, TransientError, toEntityError } from "../errors";
import type { EntityType } from "../graph";
import type { ListQuery } from "../transport/types";
import type { FilterSpec, SortSpec } from "../view/types";

/** Subset of `ListQuery` that callers may pass alongside `enabled`. */
export interface UseEntitiesOptions {
  filter?: FilterSpec | null;
  sort?: SortSpec | null;
  search?: string;
  limit?: number;
  cursor?: string | number | null;
  enabled?: boolean;
}

/** Five-field return — the entirety of what a list consumer needs for the common case. */
export interface UseEntitiesResult<T> {
  /** Resolved entity rows in the graph for this query, in server order. */
  items: T[];
  /** True only while the very first attempt is in-flight with no cached rows yet. */
  isLoading: boolean;
  /** True when the last attempt ended with any error (terminal or transient). */
  isError: boolean;
  /** Typed error instance — `instanceof TerminalError` (4xx) or `instanceof TransientError` (5xx/network). */
  error: TerminalError | TransientError | null;
  /** Manually trigger a fresh fetch (bypasses staleTime). */
  refetch: () => void;
}

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

/**
 * Thin replacement for `useEntityList`.
 * Looks up the registered `EntityTransport<T>` for `type` and drives a
 * Zustand-backed SWR cycle. Returns `{ items, isLoading, isError, error, refetch }`.
 */
export function useEntities<T extends object>(
  type: EntityType,
  options: UseEntitiesOptions = {},
): UseEntitiesResult<T> {
  const {
    filter,
    sort,
    search,
    limit,
    cursor,
    enabled = true,
  } = options;

  // --- stable query key (re-computes only when deps change) ----------------
  const queryKey = useMemo(
    () => serializeKey([type, { filter, sort, search, limit, cursor }]),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [type, JSON.stringify({ filter, sort, search, limit, cursor })],
  );

  // --- abort controller ref (one per in-flight fetch) ----------------------
  const abortRef = useRef<AbortController | null>(null);

  // --- fetch counter to coordinate between effect re-runs ------------------
  const fetchCountRef = useRef(0);

  // --- retrigger state (incremented by refetch()) --------------------------
  const [fetchTick, setFetchTick] = useState(0);

  // --- read list state from graph ------------------------------------------
  const listState = useStore(
    useGraphStore,
    useCallback((s) => s.lists[queryKey] ?? EMPTY_LIST_STATE, [queryKey]),
  );

  // --- resolve entity rows from graph in render ----------------------------
  const items = useMemo((): T[] => {
    const state = useGraphStore.getState();
    return listState.ids
      .map((id) => state.readEntity<T>(type, id))
      .filter((item): item is T => item !== null);
  }, [listState.ids, type]);

  // --- main fetch effect ---------------------------------------------------
  useEffect(() => {
    if (!enabled) return;

    const store = useGraphStore.getState();
    const existing = store.lists[queryKey];
    const engineOpts = getEngineOptions();

    // Respect staleTime: skip if fresh
    let transport: ReturnType<typeof getEntityTransport<T>>;
    try {
      transport = getEntityTransport<T>(type);
    } catch {
      // No transport registered — treat as permanent terminal error
      const err = new TerminalError(`No transport registered for entity type "${type}"`);
      store.setListError(queryKey, err.message, err);
      return;
    }

    const effectiveStaleTime = transport.staleTime ?? engineOpts.defaultStaleTime;
    if (
      existing?.lastFetched !== null &&
      existing?.lastFetched !== undefined &&
      !existing.stale &&
      Date.now() - existing.lastFetched < effectiveStaleTime
    ) {
      return;
    }

    // Abort any previous in-flight request for this key
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const thisCount = ++fetchCountRef.current;

    const query: ListQuery = {
      filter: filter ?? undefined,
      sort: sort ?? undefined,
      search,
      limit,
      cursor: cursor ?? undefined,
      signal: controller.signal,
    };

    const maxRetries = engineOpts.maxRetries ?? 3;
    const retryBaseDelay = engineOpts.retryBaseDelay ?? 1_000;

    store.setListFetching(queryKey, true);

    const attempt = async (retries: number): Promise<void> => {
      try {
        const result = await transport.list(query);

        // Stale check — if a newer effect replaced us, discard
        if (thisCount !== fetchCountRef.current) return;
        if (controller.signal.aborted) return;

        // Upsert rows into graph
        const graphStore = useGraphStore.getState();
        const entries = result.rows.map((row) => ({
          id: transport.identify(row),
          data: row as Record<string, unknown>,
        }));
        graphStore.upsertEntities(type, entries);
        for (const { id } of entries) graphStore.setEntityFetched(type, id);

        const ids = entries.map(({ id }) => id);
        graphStore.setListResult(queryKey, ids, {
          total: result.total,
          nextCursor: typeof result.nextCursor === "string" ? result.nextCursor : null,
          hasNextPage: result.nextCursor !== null && result.nextCursor !== undefined,
        });
      } catch (err) {
        if (thisCount !== fetchCountRef.current) return;
        if (controller.signal.aborted) return;

        const typed = toEntityError(err);

        // Only retry TransientError; TerminalError is non-retriable by definition
        if (typed instanceof TransientError && retries < maxRetries) {
          await sleep(retryBaseDelay * Math.pow(2, retries));
          if (controller.signal.aborted) return;
          return attempt(retries + 1);
        }

        useGraphStore.getState().setListError(queryKey, typed.message, typed);
      }
    };

    attempt(0);

    return () => {
      abortRef.current?.abort();
    };
    // fetchTick is intentionally included to trigger refetch() calls
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey, enabled, fetchTick]);

  // --- subscribe to realtime changes (optional transport capability) --------
  useEffect(() => {
    let transport: ReturnType<typeof getEntityTransport<T>>;
    try { transport = getEntityTransport<T>(type); } catch { return; }
    if (!transport.subscribe || !enabled) return;

    const unsub = transport.subscribe((ev) => {
      const store = useGraphStore.getState();
      if (ev.op === "delete") {
        store.removeIdFromAllLists(type, ev.id);
        store.removeEntity(type, ev.id);
      } else if (ev.row) {
        store.upsertEntity(type, ev.id, ev.row as Record<string, unknown>);
        store.setEntityFetched(type, ev.id);
      }
    });

    return () => unsub();
  }, [type, enabled]);

  // --- refetch (bumps tick, aborts current in-flight) ----------------------
  const refetch = useCallback(() => {
    abortRef.current?.abort();
    // Invalidate the list so the effect re-runs even within staleTime
    useGraphStore.getState().setListStale(queryKey, true);
    setFetchTick((n) => n + 1);
  }, [queryKey]);

  // --- compute final booleans ----------------------------------------------
  const typedError = (listState.lastError as TerminalError | TransientError | null) ?? null;

  return {
    items,
    // isLoading = first attempt in-flight with zero cached rows
    isLoading: !enabled ? false : listState.lastFetched === null && listState.isFetching,
    isError: typedError !== null,
    error: typedError,
    refetch,
  };
}
