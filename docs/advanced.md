# Advanced topics

Concise reference for engine tuning, garbage collection, Suspense, and developer tooling.

For positioning against TanStack products, see [Detailed comparison with TanStack libraries](./tanstack-comparison.md).

## Engine (`configureEngine` / `getEngineOptions`)

- **`defaultStaleTime`** — After this age, subscribed entities are candidates for background refetch (still showing cached data).
- **Retries** — `fetchEntity` / `fetchList` use exponential backoff; tune via engine options where exposed.
- **Global listeners** — Focus and reconnect can mark subscribed entities stale; hooks refetch when appropriate.

## Garbage collection

`startGarbageCollector` / `stopGarbageCollector` (and intervals via `configureEngine`) evict **unsubscribed** entities that exceed retention rules. This is **not** reference-counting GC for JavaScript objects; it is **library-level eviction** of graph nodes to cap memory in long sessions.

**Components** should not call these directly—prefer app bootstrap or a store module.

## Suspense

`useSuspenseEntity` and `useSuspenseEntityList` throw a promise while loading (non-null `id` required where applicable). Use within a React `Suspense` boundary and error boundaries as usual.

## Graph runtime helpers

The graph now exposes a small set of non-hook runtime helpers for loader, workflow, and orchestration use cases:

- `queryOnce(...)` / `selectGraph(...)` for one-shot graph snapshots without a live subscription
- `createGraphTransaction(...)` / `createGraphAction(...)` for explicit optimistic graph write flows with rollback
- `createGraphEffect(...)` for graph-driven enter/update/exit reactions over arbitrary query results

These helpers are graph-native. They do **not** turn the library into a collection query engine or replace the standard `Component → hook → store` layering for normal UI code.

## Sync metadata

Sync/provenance metadata is stored beside canonical entities and exposed through snapshot reads:

- `$synced` — whether the current row is confirmed or still optimistic/local
- `$origin` — where the latest known state came from (`server`, `client`, `optimistic`)
- `$updatedAt` — metadata timestamp for the latest sync-state change

The canonical entity payload in `entities[type][id]` remains server-shaped data. Sync state lives outside it and is layered in by snapshot helpers.

## AI interoperability

The package intentionally does **not** ship an AI runtime. Instead it provides lightweight graph-facing helpers for AI workflows:

- `exportGraphSnapshot(...)` to serialize graph data for prompts/context building
- `createGraphTool(...)` to build typed helpers around graph reads without taking ownership of chat transport, tool execution, or model adapters
- `exportGraphSnapshotWithSchemas(...)` and `createSchemaGraphTool(...)` for workflows that need graph data plus runtime JSON Schema / A2UI context

## DevTools

`useGraphDevTools` surfaces graph shape and activity in development. There is no separate browser extension DevTools panel (unlike TanStack Query DevTools).

## SSR

See the Next.js example (`GraphHydrationProvider`) for seeding the graph from server-rendered data so the client hydrates without refetch gaps.

## PWA and local-first runtime

For browser/PWA use cases, the package exposes a persistence runtime above the existing ElectricSQL/PGlite adapter:

- `persistGraphToStorage(...)` stores `entities`, `lists`, `syncMetadata`, and pending action metadata through a host-provided storage adapter
- `hydrateGraphFromStorage(...)` restores that snapshot into the graph on startup
- `startLocalFirstGraph(...)` coordinates hydration, persistence, pending action replay, and online/offline phase tracking
- `useGraphSyncStatus()` exposes serializable status (`hydrating`, `syncing`, `ready`, `offline`, `error`) without assuming a browser-only environment

The storage contract is intentionally IPC-friendly so a future Tauri host or plugin can map onto the same JS runtime surface.

### PGlite persistence adapter (v1.3)

`createPGlitePersistenceAdapter(pglite)` returns a `GraphPersistenceAdapter` that stores
the graph snapshot in a PGlite table (`_graph_snapshot` by default), keeping graph state
co-located with synced entity data.

```ts
import { PGlite } from "@electric-sql/pglite";
import {
  startLocalFirstGraph,
  createPGlitePersistenceAdapter,
} from "@prometheus-ags/prometheus-entity-management";

const pglite = await PGlite.create("idb://my-app");
const storage = await createPGlitePersistenceAdapter(pglite);
const runtime = startLocalFirstGraph({ storage, key: "tenant:graph" });
```

### Retry policy for offline action replay (v1.3)

`startLocalFirstGraph` accepts an optional `retryPolicy` for replaying pending offline
actions after reconnect. Exhausted actions go to an optional `poisonHandler` so they
never loop forever.

```ts
startLocalFirstGraph({
  storage,
  key: "tenant:graph",
  retryPolicy: {
    maxAttempts: 5,
    initialDelayMs: 500,
    maxDelayMs: 30_000,
    backoffFactor: 2,
    jitter: "equal",          // "full" | "equal" | "none"
    poisonHandler: (action, error) => {
      console.error("Action replay exhausted", action.id, error);
    },
  },
});
```

