# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.2.0] — 2026-04-05

PWA/local-first and schema-driven entity release focused on dynamic JSON-column UI, markdown-aware rendering, and IPC-safe graph persistence.

### Added

- Local-first runtime helpers: `startLocalFirstGraph(...)`, `hydrateGraphFromStorage(...)`, `persistGraphToStorage(...)`, and `useGraphSyncStatus()`.
- Serializable pending graph action records and replay hooks for persisted optimistic workflows.
- JSON Schema registry APIs: `registerEntityJsonSchema(...)`, `registerRuntimeSchema(...)`, `getEntityJsonSchema(...)`, `buildEntityFieldsFromSchema(...)`, and `useSchemaEntityFields(...)`.
- Built-in markdown support with `MarkdownFieldRenderer`, `MarkdownFieldEditor`, and schema-driven `format: "markdown"` field generation.
- Schema-aware AI helpers: `createSchemaGraphTool(...)` and `exportGraphSnapshotWithSchemas(...)`.
- Vitest coverage for persisted graph hydration, pending action replay, schema-driven field generation, runtime schema replacement, and safe markdown rendering.

### Changed

- `EntityFormSheet` and related CRUD state now support dotted field paths for nested JSON-column editing.
- `FieldType` now includes `json` and `markdown`.
- Public docs and API references now describe the local-first runtime and schema/A2UI-oriented dynamic entity surface.

## [1.1.0] — 2026-04-05

Graph-runtime expansion release focused on TanStack DB comparison gaps without changing the library’s core React entity-graph architecture.

### Added

- Graph runtime snapshot helpers: `queryOnce(...)` and `selectGraph(...)`.
- Nested graph projection support via graph-native `include` definitions.
- Explicit optimistic write primitives: `createGraphTransaction(...)` and `createGraphAction(...)`.
- Graph workflow/effect helper: `createGraphEffect(...)`.
- Per-entity sync/provenance metadata exposed through snapshot reads: `$synced`, `$origin`, `$updatedAt`.
- AI interoperability helpers: `createGraphTool(...)` and `exportGraphSnapshot(...)`.
- Vitest coverage for graph runtime querying, actions, rollback, effects, and AI helpers.
- New comparison documentation: `docs/tanstack-comparison.md`.

### Changed

- Core read paths now resolve sync-aware snapshots rather than base-entity-plus-patch merges alone.
- Optimistic mutation and CRUD flows now track sync metadata and restore it correctly on rollback.
- Top-level docs now describe the graph runtime surface and the library’s positioning relative to TanStack DB, Query, Table, AI, and Intent.

## [1.0.0] — 2026-04-04

Production-ready semantic version with CI, tests, documentation, and skills export verification.

### Added

- Vitest smoke tests for `graph`, `engine`, and `RealtimeManager`.
- `pnpm run test`, `refresh:exports`, `verify:skills` scripts; `prepublishOnly` runs typecheck, build, test, and skills verification.
- `skills/_shared/references/library-exports.json` ledger (generated from `dist/index.mjs`) for agent skill ↔ runtime export alignment.
- GitHub Actions workflow: install, typecheck, build, test, verify:skills, typecheck for Vite and Next.js examples.
- Docs: `docs/tanstack-query-and-table.md`, `docs/advanced.md`, `RELEASING.md`; README documentation map and honest bundle-size guidance.
- Vite example route `/tanstack-bridge`: TanStack Query + sync into `upsertEntity`; example READMEs for Vite and Next.js.

### Changed

- README comparison table: bundle size row points to measured guidance instead of a fixed “~15KB” claim.

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
