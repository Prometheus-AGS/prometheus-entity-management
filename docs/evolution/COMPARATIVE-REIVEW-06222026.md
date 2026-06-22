# Comprehensive Comparative Review: @prometheus-ags/prometheus-entity-management vs. TanStack Query, Apollo Client, and RTK Query

**Report Date:** 2026-06-22  
**Analyst:** Kimi Work  
**Scope:** Feature-set comparison, architectural analysis, and strategic positioning of `@prometheus-ags/prometheus-entity-management` against the three dominant server-state libraries in the React ecosystem.

---

## 1. Executive Summary

`@prometheus-ags/prometheus-entity-management` (hereafter **"PEM"**) is not a direct competitor to TanStack Query, Apollo Client, or RTK Query in the traditional sense. While those libraries are **server-state cache managers**, PEM is a **normalized entity graph** built on Zustand that solves a different—but overlapping—problem: **cross-view reactivity** through a single, application-wide entity store.

**The key differentiator:** TanStack Query, Apollo, and RTK Query each maintain query-bound cache entries. When ten components fetch the same user, they all cache separate copies. PEM stores that user once in a normalized graph, and every list, detail view, and sidebar widget reads the same canonical record. Updating the user in one place immediately updates every view.

This report outlines:
- Where PEM is **more advanced** (normalized graph, local-first runtime, hybrid views, CRUD lifecycle, time-travel devtools, AI interop)
- Where the **established libraries are stronger** (ecosystem maturity, community size, framework portability, battle-tested edge cases)
- The **architectural gaps** PEM still has to close to be a standalone replacement for general-purpose data fetching

---

## 2. The Competitors: Framework Overview (2026)

### 2.1 TanStack Query v5 (formerly React Query)

The de facto standard for server-state management in React. ~10M weekly downloads. ~13 KB gzip.

**Core Model:** Query-key-driven cache. Each `useQuery({ queryKey, queryFn })` creates a cache entry keyed by the serialized query key. Data is stored per-query, not normalized per-entity. Cross-query synchronization is handled by cache invalidation (`invalidateQueries`), manual cache updates (`setQueryData`), or optimistic updates.

**Key Strengths:**
- First-class infinite queries with `useInfiniteQuery` (`maxPages`, `initialPageParam`, `getNextPageParam`)
- Dedicated Suspense hooks (`useSuspenseQuery`, `useSuspenseInfiniteQuery`) with non-nullable data types
- Stable APIs, massive community, deep framework adapters (React, Vue, Solid, Svelte, Angular, Lit)
- Excellent DevTools with cache inspection, query timeline, and manual invalidation
- Query prefetching, placeholder data, `keepPreviousData` for pagination UX
- Experimental persister (`experimental_createPersister`) for offline/cache persistence
- Strong type inference with `queryOptions` helper for type-safe prop drilling

**Limitations:**
- No built-in normalized entity store (queries cache data by key, not by entity ID)
- No built-in local-first / offline-first architecture (plugins exist but are experimental)
- No built-in CRUD form scaffolding, table engine, or view layer
- No built-in realtime adapter system (users wire WebSocket/SSE manually)
- Optimistic updates require manual `setQueryData` calls with rollback logic

### 2.2 Apollo Client v3

The GraphQL-native standard. ~2M weekly downloads. Tightly coupled to GraphQL but has first-class normalized caching.

**Core Model:** Normalized in-memory cache (`InMemoryCache`) with `typePolicies` and `keyArgs`. This is the closest architectural peer to PEM's entity graph. Apollo's cache is entity-aware: it stores objects by `__typename + id` and can update every query referencing that object automatically.

**Key Strengths:**
- True normalized caching (entity-level, not query-level)
- Automatic cache updates when mutations return entity shapes
- `optimisticResponse` for optimistic updates with automatic rollback
- `fetchMore` for pagination; `@connection` directive for list pagination
- `apollo3-cache-persist` for offline persistence
- Excellent TypeScript codegen from GraphQL schemas
- Mature ecosystem, extensive tooling, strong enterprise adoption

**Limitations:**
- GraphQL-only (does not natively support REST without a wrapper like `graphql-let` or schema stitching)
- Normalized cache is complex to configure (`typePolicies`, `merge` functions, `keyArgs`)
- No built-in table engine, CRUD scaffolding, or view layer
- No built-in local-first / ElectricSQL / PGlite integration
- Offline support is addon-based, not core
- Bundle size is larger than TanStack Query (~30KB+ with cache)

### 2.3 RTK Query (Redux Toolkit)

Redux's official data-fetching layer. ~1M weekly downloads. Bundled with Redux Toolkit (~24KB total with RTK).

**Core Model:** `createApi` defines endpoints declaratively. Data is stored in the Redux store as query cache entries. Cache invalidation is tag-based (`providesTags` / `invalidatesTags`). Because it's Redux-backed, data is accessible from middleware, thunks, and DevTools.

**Key Strengths:**
- Tag-based cache invalidation is elegant and automatic
- `updateQueryData` for manual cache manipulation with Immer-powered drafts
- `onQueryStarted` for optimistic updates with `patchResult.undo()` rollback
- OpenAPI codegen (`@rtk-query/codegen-openapi`) generates typed endpoints from specs
- Redux DevTools integration (action history, state inspection, time-travel)
- UI-agnostic (works outside React via Redux)
- Polling, streaming cache updates (WebSocket), parallel/dependent queries