### Tenant-scoped Electric adapter (v1.3)

`createTenantScopedElectricAdapter` is a validation gate that prevents attaching an
Electric shape unless it declares a `tenantColumn`. This enforces the invariant that
shape predicates can never widen past server-side RLS.

```ts
import { createTenantScopedElectricAdapter } from "@prometheus-ags/prometheus-entity-management";

createTenantScopedElectricAdapter({
  pglite,
  tenantClaim: { companyId: "uuid-here" },
  tables: [
    { type: "Client", table: "client", tenantColumn: "company_id", shapeStreamFactory: ... },
    // explicit null = table IS the tenant root, filtered by id
    { type: "Company", table: "company", tenantColumn: null, shapeStreamFactory: ... },
    // undefined tenantColumn → throws at registration time (safety gate)
  ],
  onSynced: () => console.log("initial sync complete"),
});
```

## Schema-driven entities and markdown

The package supports entity JSON Schemas alongside relation schemas:

- `registerEntityJsonSchema(...)` / `registerRuntimeSchema(...)` register static or AI-generated schemas
- `buildEntityFieldsFromSchema(...)` and `useSchemaEntityFields(...)` generate dynamic field descriptors for JSON-column-backed entity views and editors
- built-in markdown handling is enabled for string fields marked with `format: "markdown"` or matching schema extensions

This is designed for runtime-generated schemas, JSON metadata columns, and A2UI-style component/view definitions without requiring a separate form engine.

### Schema from SQL (v1.3)

`registerEntityFromSql` generates and registers a JSON Schema directly from a Postgres
`CREATE TABLE` statement. Use this when your canonical schema is in SQL migrations to
avoid maintaining a parallel TypeScript copy.

```ts
import { registerEntityFromSql } from "@prometheus-ags/prometheus-entity-management";

registerEntityFromSql({
  entityType: "Client",
  createTableSql: `
    CREATE TABLE client (
      id         uuid PRIMARY KEY,
      name       text NOT NULL,
      company_id uuid NOT NULL REFERENCES company(id),
      status     text NOT NULL DEFAULT 'active',
      created_at timestamptz NOT NULL DEFAULT now()
    )
  `,
  overrides: {
    // optional: augment generated schema with UI hints not inferrable from DDL
    status: { enum: ["active", "inactive", "prospect"] },
  },
});
```

## Error handling (`isError`, v1.3.2)

Both `useEntityList` and `useEntityView` now return `isError: boolean` as a convenience
alias for `error !== null`, matching TanStack Query's hook ergonomics.

```tsx
const { items, isLoading, isError, error } = useEntityList<Post, Post>({ ... });

if (isError) return <ErrorBanner message={error ?? "Unknown error"} />;
```

Note: there is deliberately no `onError` callback option. Per-query callbacks fire once
per observer, so N components calling the same hook produce N notifications for a single
failure. Read `isError` / `error` from the return value instead and decide your display
strategy at the component level.

## TanStack Table integration (`useEntityListAsTable`, v1.3)

`useEntityListAsTable` wraps `useEntityList` with a referentially-stable `data` array for
TanStack Table. TanStack Table treats `data` by identity for row-model memoization—a
fresh array reference on every render blows away row state (selection, expansion). This
hook prevents that by replacing the array reference only when items actually change.

```tsx
import {
  useEntityListAsTable,
} from "@prometheus-ags/prometheus-entity-management";
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";

function PostsTable() {
  const { data, rowCount, isLoading, isError } = useEntityListAsTable<Post, Post>({
    type: "Post",
    fetch: (p) => api.posts.list(p),
    normalize: (row) => ({ id: row.id, data: row }),
  });

  const table = useReactTable({
    data,
    rowCount,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  if (isLoading) return <Skeleton />;
  if (isError) return <ErrorState />;
  return <DataTable table={table} />;
}
```

The hook does not pull `@tanstack/react-table` as a dependency — `data` and `rowCount`
are plain values that work with any table library.

## Testing

The library ships **Vitest** smoke tests (`pnpm run test`) covering the graph store, engine behavior, and realtime manager paths. Example apps are validated via `pnpm run typecheck:vite` and `pnpm run typecheck:next`.

## Custom ingress: WebRTC, P2P, or third-party sync

v1 does **not** ship a built-in CRDT or WebRTC transport. If you need peer-to-peer or exotic sync, treat your stack as a **producer of `ChangeSet` events** (see `RealtimeAdapter` in the package) and register it with `RealtimeManager` so updates coalesce into the same entity graph as REST/GraphQL. Community options (Yjs, RxDB replication, Gun, etc.) sit **outside** this library; you bridge events into **`upsertEntity` / `removeEntity`** (or emit change sets) from a **hook or adapter module**, not from raw UI components.
