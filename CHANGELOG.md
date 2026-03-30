# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.1.0] — 2025-01-15

Initial release.

### Added

**Core graph (`src/graph.ts`)**
- Zustand store with immer middleware for immutable entity mutations
- `entities[type][id]` — normalized entity storage
- `patches[type][id]` — local UI augmentation layer, merged at read time
- `lists[queryKey]` — list state holding ordered ID arrays (refs, not copies)
- `invalidateEntity`, `invalidateLists`, `invalidateType` — stale marking
- `removeIdFromAllLists` — surgical list cleanup on entity delete

**Engine (`src/engine.ts`)**
- In-flight deduplication via process-global `Map<key, Promise>`
- Subscriber ref-counting via `Symbol` tokens
- `fetchEntity` and `fetchList` with exponential backoff retry
- `attachGlobalListeners` for focus/reconnect revalidation
- `configureEngine` for global defaults

**Hooks (`src/hooks.ts`)**
- `useEntity<TRaw, TEntity>` — single entity fetch and subscription
- `useEntityList<TRaw, TEntity>` — list fetch with mode=replace|append
- `useEntityMutation<TInput, TRaw, TEntity>` — optimistic mutations with rollback
- `useEntityAugment<TEntity>` — local UI patches visible to all entity subscribers

**View layer (`src/view/`)**
- `FilterSpec` — transport-agnostic filter description (and/or, 16 operators)
- `SortSpec` — multi-field sort with null handling and custom comparators
- `toRestParams` — FilterSpec → REST query string params
- `toGraphQLVariables` — FilterSpec → Hasura/Postgraphile-style GQL variables
- `toSQLClauses` — FilterSpec → parameterized SQL WHERE + ORDER BY
- `matchesFilter`, `matchesSearch`, `compareEntities` — local JS evaluation
- `findInsertionIndex` — O(log n) binary search for realtime sorted insertion
- `useEntityView` — local/remote/hybrid completeness mode, debounced remote fetch,
  realtime filter evaluation and sorted insertion, `setFilter/setSort/setSearch`

**CRUD lifecycle (`src/crud/`)**
- `registerSchema` / `getSchema` — relation schema registry
- `cascadeInvalidation` — automatic stale marking on mutation, follows FK changes
- `readRelations` — resolve related entities from graph using schema
- `useEntityCRUD` — unified list+detail+edit+create+delete hook
  - Isolated edit buffer (never bleeds to other views until `save()`)
  - Field-level dirty tracking (`dirty.changed: Set<keyof T>`)
  - Optimistic create with temp ID insertion
  - Optimistic delete with rollback on failure
  - `applyOptimistic()` for instant cross-view feedback on toggle/slider fields
  - `cascadeInvalidation` fires automatically after every mutation

**Realtime adapters (`src/adapters/`)**
- `RealtimeAdapter` / `SyncAdapter` interfaces
- `RealtimeManager` — change coalescing (16ms flush window), adapter registry
- `createWebSocketAdapter` — reconnect with exponential backoff, ping/keepalive
- `createSupabaseRealtimeAdapter` — Postgres Changes via logical replication
- `createConvexAdapter` — snapshot diffing for reactive query results
- `createGraphQLSubscriptionAdapter` — graphql-ws protocol
- `createElectricAdapter` — PGlite + ElectricSQL shape sync + NOTIFY listener
- `useLocalFirst` — isSynced state, local query/execute surface
- `usePGliteQuery` — raw SQL → entity graph population

**GraphQL (`src/graphql/`)**
- `GQLClient` — query/mutate/subscribe with `EntityDescriptor` normalization
- `normalizeGQLResponse` — recursive response walker, writes to entity graph
- `createGQLClient` factory
- `useGQLEntity` — mirrors `useEntity` over GraphQL
- `useGQLList` — mirrors `useEntityList` over GraphQL with cursor pagination
- `useGQLMutation` — mirrors `useEntityMutation` over GraphQL
- `useGQLSubscription` — graphql-ws subscription → entity graph updates

**UI layer (`src/ui/`)**
- `selectionColumn`, `textColumn`, `numberColumn`, `dateColumn`, `enumColumn`,
  `booleanColumn`, `actionsColumn` — typed TanStack Table column builders
- `SortHeader` — sort indicator button wired to column sort state
- `EntityTable` — full table component with TanStack Table, inline editing,
  load-more / page pagination, skeleton loading, empty state, toolbar
- `InlineCellEditor` — double-click cell editing with Enter/Escape handling
- `Sheet` — side drawer with backdrop, keyboard dismiss, footer slot
- `EntityDetailSheet` — detail view with edit/delete actions, field rendering,
  delete confirmation dialog
- `EntityFormSheet` — create/edit form with field dirty indicators, error display

**Examples**
- `examples/vite-app` — React 19 + Vite 6, TanStack Router, full CRUD demo
  (Dashboard, Projects, Tasks, Team) with Prometheus AGS mock data
- `examples/nextjs-app` — Next.js 15, Server Component SSR hydration,
  `GraphHydrationProvider`, product catalog with REST API routes

---

## Roadmap

See README.md § Roadmap.