**Limitations:**
- Query-level caching, not entity-level normalization (Apollo is closer to PEM here)
- Requires Redux store (significant overhead if you don't already use Redux)
- No built-in normalized entity graph (data is stored per endpoint + args)
- No built-in table engine, CRUD scaffolding, or view layer
- No native local-first / offline-first architecture
- No dedicated Suspense support

---

## 3. Architecture Comparison

### 3.1 Cache Model: The Fundamental Divide

| Dimension | PEM | TanStack Query | Apollo Client | RTK Query |
|---|---|---|---|---|
| **Cache Granularity** | Entity-level (normalized graph: `entities[type][id]`) | Query-level (serialized `queryKey` → data) | Entity-level (normalized `InMemoryCache`) | Query-level (endpoint + serialized args) |
| **Cross-Query Reactivity** | Automatic: updating one entity updates all views | Manual: `invalidateQueries` or `setQueryData` | Automatic for normalized fields | Manual: `invalidatesTags` triggers refetch |
| **List Storage** | ID arrays only (`lists[key].ids`) | Full data arrays per query | Normalized with `keyArgs`/`typePolicies` | Full data arrays per cache entry |
| **UI-Only Overlay** | `patches` layer (merged at read-time) | `placeholderData` or manual `setQueryData` | Not built-in (custom client state) | Redux slice for UI state |
| **Sync Metadata** | `syncMetadata` (`$synced`, `$origin`, `$updatedAt`) | `dataUpdatedAt`, `isStale` | `__typename` + cache fields | Not built-in |

**Analysis:** PEM and Apollo are the only two with true entity-level normalization. TanStack Query and RTK Query are query-level caches. This is the single most important architectural distinction. PEM's normalized graph means:
- A GraphQL mutation updating `Post:123` immediately reflects in a REST `useEntity("Post", "123")` subscriber
- A realtime WebSocket update to a user updates every list, detail panel, and sidebar widget without manual invalidation
- Lists store only IDs, so adding/removing a field to an entity doesn't require updating every list cache entry

However, TanStack Query's query-level model is simpler for many apps. You don't need to think about entity types, IDs, or normalization. If your app has few overlapping data views, query-level caching is sufficient and less conceptual overhead.

### 3.2 Data Flow Architecture

| Layer | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| **Components** | Read from hooks only (enforced) | Read from hooks | Read from hooks (`useQuery`) | Read from hooks |
| **Hooks** | Orchestrate store subscriptions + fetch triggers | Own fetch lifecycle + cache reads | Own fetch lifecycle + cache reads | Dispatch Redux actions |
| **Store** | Zustand entity graph | Internal `QueryCache` (Map) | `InMemoryCache` (normalized) | Redux store |
| **External I/O** | Stores/adapters handle REST, GraphQL, WebSocket, Supabase RT, ElectricSQL, PGlite, Flint, Surreal | `queryFn` (user-provided fetcher) | GraphQL network layer + links | `baseQuery` (user-provided fetcher) |

PEM enforces a strict three-layer architecture: **Components → Hooks → Stores → APIs**. This is a design choice that prevents the "data silo" problem. TanStack Query is more flexible (you can call `queryClient.fetchQuery` imperatively), but that flexibility means it's easier to bypass the reactive layer.

---

## 4. Feature-by-Feature Comparison

### 4.1 Core Data Fetching

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| `useQuery` equivalent | `useEntity` / `useEntities` / `useEntityQuery` | `useQuery` | `useQuery` | `useGetXQuery` |
| `useInfiniteQuery` equivalent | `useEntityList` (append mode) / `useEntityQuery` with `fetchNextPage` | `useInfiniteQuery` (first-class) | `fetchMore` + `updateQuery` | Manual pagination or `useInfiniteQuery` (if using) |
| Suspense support | `useSuspenseEntity`, `useSuspenseEntityList` | `useSuspenseQuery`, `useSuspenseInfiniteQuery` | `useSuspenseQuery` (Apollo 3.8+) | No dedicated Suspense support |
| Parallel queries | `useQueries` pattern (manual) | `useQueries` (first-class) | Multiple `useQuery` hooks | Multiple `useGetXQuery` hooks |
| Dependent queries | `enabled` flag | `enabled` flag | `skip` flag | `skip` flag |
| Request deduplication | `dedupe()` in engine (process-global Map) | Built-in (same `queryKey`) | Built-in (query dedupe) | Built-in (RTK middleware) |
| Retry logic | Exponential backoff with `maxRetries` | Exponential backoff (configurable) | Link-based (`RetryLink`) | Built-in retry with `retry` config |
| Abort / cancellation | `AbortController` in `useEntities` / `useEntityQuery` | `AbortSignal` (via `queryFn`) | `AbortController` (via `HttpLink`) | `AbortController` (via `fetchBaseQuery`) |
| Typed errors (4xx vs 5xx) | `TerminalError` / `TransientError` | `error` object (no built-in 4xx/5xx distinction) | GraphQL `error` array | `error` object (no built-in 4xx/5xx distinction) |
| SSR / Hydration | `initialIds`, `initialTotal` seeds; no full dehydration API | `HydrationBoundary`, `dehydrate`/`hydrate` | `getDataFromTree`, `renderToStringWithData` | No built-in SSR hydration |

**PEM's advantages:**
- **Typed errors (`TerminalError` vs `TransientError`)** are a genuine innovation. The engine automatically retries `TransientError` (5xx, network) with backoff and immediately surfaces `TerminalError` (4xx, validation) without retry. Neither TanStack Query nor RTK Query makes this distinction natively.
- **2.0 transport registry** (`registerEntityTransport`) is a structural improvement over 1.x's inline `fetch` closures. It centralizes transport logic, prevents the "Quick Stats trap" (each widget reinventing retry loops), and enables pure graph subscriptions without fetchers.

**Where PEM is behind:**
- **No first-class `useQueries` equivalent.** TanStack Query's `useQueries` is elegant for parallel fetching of heterogeneous data. PEM requires manual `useEntity` calls or a custom hook.
- **SSR hydration is weaker.** TanStack Query's `dehydrate`/`hydrate` is battle-tested and handles complex cases (prefetching, serialization, rehydration timing). PEM has `initialIds` seeding but no full dehydration pipeline.
- **No `keepPreviousData` / `placeholderData` for pagination.** TanStack Query's ability to show stale data while fetching the next page is a polished UX pattern that PEM doesn't replicate.

### 4.2 Caching & Normalization

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| Normalized entity cache | **Yes** (`entities[type][id]`) | No (query-level) | **Yes** (`InMemoryCache`) | No (query-level) |
| Automatic entity updates across queries | **Yes** (graph is source of truth) | No (manual `setQueryData` or `invalidateQueries`) | Yes (for normalized fields) | No (tag invalidation triggers refetch) |
| Cache garbage collection | `startGarbageCollector` with `gcTime` | `gcTime` (default 5 min) | `cache.evict()`, `cache.gc()` | `keepUnusedDataFor` (default 60s) |
| Stale-while-revalidate | Yes (default 30s `staleTime`) | Yes (default 0ms `staleTime`) | Yes (`fetchPolicy` dependent) | Yes (polling or manual refetch) |
| Window focus refetch | `revalidateOnFocus` | `refetchOnWindowFocus` | Not automatic (manual) | Not automatic (manual/polling) |
| Reconnect refetch | `revalidateOnReconnect` | `refetchOnReconnect` | Not automatic | Not automatic |
| Subscriber ref-counting | `registerSubscriber` / `unregisterSubscriber` | Built-in (observer count) | Built-in (watcher count) | Built-in (subscription count via Redux) |
| Background revalidation skips unobserved | Yes (via `hasSubscribers`) | Yes (gc triggers when no observers) | Yes (cache gc) | Yes (RTK cache cleanup) |

**PEM's advantages:**
- The **entity graph** is the architectural crown jewel. When a realtime adapter pushes a `ChangeSet` into the graph, every hook reading that entity type re-renders automatically. No manual invalidation. No hunting query keys. This is a fundamentally different—and often superior—model for apps with complex, interrelated data.
- **Snapshot cache** (`snapshotCache`) in `readEntitySnapshot` prevents React 19 `useSyncExternalStore` infinite loops by caching merged entity + patch + sync metadata per reference identity.

**Where PEM is behind:**
- **No cache persistence to `localStorage`/`IndexedDB` as a core feature.** TanStack Query has `persistQueryClient` (experimental but widely used). Apollo has `apollo3-cache-persist`. PEM has `startLocalFirstGraph` with `GraphPersistenceAdapter`, but it's an opt-in local-first runtime, not a simple cache persister.
- **No fine-grained cache eviction by query key.** TanStack Query's `queryClient.removeQueries` is precise. PEM's `invalidateLists` works by prefix or predicate, but removing specific list cache entries requires manual `delete` operations on the Zustand store.

### 4.3 Mutations & Optimistic Updates

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| Mutation hook | `useEntityMutation` | `useMutation` | `useMutation` | `useXMutation` |
| Optimistic updates | `optimistic` callback + `patchEntity` | `onMutate` + `setQueryData` + manual rollback | `optimisticResponse` (automatic rollback) | `onQueryStarted` + `updateQueryData` + `patchResult.undo()` |
| Rollback on error | Built-in (previous patch restored) | Manual in `onError` | Automatic (discards optimistic layer) | `patchResult.undo()` |
| Cache invalidation after mutation | `invalidateLists` / `invalidateEntities` | `invalidateQueries` / `setQueryData` | Automatic (normalized cache updates) or `refetchQueries` | `invalidatesTags` (automatic) |
| Cascade invalidation | `cascadeInvalidation` with schema registry | Manual (developer decides) | Automatic (normalized cache) | Tag-based (automatic) |
| Mutation state | `isPending`, `isSuccess`, `isError` | `isPending`, `isSuccess`, `isError`, `isIdle` | `loading`, `error`, `data` | `isLoading`, `isSuccess`, `isError` |
| Transaction support | `createGraphTransaction` (commit/rollback) | No (manual via multiple `setQueryData`) | No | No (but Redux actions are atomic) |
| Graph actions (replayable) | `createGraphAction` with enqueued/settled events | No | No | No |

**PEM's advantages:**
- **`cascadeInvalidation`** with a schema registry is powerful and unique. You register relation schemas (`belongsTo`, `hasMany`, `manyToMany`) once, and after any mutation, PEM automatically traverses forward and reverse relations to mark stale lists and entities. Neither TanStack Query nor RTK Query has this level of automatic relational invalidation.
- **`createGraphTransaction`** provides a fluent, chainable API for batching graph mutations with atomic commit/rollback. This is absent from all three competitors.
- **`createGraphAction`** supports replayable, offline-queueable actions with `GraphActionRecord` tracking—useful for local-first architectures.

**Where PEM is behind:**
- **TanStack Query's mutation lifecycle is more mature.** `onMutate` → `onError` → `onSettled` with context passing is a well-understood pattern. PEM's `useEntityMutation` has `onSuccess`/`onError` but no `onSettled` equivalent.
- **Apollo's `optimisticResponse` is more ergonomic.** It uses the GraphQL response shape, requires no manual cache manipulation, and rolls back automatically. PEM's optimistic updates require the developer to construct `patchEntity` calls and manage `syncMetadata` manually.
- **RTK Query's `invalidatesTags` is more automatic.** Once tags are declared, mutations invalidate queries without any imperative code. PEM's `cascadeInvalidation` requires registering schemas upfront, which is more work but more precise.

### 4.4 Realtime & Sync

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| Realtime adapter system | **Yes** (WebSocket, Supabase RT, Convex, GraphQL-WS, ElectricSQL, PGlite, Flint, Surreal) | No (manual `queryClient.invalidateQueries` in socket handler) | `GraphQL-WS` subscriptions | `createApi` with `eventSource` or WebSocket streaming |
| Realtime manager (coalescing) | **Yes** (`RealtimeManager` with 16ms flush window) | No | No | No |
| ChangeSet normalization | **Yes** (`ChangeSet` → `EntityChange` → graph write) | No (manual) | No (subscription data is query-specific) | No (streaming cache updates are manual) |
| Binary sorted insertion for realtime | **Yes** (`findInsertionIndex`) | No | No | No |
| Local-first / offline-first | **Yes** (`startLocalFirstGraph`, `hydrateGraphFromStorage`, `persistGraphToStorage`) | Experimental (`persistQueryClient`) | `apollo3-cache-persist` (addon) | No built-in |
| ElectricSQL + PGlite adapter | **Yes** (`createElectricAdapter`) | No | No | No |
| Tenant-scoped sync | **Yes** (`createTenantScopedElectricAdapter`) | No | No | No |
| Tauri SQLite persistence | **Yes** (`createTauriSqlPersistenceAdapter`) | No | No | No |
| Sync status tracking | **Yes** (`useGraphSyncStatus`) | No | No | No |
| Offline action replay | **Yes** (`replayActionWithRetry` with backoff + poison handling) | No | No | No |

**PEM's advantages:**
- This is PEM's **biggest differentiator**. The realtime adapter ecosystem is comprehensive and purpose-built. No other library in this comparison ships with adapters for Supabase Realtime, Convex, ElectricSQL, PGlite, Flint Realtime Fabric, and SurrealDB out of the box.
- The **16ms coalescing flush window** in `RealtimeManager` is a genuine performance optimization. Rapid-fire updates (e.g., from Supabase Realtime) collapse into a single Zustand write and React render cycle. Without this, realtime apps thrash.
- **Local-first runtime** (`startLocalFirstGraph`) with hydration, persistence, offline status, and action replay is a core feature, not an addon. This positions PEM as a local-first architecture foundation, not just a data fetcher.
- **Binary sorted insertion** (`findInsertionIndex`) for realtime updates means incoming entities land in the correct sorted position in a list without a full re-sort—O(log n) vs O(n log n).

**Where PEM is behind:**
- **TanStack Query's realtime story is "bring your own socket,"** but its community has mature patterns (e.g., `@supabase-cache-helpers`). For many apps, a simple `useEffect` with a WebSocket + `queryClient.invalidateQueries` is sufficient. PEM's adapter system is overkill for simple polling needs.
- **Apollo's `subscribeToMore` with `updateQuery` is battle-tested** for GraphQL subscriptions. PEM's GraphQL subscription support (`useGQLSubscription`, `GQLClient.subscribe`) is functional but less mature than Apollo's.

### 4.5 View Layer: Filtering, Sorting, Searching

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| Declarative filter spec | **Yes** (`FilterSpec` with `FilterClause`, `FilterGroup`) | No (query key is the filter) | No (GraphQL variables are the filter) | No (endpoint args are the filter) |
| Local JS filter engine | **Yes** (`matchesFilter`, `matchesSearch`, `applyView`) | No (data is whatever the query returned) | No (Apollo cache handles it) | No (Redux selectors handle it) |
| Completeness modes (local/remote/hybrid) | **Yes** (`useEntityView` / `useEntityQuery`) | No (all data is from the server) | No | No |
| Remote filter compilation | **Yes** (`toRestParams`, `toGraphQLVariables`, `toSQLClauses`, `toPrismaWhere`) | No (fetcher handles it) | No (GraphQL variables) | No (fetcher handles it) |
| Debounced remote fetch | **Yes** (`remoteDebounce` in `useEntityView`) | No (manual) | No (manual) | No (manual) |
| Realtime sorted insertion | **Yes** (`findInsertionIndex` with binary search) | No | No | No |
| Custom predicates | **Yes** (`custom` operator with JS predicate) | No | No | No |
| Search with minChars | **Yes** (`search.minChars`) | No (manual) | No (manual) | No (manual) |

**PEM's advantages:**
- The **completeness mode** concept (`local`, `remote`, `hybrid`) is genuinely novel. If all data is already in the graph, filtering and sorting happen in JavaScript with zero network. If data is incomplete, the same `FilterSpec` compiles to remote query params. In hybrid mode, local results render immediately while a remote fetch runs in parallel. No other library has this concept.
- The **transport-agnostic `FilterSpec`** can compile to REST params, GraphQL variables, SQL `WHERE` clauses, Prisma `where`, or local JS predicates. This is powerful for apps that need to switch backends or support multiple transport layers.

**Where PEM is behind:**
- **TanStack Query's `queryKey` is simpler.** `["tasks", { status: "open", sort: "dueAt" }]` is immediately intuitive. PEM's `FilterSpec` is more powerful but has a learning curve.
- **No built-in faceted filtering** (min/max values, unique value counts per column). TanStack Table has `getFacetedMinMaxValues`, `getFacetedUniqueValues`. PEM has `getFacetedRowModel` in the pure table engine but it's not wired to the entity graph.

### 4.6 CRUD & Forms

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| Batteries-included CRUD hook | **Yes** (`useEntityCRUD`) | No | No | No |
| Edit buffer isolation | **Yes** (`editBuffer` in React state, not graph) | No (manual `useState`) | No (manual `useState`) | No (manual `useState`) |
| Dirty field tracking | **Yes** (`DirtyFields` with `collectDirtyPaths`) | No | No | No |
| Optimistic create with temp ID | **Yes** (`__temp__` ID + replacement) | Manual | Manual (`optimisticResponse`) | Manual |
| Cascade invalidation on save | **Yes** (`cascadeInvalidation` with schema) | Manual | Automatic (normalized cache) | Automatic (`invalidatesTags`) |
| Relation joins | **Yes** (`readRelations` with schema registry) | No | No (GraphQL handles this) | No |
| Form sheets (detail/form) | **Yes** (`EntityDetailSheet`, `EntityFormSheet`) | No | No | No |
| Inline cell editing | **Yes** (`InlineCellEditor`) | No | No | No |

**PEM's advantages:**
- **`useEntityCRUD`** is a full CRUD lifecycle hook: list view, detail fetch, selection, edit buffer, create buffer, save with rollback, delete with undo, optimistic create, and `applyOptimistic` for instant toggles. None of the comparison libraries have anything like this. You would build it yourself with `useState` + `useMutation` + `useQuery` + manual invalidation.
- **Edit buffer isolation** is a subtle but important design decision. While editing, other views continue showing the original server data. The graph only updates after `save()` succeeds. This prevents half-edited data from appearing in unrelated components.
- **Relation join resolution** (`readRelations`) with schema registry means a detail panel can automatically resolve `belongsTo`, `hasMany`, and `manyToMany` relations from the graph without additional queries.

**Where PEM is behind:**
- **TanStack Form exists.** If you need a headless form library, TanStack Form (10KB) is purpose-built and more powerful than PEM's form scaffolding. PEM's sheets are convenient but not as feature-rich as a dedicated form library.
- **The CRUD hook is opinionated.** It assumes a specific UI pattern (list → detail → edit/create). If your app has non-standard CRUD flows, PEM's `useEntityCRUD` may fight you.

### 4.7 Table Engine

| Feature | PEM (Pure Table) | TanStack Table | Apollo | RTK Query |
|---|---|---|---|---|
| Headless table engine | **Yes** (`useTable`) | **Yes** (`@tanstack/react-table`) | No | No |
| Sorting | Yes | Yes | No | No |
| Filtering | Yes | Yes | No | No |
| Pagination | Yes | Yes | No | No |
| Row selection | Yes | Yes | No | No |
| Column visibility | Yes | Yes | No | No |
| Column ordering | Yes | Yes | No | No |
| Column pinning | Yes | Yes | No | No |
| Column resizing | Yes | Yes | No | No |
| Grouping | Yes | Yes | No | No |
| Expanding | Yes | Yes | No | No |
| Faceting | Yes | Yes | No | No |
| Multi-view (table/gallery/list) | **Yes** (`EntityListView`, `GalleryView`, `ListView`) | No | No | No |
| Preset system (filter/column) | **Yes** (`PresetStore`, `MemoryAdapter`, `ZustandPersistAdapter`, `RestApiAdapter`) | No (community plugins) | No | No |
| Selection store | **Yes** (`SelectionContext`) | Yes | No | No |
| TanStack Table integration | Yes (`useEntityListAsTable`) | N/A | No | No |

**PEM's advantages:**
- PEM ships a **pure, dependency-free table engine** that is structurally compatible with TanStack Table v8. This is remarkable for a library that also does data fetching. The table engine supports all major features: sorting, filtering, pagination, selection, visibility, ordering, pinning, resizing, grouping, expanding, and faceting.
- **Multi-view system** (`table`, `gallery`, `list`) with `ViewModeSwitcher` is a unique feature. No other library in this comparison provides a built-in gallery or list view mode.
- **Preset system** with pluggable storage adapters (`MemoryAdapter`, `ZustandPersistAdapter`, `RestApiAdapter`, `SupabasePresetAdapter`, `ElectricSQLPresetAdapter`) allows saving/loading filter presets and column presets. This is enterprise-grade table UX that TanStack Table doesn't provide out of the box.

**Where PEM is behind:**
- **TanStack Table v8 is more mature.** It has years of production use, community plugins, and edge-case handling. PEM's pure table engine is impressive but likely has undiscovered edge cases.
- **Virtualization is missing.** TanStack Table pairs with `TanStack Virtual` for large datasets. PEM has no virtualization solution.
- **Column resizing interaction is stubbed.** Looking at `useTable.ts`, `getResizeHandler` returns a no-op: `return (_event: unknown) => { // Column resize handling }`. This suggests the table engine's resizing is not fully implemented.

### 4.8 DevTools & Debugging

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| DevTools panel | **Yes** (`EntityExplorerPanel`, `EntityExplorerFAB`) | **Yes** (standalone tab) | **Yes** (Apollo DevTools browser extension) | **Yes** (Redux DevTools) |
| Event stream | **Yes** (`subscribeDevtoolsEvent`, `DevtoolsEventBus`) | Query events in DevTools | Mutation/query events | Redux actions |
| Time-travel (rewind live graph) | **Yes** (`restoreGraphSnapshot`, `stepTimeTravel`) | No | No | **Yes** (Redux DevTools time-travel) |
| Subscriber count inspection | **Yes** (`getActiveSubscriberCount`) | Yes (observer count) | Yes (watcher count) | Yes (via Redux) |
| Graph export | **Yes** (`exportGraphSnapshot`) | No (manual cache read) | No (manual cache read) | No (manual store read) |
| Schema introspection | **Yes** (`getEntityJsonSchema`) | No | No | No |
| Lint rules | **Yes** (`prometheusEntityLayeringRule`) | No | No | No |

**PEM's advantages:**
- **True time-travel** (`recordGraphSnapshot` → `restoreGraphSnapshot`) is a genuine capability. Unlike Redux DevTools time-travel (which rewinds actions), PEM captures the entire graph state at a point in time and can restore the live Zustand store to that state. This is more powerful for debugging entity-level bugs.
- **Devtools event bus** (`subscribeDevtoolsEvent`) provides a real-time push stream of graph mutations, enabling live-updating explorer panels without polling.
- **Lint rule** (`prometheusEntityLayeringRule`) enforces the `Component → Hook → Store` architecture at build time. This is unique and valuable for preventing architectural drift.

**Where PEM is behind:**
- **TanStack Query DevTools are more polished.** They show query keys, observers, freshness, stale time, and allow manual refetching and invalidation with a click. PEM's Entity Explorer is functional but newer and less mature.
- **Redux DevTools action history** is unbeatable for understanding mutation sequences. PEM's devtools show events but not the causal chain of actions that led to a state.

### 4.9 AI Interop & Schema System

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| JSON Schema registration | **Yes** (`registerEntityJsonSchema`) | No | No | No |
| Schema-driven fields | **Yes** (`buildEntityFieldsFromSchema`) | No | No | No |
| Markdown rendering | **Yes** (`MarkdownFieldRenderer`, `renderMarkdownToHtml`) | No | No | No |
| AI tool context | **Yes** (`createGraphTool`, `createSchemaGraphTool`) | No | No | No |
| Graph snapshot export for LLMs | **Yes** (`exportGraphSnapshotWithSchemas`) | No | No | No |
| SQL-to-schema generation | **Yes** (`registerEntityFromSql`, `parseCreateTable`) | No | No | No |
| Prisma schema integration | **Yes** (`prismaRelationsToSchema`, `toPrismaInclude`) | No | No | No |

**PEM's advantages:**
- The **AI interop layer** (`createGraphTool`, `createSchemaGraphTool`) is forward-looking. It exposes the graph store, query functions, and schema metadata to LLM tool contexts, enabling AI agents to inspect and reason about the entity graph. This is genuinely novel.
- **SQL-to-schema generation** (`registerEntityFromSql`) allows bootstrapping entity schemas from `CREATE TABLE` statements. This is a developer-experience feature no competitor has.

**Where PEM is behind:**
- **Apollo's GraphQL schema introspection is more powerful.** A GraphQL schema is a self-describing API contract. PEM's JSON Schema registration requires manual wiring. Apollo's codegen from GraphQL schemas produces TypeScript types automatically.
- **RTK Query's OpenAPI codegen** (`@rtk-query/codegen-openapi`) generates typed endpoints from API specs. PEM has no equivalent codegen from OpenAPI or PostgREST schemas.

### 4.10 Transport & Backend Agnosticism

| Feature | PEM | TanStack Query | Apollo | RTK Query |
|---|---|---|---|---|
| REST support | **Yes** (native, `makeRestTransport`) | **Yes** (via `queryFn`) | Via wrapper | **Yes** (via `baseQuery`) |
| GraphQL support | **Yes** (`GQLClient`, `useGQLEntity`, `useGQLList`, `useGQLMutation`, `useGQLSubscription`) | Via `queryFn` | **Yes** (native) | Via `baseQuery` |
| Supabase/PostgREST | **Yes** (`makeRestTransport` with `SupabaseLike`) | Via `queryFn` | Via wrapper | Via `baseQuery` |
| ElectricSQL + PGlite | **Yes** (`createElectricAdapter`) | No | No | No |
| WebSocket realtime | **Yes** (`createWebSocketAdapter`) | Manual | Via `GraphQL-WS` | Via streaming updates |
| Convex | **Yes** (`createConvexAdapter`) | No | No | No |
| SurrealDB | **Yes** (`createSurrealLiveAdapter`) | No | No | No |
| Flint Realtime Fabric | **Yes** (`createFlintAdapter`) | No | No | No |
| Tauri SQLite | **Yes** (`createTauriSqlPersistenceAdapter`) | No | No | No |
| Tenant-scoped sync | **Yes** (`createTenantScopedElectricAdapter`) | No | No | No |
| Merge strategies (conflict resolution) | **Yes** (`registerMergeStrategy`, `lwwStrategy`, `createLoroMergeStrategy`) | No | No | No |
| Pluggable `identify` | **Yes** (`identify` per transport) | No | No (GraphQL `id` + `__typename`) | No |

**PEM's advantages:**
- **Backend agnosticism is a core design goal.** PEM's architecture explicitly supports REST, GraphQL, WebSocket, Supabase Realtime, Convex, ElectricSQL, PGlite, Flint, SurrealDB, and Tauri SQLite within the same entity graph. This is unmatched.
- **Merge strategies** (`registerMergeStrategy`) allow pluggable conflict resolution. The default is LWW shallow merge, but you can register custom strategies (including a Loro CRDT strategy). This is unique among these libraries.
- **Transport registry** (`registerEntityTransport`) centralizes per-entity-type transport configuration, preventing the "every widget has its own fetcher" anti-pattern.

**Where PEM is behind:**
- **Apollo's GraphQL-first design is more ergonomic for GraphQL apps.** If your entire backend is GraphQL, Apollo's `useQuery`, `useMutation`, and normalized cache are purpose-built. PEM's GraphQL support (`GQLClient`, `normalizeGQLResponse`) is functional but requires more manual configuration (declarative `EntityDescriptor` arrays).
- **TanStack Query's `queryFn` flexibility is simpler.** Any fetcher function works. PEM's 2.0 transport contract requires implementing `identify`, `authoritative`, `list`, and optional `subscribe`. This is more structured but adds boilerplate for simple cases.

---

## 5. Where Each Library Excels: A Summary Matrix

### 5.1 @prometheus-ags/prometheus-entity-management — Unique Strengths

| Capability | Why It Matters |
|---|---|
| **Normalized entity graph** | One entity update propagates to every view automatically. Solves the "query silo" problem. |
| **Cross-transport normalization** | REST, GraphQL, WebSocket, and realtime updates all write to the same graph. A GQL mutation updates REST subscribers. |
| **Local-first / offline-first runtime** | `startLocalFirstGraph` with persistence, hydration, sync status, offline action replay, and poison handling. Core feature, not addon. |
| **Realtime adapter ecosystem** | 8+ adapters (Supabase, Convex, ElectricSQL, PGlite, Flint, Surreal, WebSocket, GraphQL-WS) with coalescing and sorted insertion. |
| **Hybrid view completeness** | Local-only filtering when data is complete; remote when incomplete; hybrid for instant UX. Zero other library has this. |
| **Transport-agnostic `FilterSpec`** | Same filter compiles to REST params, GraphQL variables, SQL WHERE, Prisma where, or JS predicates. |
| **CRUD lifecycle hook** | `useEntityCRUD` provides list, detail, edit buffer, create buffer, optimistic create, rollback, and relation joins. |
| **Schema-driven cascade invalidation** | Register relations once; mutations automatically invalidate affected lists and entities via forward/reverse traversal. |
| **Graph transactions & actions** | `createGraphTransaction` for atomic commit/rollback; `createGraphAction` for replayable, offline-queueable mutations. |
| **Time-travel for live graph** | `restoreGraphSnapshot` reverts the live Zustand store to a historical state, not just action replay. |
| **AI interop** | `createGraphTool` exposes graph state to LLM tool contexts with schema-aware snapshot export. |
| **Pure table engine + multi-view** | Dependency-free table engine with table/gallery/list modes and preset system. |
| **Typed errors (`TerminalError`/`TransientError`)** | Automatic retry for transient failures, immediate surfacing for terminal failures. No competitor has this distinction. |
| **Lint rule for architecture** | `prometheusEntityLayeringRule` enforces `Component → Hook → Store` at build time. |
| **Merge strategies (CRDT support)** | Pluggable conflict resolution including Loro CRDT strategy. |

### 5.2 TanStack Query v5 — Where It Still Wins

| Capability | Why It Matters |
|---|---|
| **Ecosystem maturity** | ~10M weekly downloads. Thousands of Stack Overflow answers, blog posts, and community plugins. |
| **Framework portability** | React, Vue, Solid, Svelte, Angular, Lit adapters. PEM is React-only. |
| **First-class infinite queries** | `useInfiniteQuery` with `maxPages`, `initialPageParam`, `getNextPageParam`, `getPreviousPageParam`. |
| **Dedicated Suspense hooks** | `useSuspenseQuery` / `useSuspenseInfiniteQuery` with guaranteed non-null data types. |
| **Query prefetching** | `queryClient.prefetchQuery` with `staleTime` control. PEM has no equivalent prefetch API. |
| **`keepPreviousData` / `placeholderData`** | Smooth pagination UX without loading spinners. |
| **`useQueries` (parallel heterogeneous)** | Elegant parallel fetching of different entity types. |
| **Dehydration / hydration API** | `dehydrate` / `HydrationBoundary` for SSR with complex prefetching. |
| **DevTools polish** | Mature, feature-rich DevTools with cache inspection, query timeline, and manual invalidation. |
| **Community plugins** | `persistQueryClient`, `@tanstack/query-sync-storage-persister`, `@tanstack/query-broadcast-client-experimental`. |
| **Simpler mental model** | Query key → fetcher → cache. No entity types, IDs, normalization, or schemas to learn. |
| **Bundle size** | ~13 KB gzip vs PEM's significantly larger bundle (exact size depends on features used, but the table engine alone is substantial). |

### 5.3 Apollo Client v3 — Where It Still Wins

| Capability | Why It Matters |
|---|---|
| **GraphQL-native design** | If your backend is GraphQL, Apollo is the ergonomic choice. Schema-aware everything. |
| **Normalized `InMemoryCache`** | True entity-level normalization with automatic cross-query updates. The closest peer to PEM's graph. |
| **`optimisticResponse`** | Most ergonomic optimistic update API: provide expected response shape, Apollo handles cache and rollback. |
| **TypeScript codegen** | Generate types from GraphQL schemas automatically. PEM requires manual JSON Schema registration. |
| **GraphQL subscriptions** | `subscribeToMore` with `updateQuery` is mature and well-documented. |
| **Enterprise adoption** | Strong presence in large organizations. Proven at scale. |
| **Apollo DevTools** | Browser extension with query inspection, cache viewer, and mutation replay. |
| **Cache persistence** | `apollo3-cache-persist` is mature and widely used. |

### 5.4 RTK Query — Where It Still Wins

| Capability | Why It Matters |
|---|---|
| **Tag-based invalidation** | Elegant, automatic cache invalidation without manual query key hunting. `providesTags` / `invalidatesTags`. |
| **Redux ecosystem integration** | Data is in the Redux store: accessible from middleware, thunks, selectors, and DevTools. |
| **OpenAPI codegen** | `@rtk-query/codegen-openapi` generates typed endpoints from OpenAPI specs. Huge productivity win. |
| **Optimistic updates with `patchResult.undo()`** | `updateQueryData` with Immer drafts + automatic rollback on `patchResult.undo()`. |
| **UI-agnostic** | Works outside React (Vanilla JS, Vue, Angular via Redux). PEM is React-only. |
| **Redux DevTools time-travel** | Full action history with state inspection and time-travel debugging. |
| **Streaming cache updates** | Built-in support for WebSocket-based streaming updates to cache entries. |
| **Polling** | `pollingInterval` is a simple, effective built-in feature. |

---

## 6. Architectural Gaps & Trade-offs

### 6.1 What PEM Is Missing (Relative to Mature Libraries)

| Gap | Impact | Mitigation |
|---|---|---|
| **No framework adapters beyond React** | PEM is React-only. Cannot be used in Vue, Svelte, Solid, or Angular. | Use TanStack Query for multi-framework projects. |
| **No virtualization for large lists** | Table engine lacks virtual scrolling. Large datasets will suffer. | Pair with `react-window` or `TanStack Virtual` manually. |
| **Column resizing is stubbed** | `getResizeHandler` in `useTable.ts` is a no-op. | Implement manual resizing or use TanStack Table. |
| **No `useQueries` equivalent** | Parallel heterogeneous fetching requires manual `useEntity` calls. | Build a custom wrapper or use TanStack Query for that case. |
| **SSR dehydration is immature** | `initialIds`/`initialTotal` seeding only; no full `dehydrate`/`hydrate` pipeline. | Use TanStack Query for SSR-heavy apps. |
| **Bundle size is larger** | Table engine, view layer, CRUD hooks, adapters, and devtools add significant weight. | Tree-shake unused features; PEM is modular. |
| **Community size is tiny** | No Stack Overflow tag, few blog posts, no ecosystem plugins. | Risk factor for adoption in large teams. |
| **No native Next.js App Router integration** | No `useServerInsertedHTML` or streaming SSR support. | Use TanStack Query for Next.js App Router. |
| **GraphQL codegen is manual** | Must declare `EntityDescriptor` arrays by hand. | Use Apollo for GraphQL-first projects. |
| **Testing utilities are sparse** | No `renderHook` wrappers, mock transport helpers, or test fixtures. | Build custom test utilities. |
| **No `keepPreviousData` for pagination** | Lists show loading state instead of stale data during refetch. | Could be implemented with `patches` layer. |
| **Preset system column resize is unimplemented** | Column resizing in the pure table engine is not wired to interactions. | Use TanStack Table for advanced column resizing. |

### 6.2 What PEM Does That No Competitor Does

| Innovation | Competitor Equivalent | Why PEM's Approach Is Different |
|---|---|---|
| **Entity graph with patches + sync metadata** | Apollo's `InMemoryCache` (closest) | PEM separates `entities` (canonical), `patches` (UI-only), and `syncMetadata` (provenance). Apollo merges everything into the cache. PEM's separation enables cleaner optimistic updates and UI-only state. |
| **Completeness modes (local/remote/hybrid)** | None | A genuinely novel concept. When data is complete locally, filtering/sorting is instant JS. When incomplete, the same spec compiles to remote params. Hybrid shows local data immediately while fetching remotely. |
| **16ms realtime coalescing** | None | Rapid-fire updates collapse into one Zustand write. Prevents UI thrashing from realtime sources. |
| **Schema-driven cascade invalidation** | RTK Query's `invalidatesTags` (closest) | PEM traverses registered relation schemas to find affected lists automatically. RTK Query requires explicit tag declarations. PEM's approach is more automatic but requires upfront schema registration. |
| **Local-first runtime with action replay** | TanStack Query's `persistQueryClient` (experimental) | PEM's `startLocalFirstGraph` is a full runtime: hydration, persistence, sync status, offline detection, action replay with backoff, and poison handling. Not an addon—a core architecture. |
| **Time-travel for live graph (not actions)** | Redux DevTools time-travel | PEM captures graph state snapshots and can restore the live store to any historical point. Redux time-travel replays actions, which may have different effects if reducers changed. |
| **AI interop with schema-aware export** | None | Purpose-built for LLM tool contexts. Exports graph snapshots with JSON Schema metadata so AI agents can reason about entities. |
| **Transport-agnostic `FilterSpec`** | None | Same declarative filter works across REST, GraphQL, SQL, Prisma, and local JS. No other library abstracts filtering at this level. |
| **Merge strategies (CRDT support)** | None | Pluggable conflict resolution at the entity level, including Loro CRDT. Positions PEM for collaborative editing. |
| **Multi-view mode (table/gallery/list)** | None | TanStack Table is table-only. PEM provides table, gallery card, and list item views with a single data source. |
| **Lint rule for architecture** | None | ESLint rule enforcing `Component → Hook → Store` layering. Prevents architectural drift. |

---

## 7. Strategic Recommendations

### 7.1 When to Choose PEM

Choose `@prometheus-ags/prometheus-entity-management` when:

1. **You need cross-view reactivity.** If updating a user in one place must immediately update 10 other components without manual invalidation, PEM's normalized graph is the right model.
2. **You're building a local-first or offline-capable app.** The `startLocalFirstGraph` runtime with ElectricSQL/PGlite adapters is a genuine architectural foundation, not an afterthought.
3. **You have realtime data from multiple sources.** Supabase Realtime + WebSocket + ElectricSQL shape sync all feeding the same graph? PEM's adapter ecosystem is purpose-built for this.
4. **You need a full CRUD + table + view layer in one package.** `useEntityCRUD` + pure table engine + multi-view mode + preset system provides a lot of value for admin panels and data-heavy apps.
5. **You're building an AI-native application.** The `createGraphTool` / `createSchemaGraphTool` interop and schema-aware export are forward-looking capabilities.
6. **You need transport-agnostic filtering.** If your app must support REST today, GraphQL tomorrow, and SQL directly (via PGlite), PEM's `FilterSpec` is a genuine abstraction.
7. **You want schema-driven data relationships.** Registering `belongsTo`/`hasMany`/`manyToMany` schemas and getting automatic cascade invalidation is powerful for relational data models.

### 7.2 When to Choose TanStack Query Instead

Choose TanStack Query v5 when:

1. **You need framework portability.** React, Vue, Solid, Svelte, Angular—TanStack Query works everywhere.
2. **Your app is simple or medium-complexity.** If you have a few API endpoints and overlapping data views are rare, TanStack Query's query-level caching is simpler and sufficient.
3. **You need SSR with hydration.** Next.js App Router, Remix, or Astro with `dehydrate`/`hydrate` is a solved problem with TanStack Query.
4. **You rely on community plugins and Stack Overflow.** The ecosystem is massive and well-documented.
5. **You need `useInfiniteQuery` with `maxPages` and bi-directional pagination.** TanStack Query's infinite query API is the best in the industry.
6. **Bundle size matters.** At ~13KB gzip, TanStack Query is significantly lighter than PEM.
7. **You want Suspense without manual promise-throwing.** `useSuspenseQuery` with non-null types is a polished DX feature.

### 7.3 When to Choose Apollo Client Instead

Choose Apollo Client v3 when:

1. **Your entire backend is GraphQL.** Apollo is purpose-built for this. Codegen, normalized cache, and `optimisticResponse` are all GraphQL-native.
2. **You need the most mature normalized cache.** Apollo's `InMemoryCache` has been in production for years and handles edge cases PEM likely hasn't encountered yet.
3. **You want automatic cache updates from mutation responses.** GraphQL's typed responses make this straightforward in Apollo.
4. **Enterprise support and stability matter.** Apollo has a commercial offering, extensive documentation, and proven scale.

### 7.4 When to Choose RTK Query Instead

Choose RTK Query when:

1. **You're already using Redux Toolkit.** RTK Query is a natural extension. Don't add a second cache.
2. **You need tag-based cache invalidation.** The `providesTags`/`invalidatesTags` model is elegant and automatic.
3. **You have OpenAPI specs.** `@rtk-query/codegen-openapi` generates typed endpoints from specs, a massive productivity win.
4. **You need Redux DevTools integration.** If your team relies on action history and time-travel debugging, RTK Query fits perfectly.
5. **You need UI-agnostic data fetching.** RTK Query works outside React via Redux actions.

---

## 8. Conclusion

`@prometheus-ags/prometheus-entity-management` is not a drop-in replacement for TanStack Query, Apollo Client, or RTK Query. It is a **different architectural paradigm**: a normalized entity graph with local-first runtime capabilities, rather than a query-bound cache manager.

**PEM is more advanced than all three competitors in:**
- Normalized entity graph with cross-view reactivity
- Local-first / offline-first architecture
- Realtime adapter ecosystem with coalescing
- Hybrid completeness modes for filtering/sorting
- Transport-agnostic filter abstraction
- CRUD lifecycle scaffolding
- Schema-driven cascade invalidation
- Graph transactions and replayable actions
- Time-travel for live graph state
- AI interop and schema-aware export
- Multi-view table engine with presets
- Typed errors (`TerminalError`/`TransientError`)
- Merge strategies including CRDT support

**PEM is behind the mature libraries in:**
- Ecosystem size, community support, and documentation depth
- Framework portability (React-only)
- SSR hydration maturity
- First-class infinite query APIs (`maxPages`, bi-directional)
- Dedicated Suspense hooks with non-null types
- Bundle size efficiency
- GraphQL-native ergonomics (Apollo is better for GraphQL-only)
- OpenAPI codegen (RTK Query has this)
- Table virtualization and column resizing polish
- Testing utilities and developer tooling polish

**The verdict:** For data-heavy, reactive, local-first, or realtime applications—especially those mixing REST, GraphQL, and WebSocket data—PEM offers a genuinely novel and often superior architecture. For general-purpose data fetching in standard React apps, TanStack Query remains the pragmatic default due to its simplicity, maturity, and ecosystem. For GraphQL-only backends, Apollo Client is the ergonomic choice. For Redux-based stacks, RTK Query is the natural fit.

PEM is best understood as a **specialized tool for a specific class of problems** (normalized reactive graphs, local-first architectures, multi-transport realtime apps) rather than a general-purpose replacement for the server-state standard-bearers. Within its domain, it is the most advanced option available. Outside its domain, the established libraries are safer, simpler, and better supported.

---

*Report generated by Kimi Work on 2026-06-22. Analysis based on source code review of `@prometheus-ags/prometheus-entity-management` (src/ directory, ~20+ modules) and web research of TanStack Query v5, Apollo Client v3, and RTK Query as of mid-2026.*
