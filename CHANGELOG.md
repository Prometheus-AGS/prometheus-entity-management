# Changelog

All notable changes to this project are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased] — v2.0 Realtime Fabric Parity

Additive, backward-compatible. Evolves the library toward a best-in-class,
ecosystem-agnostic entity-state layer for realtime + agentic applications. All
new integrations ship as **optional peer dependencies**; the core bundle stays
`zustand + immer`.

### Added

- **Pluggable conflict resolution (CRDT)** — `registerMergeStrategy`,
  `setDefaultMergeStrategy`, `getMergeStrategy`, `hasMergeStrategy`,
  `lwwStrategy` (default, identical to prior shallow-merge), and
  `createLoroMergeStrategy` (optional `loro-crdt` CRDT, lazy-imported). The graph
  write path (`upsertEntity`/`upsertEntities`) routes through the resolved
  strategy. `MergeStrategy` / `MergeContext` types exported.
- **AG-UI agent-state ingestion** — `applyAgUiSnapshot` / `applyAgUiDelta` ingest
  AG-UI `STATE_SNAPSHOT` / `STATE_DELTA` (RFC-6902 JSON Patch) into the entity
  graph via a JSON-Pointer→entity mapping. Includes a dependency-free RFC-6902
  applier (`applyJsonPatch`). `@ag-ui/core` is an optional peer.
- **Flint Realtime Fabric adapter** — `createFlintAdapter` bridges the Flint
  `frf-entity-management` `watchEntities()` stream into the graph via the
  `RealtimeAdapter` contract, with offset↔checkpoint resume; `publishFlintMutation`
  helper. `@prometheusags/frf-sdk` is an optional peer.
- **Tauri SQLite persistence** — `createTauriSqlPersistenceAdapter`, a
  `GraphPersistenceAdapter` over `@tauri-apps/plugin-sql` for desktop local-first
  (pairs with the existing PGlite browser adapter). Optional peer.
- **Time-travel + graph DevTools** — EntityExplorer gains a **Timeline** tab
  (mutation history, changed-field summary, snapshot export/import) and a
  **Graph** tab (SVG relationship visualization from the relations registry).
- **Layering enforcement** — `prometheusEntityLayeringRule`, a copyable ESLint
  flat-config banning direct `useGraphStore`/graph-module imports in components
  (Component → Hook → Store). See `docs/eslint-layering.md`.

### Notes

- Incremental/differential query evaluation (d2ts/TanStack DB) was evaluated and
  **deferred** to a v2.x spike; v2.0 ships a documented scale ceiling +
  virtualization guidance — see `docs/incremental-query-ceiling.md`.

---

## [2.1.0] — 2026-05-31

Additive, fully backward-compatible with 2.0. No API removals. Brings the
v1.3.x local-first work and the new devtools/explorer/realtime surfaces onto
the 2.0 transport-registry baseline.

### Added

- **DevTools event bus** — `createDevtoolsEventBus`, `registerStore`,
  `getRegisteredStores`, plus `subscribeDevtoolsEvent` / `DevtoolsEvent` from
  the engine. A multi-store registry with a push stream and per-operation tap
  for inspecting graph activity. Guarded behind `process.env.NODE_ENV` so it
  tree-shakes out of production builds (enforced by the `check:treeshake` gate).
- **Entity Explorer UI** — `EntityExplorerFAB`, `EntityExplorerPanel`,
  `EntityExplorerProvider`. A drop-in floating inspector (FAB + 4-tab panel)
  for browsing entities, patches, lists, and events at runtime.
- **SurrealDB realtime adapter** — `createSurrealLiveAdapter` (SurrealDB
  `LIVE SELECT`), with `SurrealLike`, `SurrealLiveAction`,
  `SurrealCheckpointStore`, `SurrealTableConfig`, and
  `SurrealLiveAdapterOptions` types.

### Fixed

