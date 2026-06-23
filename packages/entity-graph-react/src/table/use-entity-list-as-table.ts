/**
 * table/use-entity-list-as-table.ts
 *
 * Adapter hook that shapes a `useEntityList` result for TanStack Table (or
 * any data-grid that wants a plain `data` array + `rowCount`).
 *
 * It deliberately does NOT bring `@tanstack/react-table` as a dependency.
 * Consumers wire the table; this helper only stabilizes the array reference
 * so the table doesn't re-render unnecessarily, and exposes the same
 * loading/error surface as `useEntityList`.
 *
 * @example
 * ```tsx
 * const tableProps = useEntityListAsTable({
 *   type: "Client",
 *   fetch: (params) => api.listClients(params),
 *   normalize: (raw) => ({ id: raw.id, data: raw }),
 * });
 *
 * const table = useReactTable({
 *   data: tableProps.data,
 *   rowCount: tableProps.rowCount,
 *   columns,
 *   getCoreRowModel: getCoreRowModel(),
 * });
 * ```
 */

import { useMemo, useRef } from "react";
import { useEntityList } from "../hooks";
import type { ListQueryOptions } from "@prometheus-ags/entity-graph-core";
import type { EntityType } from "@prometheus-ags/entity-graph-core";

export interface UseEntityListAsTableOptions<TRaw, TEntity extends object>
  extends Omit<ListQueryOptions<TRaw, TEntity>, "type" | "queryKey"> {
  type: EntityType;
  /** Optional override for the cache key. Defaults to `["entity-list-as-table", type]`. */
  queryKey?: unknown[];
}

export interface UseEntityListAsTableResult<TEntity> {
  data: TEntity[];
  rowCount: number;
  isLoading: boolean;
  isFetching: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Wraps `useEntityList` for table consumers.
 *
 * Returns a referentially-stable `data` array (replaced only when items
 * actually change). TanStack Table treats `data` by identity for memoization,
 * so this is essential to avoid blowing away row state on every render.
 */
export function useEntityListAsTable<TRaw, TEntity extends object>(
  opts: UseEntityListAsTableOptions<TRaw, TEntity>,
): UseEntityListAsTableResult<TEntity> {
  const queryKey = opts.queryKey ?? ["entity-list-as-table", opts.type];
  const list = useEntityList<TRaw, TEntity>({
    ...opts,
    queryKey,
  });

  const lastDataRef = useRef<TEntity[] | null>(null);
  const data = useMemo(() => {
    const prev = lastDataRef.current;
    if (prev && prev.length === list.items.length) {
      let same = true;
      for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== list.items[i]) {
          same = false;
          break;
        }
      }
      if (same) return prev;
    }
    lastDataRef.current = list.items;
    return list.items;
  }, [list.items]);

  return {
    data,
    rowCount: list.total ?? list.ids.length,
    isLoading: list.isLoading,
    isFetching: list.isFetching,
    error: list.error,
    refetch: list.refetch,
  };
}
