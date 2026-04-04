# Advanced topics

Concise reference for engine tuning, garbage collection, Suspense, and developer tooling.

## Engine (`configureEngine` / `getEngineOptions`)

- **`defaultStaleTime`** — After this age, subscribed entities are candidates for background refetch (still showing cached data).
- **Retries** — `fetchEntity` / `fetchList` use exponential backoff; tune via engine options where exposed.
- **Global listeners** — Focus and reconnect can mark subscribed entities stale; hooks refetch when appropriate.

## Garbage collection

`startGarbageCollector` / `stopGarbageCollector` (and intervals via `configureEngine`) evict **unsubscribed** entities that exceed retention rules. This is **not** reference-counting GC for JavaScript objects; it is **library-level eviction** of graph nodes to cap memory in long sessions.

**Components** should not call these directly—prefer app bootstrap or a store module.

## Suspense

`useSuspenseEntity` and `useSuspenseEntityList` throw a promise while loading (non-null `id` required where applicable). Use within a React `Suspense` boundary and error boundaries as usual.

## DevTools

`useGraphDevTools` surfaces graph shape and activity in development. There is no separate browser extension DevTools panel (unlike TanStack Query DevTools).

## SSR

See the Next.js example (`GraphHydrationProvider`) for seeding the graph from server-rendered data so the client hydrates without refetch gaps.

## Testing

The library ships **Vitest** smoke tests (`pnpm run test`) covering the graph store, engine behavior, and realtime manager paths. Example apps are validated via `pnpm run typecheck:vite` and `pnpm run typecheck:next`.

## Custom ingress: WebRTC, P2P, or third-party sync

v1 does **not** ship a built-in CRDT or WebRTC transport. If you need peer-to-peer or exotic sync, treat your stack as a **producer of `ChangeSet` events** (see `RealtimeAdapter` in the package) and register it with `RealtimeManager` so updates coalesce into the same entity graph as REST/GraphQL. Community options (Yjs, RxDB replication, Gun, etc.) sit **outside** this library; you bridge events into **`upsertEntity` / `removeEntity`** (or emit change sets) from a **hook or adapter module**, not from raw UI components.