- **DTS build** — `ListQueryOptions.fetch` / `normalize` are now optional,
  matching the documented 2.0 graph-only usage (Tier-A PGlite/Electric entities
  hydrated out-of-band pass no `fetch`/`normalize`). The type previously lagged
  the runtime behavior, which made `tsup`'s DTS step fail (TS2774) and shipped a
  package with no type declarations. `fetchList()` early-returns on the
  graph-only no-op path.
- Deprecation warning is no longer logged for graph-only `useEntityList` /
  `useEntityView` callers (2.0.1).

### Internal

- Skills exports ledger refreshed to the current public surface (176 exports).

---

## [2.0.0] — 2026-05-25 — BREAKING

### Overview

2.0 eliminates the **"transport leak"** — the 1.x pattern where every
`useEntityView` / `useEntityList` call accepted its own `remoteFetch`,
`normalize`, `queryKey`, `enabled`, and error-handling strategy. Each
call site reinvented the same retry-loop bug in subtly different ways.

The new model: register ONE transport per entity type at app boot.
Every hook thereafter looks it up by name. Error handling, retry policy,
AbortController threading, and SWR staleness are enforced once, in the
library, not at every call site.

### BREAKING CHANGES

#### Removed (runtime-warning shims remain — they log a migration message and continue working)

- `useEntityList(opts)` — inline `fetch`/`normalize` closure form
- `useEntityView(opts)` — inline `remoteFetch`/`normalize` closure form

Both names still export. Calling them logs:
```
[entity-management] useEntityView("Foo") is deprecated in 2.0.
Register a transport: registerEntityTransport("Foo", makeRestTransport(...))
Then replace this call with: useEntityQuery<T>("Foo", { view })
```

TypeScript types remain unchanged — existing consumers compile without
modification. Runtime behavior is identical. The warning is the only
observable change for existing call sites.

#### Migration guide

**Step 1 — Register transports at app boot (once per entity type):**

```ts
import { registerEntityTransport, makeRestTransport } from "@prometheus-ags/prometheus-entity-management";
import { supabase } from "@/shared/db/supabase";

registerEntityTransport("Invoice", makeRestTransport({
  supabase,
  table: "invoice",
  authoritative: false,
}));
```

**Step 2a — Simple lists: replace `useEntityList` with `useEntities`:**

```ts
// BEFORE
const { items, isLoading, error } = useEntityList({
  type: "Invoice",
  queryKey: ["Invoice", companyId],
  fetch: () => supabase.from("invoice").select("*"),
  normalize: (raw) => ({ id: String(raw.id), data: raw }),
  enabled: !!companyId,
});

// AFTER
const { items, isLoading, error } = useEntities<Invoice>("Invoice", {
  filter: { field: "company_id", op: "eq", value: companyId },
  enabled: !!companyId,
});
// error is now TerminalError | TransientError | null (instanceof-checkable)
```

**Step 2b — Rich views with toolbars: replace `useEntityView` with `useEntityQuery`:**

```ts
// BEFORE
const { items, setFilter, setSort } = useEntityView({
  type: "Client",
  baseQueryKey: ["clients", workspaceId],
  view: { filter, sort },
  remoteFetch: (params) => api.clients(params.rest),
  normalize: (raw) => ({ id: raw.id, data: raw }),
});

// AFTER
const { items, setFilter, setSort } = useEntityQuery<Client>("Client", { view: { filter, sort } });
```

### Added

- **`TerminalError`** — 4xx / permanent failures. `instanceof`-checkable.
  `kind: "terminal"`, optional `status: number`.
  Engine does NOT retry on TerminalError.

- **`TransientError`** — 5xx / network failures. `instanceof`-checkable.
  `kind: "transient"`, optional `status: number`.
  Engine retries with exponential backoff (up to `maxRetries`, default 3).

