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

## DevTools

`useGraphDevTools` surfaces graph shape and activity in development. There is no separate browser extension DevTools panel (unlike TanStack Query DevTools).

## SSR

See the Next.js example (`GraphHydrationProvider`) for seeding the graph from server-rendered data so the client hydrates without refetch gaps.

## Testing

The library ships **Vitest** smoke tests (`pnpm run test`) covering the graph store, engine behavior, and realtime manager paths. Example apps are validated via `pnpm run typecheck:vite` and `pnpm run typecheck:next`.

## Custom ingress: WebRTC, P2P, or third-party sync

v1 does **not** ship a built-in CRDT or WebRTC transport. If you need peer-to-peer or exotic sync, treat your stack as a **producer of `ChangeSet` events** (see `RealtimeAdapter` in the package) and register it with `RealtimeManager` so updates coalesce into the same entity graph as REST/GraphQL. Community options (Yjs, RxDB replication, Gun, etc.) sit **outside** this library; you bridge events into **`upsertEntity` / `removeEntity`** (or emit change sets) from a **hook or adapter module**, not from raw UI components.