- **`toEntityError(err)`** — Converts unknown thrown values to
  `TerminalError | TransientError`:
  - 4xx status → TerminalError
  - AbortError → TerminalError
  - 5xx / network → TransientError
  - Plain Error → TransientError

- **`EntityTransport<T>` interface** — One implementation per entity type:
  ```ts
  interface EntityTransport<T extends object> {
    identify: (row: T) => string;
    authoritative: boolean;
    staleTime?: number;
    list: (q: ListQuery) => Promise<ListResult<T>>;
    get?: (id: string, signal?: AbortSignal) => Promise<T | null>;
    subscribe?: (onChange: (ev: ChangeEvent<T>) => void) => () => void;
  }
  ```

- **`registerEntityTransport(type, transport)`** — Register at app boot.
  Re-registering replaces (useful in tests).

- **`getEntityTransport<T>(type)`** — Look up registered transport.
  Throws `TerminalError` if not found.

- **`makeRestTransport(opts)`** — PostgREST/Supabase transport builder.
  Maps `ListQuery` → query params, parses `Content-Range` for total,
  maps 4xx → TerminalError, 5xx/network → TransientError, threads signal.

- **`useEntities<T>(type, opts)`** — Thin replacement for `useEntityList`.
  5-field return: `{ items, isLoading, isError, error, refetch }`.
  - `error` is typed `TerminalError | TransientError | null`.
  - `isLoading` is `lastFetched === null && isFetching` — never stuck at true.
  - AbortController per fetch; aborts on unmount/key-change/refetch.
  - 4xx → TerminalError, no retry.
  - 5xx → TransientError, retry with exponential backoff.

- **`useEntityQuery<T>(type, opts)`** — Rich replacement for `useEntityView`.
  Full toolbar API: `setFilter`, `setSort`, `setSearch`, `fetchNextPage`,
  `setView`, `clearView`, `refetch`. Transport looked up from registry
  (no inline closure). `error` is typed.

### Fixed (preserved from 1.3.2)

- `setListError` stamps `lastFetched` — terminal failures no longer cause
  infinite retry loops.
- `useEntityView` writes errors to the base key — closes the Quick Stats
  staleness trap.

---

## [1.3.2] — 2026-05-25

### Fixed

- **`setListError` now stamps `lastFetched` and clears `stale`.**
  Previously, a failed list fetch only set `error` + cleared
  `isFetching` — leaving `lastFetched: null`. Every consumer hook's
  SWR staleness check
  (`Date.now() - (lastFetched ?? 0) > staleTime`) then returned
  `true` on the very next render, refiring the fetcher in an
  infinite loop. A 404 on a missing table (e.g. against a schema
  that hasn't been migrated yet) became a perpetual retry storm.
  After this fix, a terminal failure is treated as a completed
  attempt: consumers see a stable `error` and `isFetching: false`,
  and the fetcher runs once. Manual `refetch()` is still available
  for explicit retries.
- **`useEntityView` writes errors to the BASE key**, not just to
  the remote-result key. The base key is the one
  `isLoading` / `isStale` read from — without this, the staleness
  check kept refiring even after the catch. Combined with the
  `setListError` fix, this closes the terminal-error trap for
  `useEntityView` consumers (Quick Stats, Active Trial Performance,
  Revenue Trend, Recent Activity, etc.).
- **`useEntityView`'s `isLoading` no longer defaults to `true` when
  there is no list state.** The previous `listState?.isFetching ??
  true` was the actual symptom of the trap: when no list state
  existed (because the failed fetch never seeded the base key), the
  `?? true` kept `isLoading` at `true` forever. Changed to `?? false`
  to match `useEntityList`'s symmetric behaviour (it reads
  `EMPTY_LIST_STATE` which has `isFetching: false` by default).

### Added

- **`isError: boolean`** added to both `UseEntityViewResult` and
  `UseEntityListResult`. Convenience for `error !== null`,
  matching TanStack Query's hook ergonomics. Purely additive on
  the return — no breaking API change.

### Notes

- This release does NOT add an `onError` callback option to either
  hook. The decision is deliberate: TanStack Query deprecated
  per-query `onError` callbacks in v5 because they fire per
  observer (calling the same hook from N components produces N
  notifications on a single failure). Consumers should read
  `error` / `isError` from the hook return and decide their own
  display strategy. See
  https://tkdodo.eu/blog/react-query-error-handling for the
  research that drove this decision.

---

## [1.3.1] — 2026-05-25

### Fixed

- **`useEntityList` no longer triggers React 19's "The result of
  getSnapshot should be cached to avoid an infinite loop" warning.**
  The hook's return shape was a fresh object literal on every render,
  which `useSyncExternalStore` (via Zustand's `useStore`) interpreted
  as a changed snapshot. Wrapping the return in `useMemo` keyed on
  `[items, listState, fetchNextPage, doFetch]` stabilises the
  identity. `items` was already identity-stable via the
  `useShallow(itemsSelector)` call on the `useStore` read; this fix
  closes the gap for the outer shape consumers depend on (e.g. hook
  composition chains like `useTeam` → `useQuickStats` → widget).
  See [pmndrs/zustand discussion #1936](https://github.com/pmndrs/zustand/discussions/1936)
  and [React's `useSyncExternalStore` docs](https://react.dev/reference/react/useSyncExternalStore)
  for the contract being honoured.
- Downstream effect: consumers stuck at first commit because of the
  warning-loop guard now hydrate normally, so Tier-A and hybrid list
  views render data on first paint instead of showing perpetual
  loading skeletons.

---

## [1.3.0] — 2026-05-23

Upstream features driven by the `hotseaters-pglite-port` phase — every
consumer of the library benefits from these primitives, but the focal use
case is a tenant-scoped, PGlite-backed local-first React app talking to a
self-hosted Supabase + ElectricSQL stack.

### Added

- **`createPGlitePersistenceAdapter(pglite, options?)`** in
  `src/adapters/pglite-persistence.ts` — a `GraphPersistenceAdapter` that
  stores the local-first runtime's graph snapshot in a PGlite table
  (`_graph_snapshot` by default), instead of `localStorage`/`IndexedDB`.
- **`createTenantScopedElectricAdapter(opts)`** in
  `src/adapters/electricsql-tenant.ts` — Electric adapter wrapper that
  refuses to attach a shape unless it declares a `tenantColumn` (string or
  explicit `null` for the tenant root). Builds the `WHERE` clause from a
  validated `{ companyId }` claim so shape predicates can never widen past
  RLS by accident. Implements RULE 5 (shape predicates ⊆ RLS) and the
  auth-claim-aware shape registration helper (Change 13 item 11).
- **`registerEntityFromSql({ entityType, createTableSql, overrides })`** in
  `src/schema-from-sql.ts` — generates and registers a JSON Schema directly
  from a Postgres `CREATE TABLE` block, removing the need to hand-maintain
  TypeScript schema duplicates.
- **`useEntityListAsTable(opts)`** in `src/table/use-entity-list-as-table.ts`
  — wraps `useEntityList` and returns a referentially-stable `data` array
  suitable for TanStack Table's `data` prop. Does not pull
  `@tanstack/react-table` as a dep.
- **Retry-with-backoff replay** for pending offline actions in
  `startLocalFirstGraph(...)` via a new `retryPolicy` option
  (`{ maxAttempts, initialDelayMs, maxDelayMs, backoffFactor, jitter, poisonHandler }`).
  Exhausted actions go to a poison handler instead of looping forever.

### Notes

- No new runtime dependencies. PGlite and ElectricSQL are still consumed
  through minimal structural types, exactly like the existing
  `adapters/electricsql.ts`.
- Backward compatible: every existing export remains. Consumers can adopt
  the new APIs incrementally.

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
