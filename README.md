# @prometheus-ags/prometheus-entity-management

**Normalized, globally-reactive entity graph store for React**

Update a post in one screen and every list row, detail panel, and badge that reads that entity updates automatically—without hand-maintained query keys. Normalization is built around your `type` + `id` + `normalize` function, not a separate cache product. The same graph holds data from **REST**, **GraphQL**, **WebSocket / Supabase / Convex**, **Prisma-shaped APIs**, and **ElectricSQL + PGlite** local-first sync.

### 3.0 release program status

The full 3.0 release is **in progress**, not yet certified or promoted to npm's `latest` tag. The authoritative [3.0 release contract](release/v3-release-contract.json) defines the complete artifact inventory, compatibility matrix, stability labels, required evidence, promotion approvals, and recovery policy. The [example coverage ledger](examples/coverage.json) records React 19/Vite 8, Next.js App Router, agentic A2UI, and Flutter/Riverpod as implemented with their runtime and visual evidence. The universal Tauri source and focused tests now exist, but its showcase remains planned until clean desktop/mobile and visual receipts pass. Completed showcase work is not full-release certification.

Native Dart and Rust sources are included in the 3.0 inventory, while first publication to pub.dev and crates.io remains deferred until registry ownership and native release workflows are established. npm publication and the branded GitHub Pages documentation site are required release outcomes.

The [3.0 main CI baseline](release/ci-baseline.md) is implemented: the repository now uses one frozen root lockfile, a Node 22/24/26 matrix, bounded named gates, compatible-current dependency decisions, and fail-closed critical/high production advisory policy. This quality gate improves confidence in `main`; it does **not** certify showcase applications, packed artifacts, native platforms, documentation deployment, or stable npm publication.

The [packed npm package gate](release/package-contracts.md) is also implemented. All twelve candidates now expose loader-specific ESM/CommonJS runtimes and declarations, pass strict Publint and Are The Types Wrong checks, and install as one tarball-only set in Node ESM, Node CommonJS, TypeScript NodeNext, Node16, and Bundler consumers.

The [framework-neutral core gate](release/framework-neutral-core.md) is implemented as well. The packed core resolves no React runtime or type packages, its runtimes and declarations contain no React dependency, and isolated ESM/CommonJS/TypeScript consumers can share the default vanilla graph or create isolated graph instances.

The [binding singleton gate](release/binding-singleton-contract.md) now certifies the next boundary: isolated packed consumers resolve one application-owned core from React, Svelte, Solid, Web Components, Alpine, and HTMX, and each binding observes writes through that same graph. Incompatible core peers fail with actionable diagnostics. This does **not** certify native Tauri/Flutter behavior, showcases, visual evidence, documentation deployment, provenance, or publication.

The [shared example contract](examples/shared/README.md) is implemented as a presentation-neutral flight plan for all five showcases. Its deterministic Project/User/Task/Comment/Activity fixtures execute thirteen semantic outcomes and map all sixteen stable release artifacts and capabilities. This proves the examples agree on expected behavior; it does **not** certify an application by itself. Run `pnpm run verify:example-coverage` to validate the contract and its fail-closed coverage ledger.

The [official A2UI bridge](release/a2ui-protocol-bridge.md) is now implemented and independently certified. The `@prometheus-ags/a2ui-react` root renders official v0.9.1 surfaces through the maintained engine, graph actions cross a default-deny application policy, and alpha AG-UI chat/state APIs move to the explicit `./ag-ui` subpath. Packed consumers and real-browser accessibility/keyboard evidence prove this bridge.

The [A2A conformance agent](release/a2a-conformance-agent.md) separately implements the official A2A v1 JSON-RPC binding with authenticated, caller-scoped task access, a default-deny graph policy, deterministic A2UI artifacts, packed-consumer verification, and a pinned upstream TCK receipt. Protocol validity never grants application authority. The dedicated [agentic A2UI example](release/agentic-a2ui-example.md) composes that transport with the official renderer, exact application actions, human approval, and normalized graph projections. Its deletion-aware clean gate passes eleven units, four package builds, both protocol export ledgers, a Vite production build, three Chromium flows, accessibility, screenshots, traces, coverage, security, and strict OpenSpec. Unsupported external-agent hosting, REST/gRPC or push-notification bindings, Flutter rendering, documentation deployment, registry authority, and stable promotion remain outside these gates.

The [Flutter source provenance gate](release/flutter-source-provenance.md) preserves the allowlisted KnowMe history, authorship, MIT attribution, path dispositions, and deterministic lineage evidence. `packages/entity_graph_flutter` remains the sole canonical Dart package; the filtered import is non-buildable and non-public. This is chain-of-custody evidence only—not Riverpod/runtime certification, Flutter rendering, pub.dev authority, or stable 3.0 readiness.

The [Dart graph and Riverpod 3 gate](release/dart-graph-riverpod.md) now certifies that canonical package's generated Riverpod families, normalized list/detail behavior, local/remote/hybrid views, optimistic CRUD rollback, bounded retry, realtime invalidation, pluggable transports, optional FFI seam, public declaration ledger, scoped cross-view widget goldens, and a clean Flutter 3.44.8 stable package candidate. It does not certify the complete Flutter/A2UI showcase, Android/iOS devices, pub.dev authority, the immutable full-release SHA, or stable promotion.

The [Flutter, Riverpod, and A2UI showcase](release/flutter-riverpod-a2ui-example.md)
now implements the complete application composition: one graph, generated
providers/controllers, optimistic and offline-aware CRUD, relationships,
realtime changes, policy-gated official GenUI surfaces, responsive UI, and an
optional FFI transport. Analyzer, 25 host tests, and three deterministic
goldens pass. Its ledger status remains `partial` until Flutter 3.44.8 stable
and the Android/iOS integration lanes execute successfully.

The [recoverable release-candidate pipeline](release/release-candidate-pipeline.md)
is implemented as a separate non-mutating gate. It derives the sixteen-artifact
inventory and twelve-package dependency order from the release contract,
certifies tarball-only consumers, protects npm `latest`, and records restartable
partial-staging recovery. External trusted-publisher/reviewer configuration,
stable certification, documentation deployment, the GitHub Release, and npm
`latest` remain unproven downstream outcomes.

The [React 19/Vite 8 showcase](release/vite-react19-example.md) is the first
implemented 3.0 application. Its production-browser gate covers normalized
cross-view identity, optimistic confirm/rollback, relationship invalidation,
local/remote/hybrid views, REST/GraphQL seams, realtime coalescing, browser
PGlite/Loro, Suspense/error containment, DevTools, and accessibility. This is
source-workspace evidence, not packed-package or npm staging evidence; it is
the application proof used to prioritize a core + React preview RC while the
remaining portfolio is completed.

The [Next.js App Router showcase](release/nextjs-app-router-example.md)
adds per-request vanilla graphs, serializable RSC hydration, a scoped React
provider, route persistence, validated Server Action mutation, and client-only
realtime takeover. Its clean tarball-only production verifier installs packed
core and React `3.0.0-rc.1` candidates into an external app and proves the
concurrent-request, browser, accessibility, screenshot, and trace contract. The
coverage ledger records it as implemented without claiming npm publication or
completion of the remaining showcase portfolio.

The [universal Tauri application](release/tauri-universal-example.md) now has
one shared React/Vite frontend, normalized graph, SQLite/localStorage adapter
boundary, durable offline queue, deep-link/lifecycle handling, least-privilege
capability, and generated Android/iOS shells. Five browser-runtime units, four
source-contract regressions, and two stable-Rust Tauri MockRuntime tests pass.
The ledger does not promote the showcase yet: clean browser visuals, packaged
desktop E2E, app-level Android/iOS smoke, relationship invalidation, and
realtime coalescing receipts remain task-5 acceptance work.

### Documentation map

| Doc | Purpose |
|-----|---------|
| [docs/tanstack-query-and-table.md](docs/tanstack-query-and-table.md) | How this library fits with TanStack Query and TanStack Table |
| [docs/tanstack-comparison.md](docs/tanstack-comparison.md) | Detailed comparison against TanStack DB, Query, Table, AI, and Intent |
| [docs/advanced.md](docs/advanced.md) | Engine, GC, Suspense, DevTools, SSR, testing |
| [RELEASING.md](RELEASING.md) | Versioning, `prepublishOnly`, npm publish |
| [CHANGELOG.md](CHANGELOG.md) | Release history |
| [release/README.md](release/README.md) | 3.0 contract, registry scope, and release policy |
| [release/ci-baseline.md](release/ci-baseline.md) | Hermetic install, CI gates, dependency holds, and advisory policy |
| [release/package-contracts.md](release/package-contracts.md) | Twelve-package tarball, module, declaration, and payload gate |
| [release/framework-neutral-core.md](release/framework-neutral-core.md) | Vanilla core API, React boundary migration, and packed non-React certification |
| [release/binding-singleton-contract.md](release/binding-singleton-contract.md) | Required core peers, fixed release policy, and six-binding singleton certification |
| [release/a2ui-protocol-bridge.md](release/a2ui-protocol-bridge.md) | Official A2UI v0.9.1 rendering, graph action policy, and AG-UI migration boundary |
| [release/a2a-conformance-agent.md](release/a2a-conformance-agent.md) | Official A2A v1 JSON-RPC lifecycle, authority boundary, TCK scope, and alpha migration |
| [release/agentic-a2ui-example.md](release/agentic-a2ui-example.md) | Keyless end-to-end A2A/A2UI application architecture, policy matrix, verification state, and limits |
| [release/flutter-source-provenance.md](release/flutter-source-provenance.md) | Licensed Flutter source lineage, canonical ownership, and publication limits |
| [release/dart-graph-riverpod.md](release/dart-graph-riverpod.md) | Canonical Dart graph, Riverpod 3, public API ledger, behavioral evidence, and exclusions |
| [release/flutter-riverpod-a2ui-example.md](release/flutter-riverpod-a2ui-example.md) | Flutter application architecture, safe GenUI policy, host evidence, and pending platform gates |
| [release/release-candidate-pipeline.md](release/release-candidate-pipeline.md) | Contract-derived RC manifest, rehearsal, OIDC staging boundary, and recovery |
| [release/vite-react19-example.md](release/vite-react19-example.md) | Implemented React 19/Vite 8 scenarios, architecture, verification, and evidence limits |
| [release/nextjs-app-router-example.md](release/nextjs-app-router-example.md) | Implemented Next.js request isolation, RSC hydration, packed production verification, and browser evidence |
| [release/tauri-universal-example.md](release/tauri-universal-example.md) | Universal React/Tauri architecture, focused evidence, remaining desktop/mobile gates, and release limits |
| [examples/tauri-universal/README.md](examples/tauri-universal/README.md) | Run and verify the shared desktop/Android/iOS example without overclaiming platform evidence |
| [examples/shared/README.md](examples/shared/README.md) | Deterministic shared showcase domain, semantic scenarios, and evidence boundary |
| [release/dependency-policy.json](release/dependency-policy.json) | Machine-readable compatible-current dependency holds |
| [security/advisory-policy.json](security/advisory-policy.json) | Critical/high production advisory dispositions |
| [examples/coverage.json](examples/coverage.json) | Machine-readable implementation and showcase status |

---

## Quick start

### 1. Install

```bash
pnpm add @prometheus-ags/entity-graph-core @prometheus-ags/prometheus-entity-management react react-dom
```

(`npm install` works for consumers too; this repository itself is `pnpm`-only.)

### 2. Define an entity type

```ts
type Post = { id: string; title: string; status: string };
```

### 3. Fetch and render

```tsx
import { useEntity } from "@prometheus-ags/prometheus-entity-management";

export function PostCard({ postId }: { postId: string }) {
  const { data, isLoading, error } = useEntity<Post, Post>({
    type: "Post",
    id: postId,
    fetch: async (id) => {
      const res = await fetch(`/api/posts/${id}`);
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Post;
    },
    normalize: (raw) => raw,
  });

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>{error}</p>;
  if (!data) return null;
  return <article>{data.title}</article>;
}
```

Any other component that calls `useEntity` with the same `type` and `id` reads the **same** normalized record from the graph.

---

## Core concepts

### Entities live exactly once

Each `(entityType, id)` maps to a single canonical object in the Zustand graph (`entities[type][id]`). Lists and detail views never keep their own full copies; they resolve through that node.

### Queries are instructions, not containers

`useEntity`, `useEntityList`, and GraphQL hooks describe **how** to load data and **how** to normalize it into the graph. They do not own isolated cache entries the way query-key–scoped caches do.

### Lists store IDs, not data

List state keeps ordered **IDs** plus pagination metadata. Rows are `items` joined from `entities` at render time, so when `Post:123` changes, every list that includes that ID re-renders consistently.

### Three-layer model

Data flows **up** into the graph; UI reads **down** through hooks (see [Architecture](#architecture)).

```
┌─────────────────────────────────────────────────────────────┐
│ Layer 3: UI Components (optional, users can build their own)│
│ src/ui/                                                      │
│ EntityTable · EntityDetailSheet · EntityFormSheet · columns │
├─────────────────────────────────────────────────────────────┤
│ Layer 2: Access Patterns (hooks - how components read data) │
│ src/hooks.ts, src/graphql/hooks.ts, src/crud/               │
│ useEntity · useEntityList · useEntityView · useEntityCRUD   │
│ useGQLEntity · useEntityMutation · useEntityAugment         │
├─────────────────────────────────────────────────────────────┤
│ Layer 1: Entity Graph (Zustand store - canonical data)      │
│ src/graph.ts                                                 │
│ entities[type][id] · patches[type][id] · lists[queryKey]     │
└─────────────────────────────────────────────────────────────┘
              ▲           ▲           ▲           ▲
         REST fetch   GraphQL    WebSocket    ElectricSQL
```

---

## v1.3 additions

Eight focused additions across three patch releases for tenant-scoped,
PGlite-backed local-first apps. All backward compatible; no new runtime
dependencies.

### v1.3.0 — new APIs

| API | File | Purpose |
|-----|------|---------|
| `createPGlitePersistenceAdapter(pglite, options?)` | `src/adapters/pglite-persistence.ts` | `GraphPersistenceAdapter` that stores the snapshot in a PGlite table (`_graph_snapshot` by default) |
| `createTenantScopedElectricAdapter(opts)` | `src/adapters/electricsql-tenant.ts` | Refuses to attach Electric shapes that lack a `tenantColumn`; builds the `WHERE` from a validated `{ companyId }` claim so shape predicates can never widen past RLS |
| `registerEntityFromSql({ entityType, createTableSql, overrides })` | `src/schema-from-sql.ts` | Generates and registers a JSON Schema directly from a Postgres `CREATE TABLE` block — no hand-maintained TypeScript schema duplicates |
| `useEntityListAsTable(opts)` | `src/table/use-entity-list-as-table.ts` | Wraps `useEntityList` for TanStack Table — returns a referentially-stable `data` array and `rowCount`; no TanStack Table dep required |
| `startLocalFirstGraph({ ..., retryPolicy })` | `src/local-first-runtime.ts` | Retry-with-backoff for pending offline action replay; exhausted actions go to an opt-in `poisonHandler` instead of looping forever |

### v1.3.1 — stability fix

- **`useEntityList`** return shape is now `useMemo`-stabilised. React 19's
  `useSyncExternalStore` was detecting a fresh object on every render and
  emitting an infinite-loop warning. Identity-stable `items` + stable
  pagination state means no more perpetual loading skeletons from hook
  composition chains.

### v1.3.2 — error handling

- **`isError: boolean`** added to both `UseEntityListResult` and
  `UseEntityViewResult` as a convenience alias for `error !== null`,
  matching TanStack Query's hook ergonomics.
- **`setListError`** now stamps `lastFetched` and clears `stale`, closing
  a terminal-error retry loop where a 404 on a missing table triggered an
  infinite refetch storm.
- **`useEntityView`** writes errors to the base key (the one `isLoading`
  reads from) and defaults `isLoading` to `false` when no list state
  exists, so a failed first fetch no longer leaves consumers stuck in a
  perpetual loading state.

---

## New in v1.2

The graph runtime now exposes a focused set of non-hook helpers for loaders, workflows, and orchestration:

- `queryOnce(...)` / `selectGraph(...)` for one-shot graph snapshots without a live subscription
- nested `include` projections over normalized graph data
- `createGraphTransaction(...)` / `createGraphAction(...)` for explicit optimistic graph writes with rollback
- sync-aware snapshot metadata: `$synced`, `$origin`, `$updatedAt`
- `createGraphEffect(...)` for enter/update/exit reactions over graph query results
- `createGraphTool(...)` / `exportGraphSnapshot(...)` for AI interoperability without bundling an AI runtime
- `startLocalFirstGraph(...)`, `hydrateGraphFromStorage(...)`, and `persistGraphToStorage(...)` for PWA/PGlite-friendly graph persistence and replay
- schema-driven entity rendering via `registerEntityJsonSchema(...)`, `buildEntityFieldsFromSchema(...)`, and `useSchemaEntityFields(...)`
- built-in markdown-aware schema fields plus schema-aware graph export helpers for A2UI/runtime-generated entity models

These additions are intentionally graph-native. They extend the entity graph for orchestration use cases without changing the core `Components → Hooks → Stores → APIs/Realtime` architecture.

---

## Feature comparison

| Feature | `@prometheus-ags/prometheus-entity-management` | TanStack Query | Apollo Client | SWR |
|--------|--------------------------------------------------|----------------|---------------|-----|
| Normalized cache | Yes (automatic) | No (manual) | Yes (manual config) | No |
| Cross-view reactivity | Yes | No | Partial | No |
| REST support | Yes | Yes | No | Yes |
| GraphQL support | Yes | No (separate client) | Yes | No |
| Realtime / WebSocket | Yes (built-in adapters) | No (manual) | Yes (subscriptions) | No |
| Local-first (ElectricSQL) | Yes | No | No | No |
| Prisma integration | Yes | No | No | No |
| CRUD lifecycle | Yes (`useEntityCRUD`) | No | No | No |
| Relation schemas | Yes (cascade invalidation) | No | Yes (type policies) | No |
| Suspense hooks | Yes | Yes | Yes | Yes |
| SSR hydration | Yes | Yes | Yes | Yes |
| Garbage collection | Yes (automatic, configurable) | Yes | Yes | No |
| Bundle size | See [Bundle size](#bundle-size) | ~39KB | ~130KB | ~4KB |

Peer dependencies (`react`, `react-dom`, optional `@tanstack/react-table`) are **not** included in any column. Published `dist` sizes change with each release—measure before quoting numbers in docs or talks.

### Bundle size

The npm package ships a **single large entry** (`dist/index.mjs`) that re-exports the full surface (hooks, GraphQL, CRUD, view, UI, adapters). **Your** app’s gzipped cost depends on **tree-shaking**, **minification**, and **which imports you use**.

**Maintainers:** after `pnpm run build`, a rough gzip size of the ESM bundle is:

```bash
gzip -c dist/index.mjs | wc -c
```

Compare against peers only when measurement methodology matches (minified vs unminified, gzip vs brotli, ESM vs CJS).

---

## API reference (brief)

### Core

| Export | Description |
|--------|-------------|
| `createGraphStore` / `graphStore` | Create an isolated vanilla graph or access the default process-wide singleton. |
| `useGraphStore` | React subscription hook over `graphStore`, with compatibility StoreApi methods attached. Prefer domain hooks in components. |
| `configureEngine` | App-wide defaults: stale time, retries, GC interval, GC time, etc. |
| `getEngineOptions` | Read merged engine options. |
| `serializeKey` | Stable string key for list `queryKey` serialization. |
| `fetchEntity` | Imperative single-entity fetch with dedupe and graph write (for custom hooks/adapters). |
| `fetchList` | Imperative list fetch with dedupe and graph write. |
| `dedupe` | Process-global in-flight promise deduplication helper. |
| `startGarbageCollector` / `stopGarbageCollector` | Periodic eviction of unsubscribed, stale entities (also started via `configureEngine`). |

### Graph runtime

| Export | Description |
|--------|-------------|
| `queryOnce` / `selectGraph` | One-shot graph snapshot queries with local filtering, sorting, and nested includes. |
| `createGraphTransaction` | Explicit graph write transaction with commit / rollback. |
| `createGraphAction` | Higher-level optimistic action wrapper around graph transactions. |
| `createGraphEffect` | Subscribe to graph query results with `onEnter`, `onUpdate`, and `onExit`. |
| `createGraphTool` | Typed graph-backed helper for AI or workflow integrations. |
| `createSchemaGraphTool` | Schema-aware graph tool helper for AI workflows built around dynamic entity schemas. |
| `exportGraphSnapshot` | Serialize graph data for prompts, exports, and non-React workflows. |

### Schema-driven entities

| Export | Description |
|--------|-------------|
| `registerEntityJsonSchema` / `registerRuntimeSchema` | Register static or runtime-generated JSON Schemas for an entity type or JSON column. |
| `registerEntityFromSql` | Generate and register a JSON Schema from a Postgres `CREATE TABLE` block — eliminates hand-maintained TypeScript schema duplicates. |
| `getEntityJsonSchema` | Resolve the active schema by entity type, schema id, or field. |
| `buildEntityFieldsFromSchema` | Generate entity field descriptors from JSON Schema for dynamic forms and detail views. |
| `useSchemaEntityFields` | Hook that resolves a registered schema and returns generated field descriptors. |
| `MarkdownFieldRenderer` / `MarkdownFieldEditor` | Built-in markdown-aware schema field renderer and editor. |
| `exportGraphSnapshotWithSchemas` | Serialize graph data together with resolved entity schemas. |

### Local-first runtime

| Export | Description |
|--------|-------------|
| `startLocalFirstGraph` | Starts a higher-level local-first runtime for graph hydration, persistence, action replay, and sync status. Accepts optional `retryPolicy` for offline action replay. |
| `hydrateGraphFromStorage` | Restore graph state from a storage adapter using a JSON-serializable snapshot payload. |
| `persistGraphToStorage` | Persist graph state and pending action metadata through a storage adapter. |
| `useGraphSyncStatus` | Hook exposing online/offline/hydrating/syncing/ready state for PWAs and IPC-safe hosts. |
| `replayActionWithRetry` | Replay a single pending action with configurable exponential-backoff retry. |
| `createPGlitePersistenceAdapter` | PGlite-backed `GraphPersistenceAdapter`; stores the snapshot in a PGlite table alongside synced data. |

### Hooks (REST-oriented)

| Export | Description |
|--------|-------------|
| `useEntity` | Subscribe to one entity; fetch/normalize into graph; SWR + subscriber-aware refetch. Returns `{ data, isLoading, isError, error, refetch }`. |
| `useEntityList` | Subscribe to a list query key; stores IDs; merges row data from graph. Returns `{ items, isLoading, isError, error, isFetching, fetchNextPage, refetch }`. |
| `useEntityView` | Filter/sort/search with local/remote/hybrid completeness modes. Returns `{ items, isLoading, isError, error, setFilter, setSort, setSearch }`. |
| `useEntityMutation` | Mutate with optional optimistic updates and list invalidation hooks. |
| `useEntityAugment` | Patch UI-only fields merged at read time across all subscribers. |
| `useEntityListAsTable` | Wraps `useEntityList` with a referentially-stable `data` array + `rowCount` for TanStack Table. |
| `useSuspenseEntity` | Suspense variant of `useEntity` (non-null `id` required). |
| `useSuspenseEntityList` | Suspense variant of `useEntityList`. |

### View

| Export | Description |
|--------|-------------|
| `FilterSpec`, `SortSpec` | Transport-agnostic filter and sort AST types. |
| `toRestParams` | Compile view → REST query params. |
| `toSQLClauses` | Compile view → SQL-style WHERE / ORDER BY fragments. |
| `toGraphQLVariables` | Compile view → common GraphQL variable shapes. |
| `toPrismaWhere` / `toPrismaOrderBy` | Compile view → Prisma-style `where` / `orderBy` objects. |
| `applyView`, `compareEntities`, `matchesFilter`, `matchesSearch`, `checkCompleteness` | Local evaluation and completeness helpers. |
| `flattenClauses`, `hasCustomPredicates` | Filter introspection utilities. |

### CRUD

| Export | Description |
|--------|-------------|
| `useEntityCRUD` | Unified list + detail + edit + create flow, edit buffer, dirty tracking, optimistic helpers. |
| `registerSchema` | Register entity relations for cascade invalidation after mutations. |
| `getSchema`, `readRelations`, `cascadeInvalidation` | Introspection and imperative cascade invalidation. |

### Realtime

| Export | Description |
|--------|-------------|
| `RealtimeManager` | Registers adapters, coalesces changes (16 ms window), writes to graph. |
| `getRealtimeManager`, `resetRealtimeManager` | Singleton access and test resets. |
| `createWebSocketAdapter` | Generic WebSocket → graph changes. |
| `createSupabaseRealtimeAdapter` | Supabase Realtime payloads → graph. |
| `createConvexAdapter` | Convex-shaped streams → graph. |
| `createGraphQLSubscriptionAdapter` | GraphQL over WebSocket subscriptions → graph. |

### GraphQL

| Export | Description |
|--------|-------------|
| `createGQLClient` | Configure endpoint, fetcher, and entity descriptors for normalization. |
| `GQLClient` | Client class instance type. |
| `normalizeGQLResponse` / `executeGQL` | Normalize and execute with the same descriptor model. |
| `useGQLEntity`, `useGQLList` | Graph-backed entity and list hooks. |
| `useGQLMutation`, `useGQLSubscription` | GraphQL mutation and subscription hooks tied to the graph. |

### Prisma

| Export | Description |
|--------|-------------|
| `createPrismaEntityConfig` | Factory for REST endpoints that speak Prisma-style `where` / `orderBy` query params. |
| `prismaRelationsToSchema` | Convert Prisma-style relation map → `EntitySchema` for `registerSchema`. |
| `toPrismaInclude` | Build an `include` map from relation descriptors. |

### Local-first adapters

| Export | Description |
|--------|-------------|
| `createElectricAdapter` | ElectricSQL / PGlite shape changes → graph. |
| `createTenantScopedElectricAdapter` | Safety wrapper: refuses to attach a shape unless it declares a `tenantColumn`; builds the `WHERE` clause from a validated `{ companyId }` claim. |
| `useLocalFirst` | Hook for local-first workflows with the adapter. |
| `usePGliteQuery` | Run queries against PGlite in sync with the graph story. |

### Peer sync companion

`@prometheus-ags/entity-graph-sync` adds Yjs and the certified Loro path without
making CRDTs a core dependency.

| Export | Description |
| --- | --- |
| `createSyncProviderRegistry` | Create provider state owned by one graph client. |
| `startSyncBridge({ store, registry })` | Bridge an isolated store to its providers and suppress inbound peer echo. |
| `createLoroProvider` | Reconcile entity fields using deterministic Loro peer identities and mergeable child maps. |
| `createLoroLoopbackNetwork` | Control offline/reconnect delivery in FIFO or reverse order for deterministic tests. |
| `createWebSocketLoroChannel` | Queue disconnected writes, reconnect, and request snapshots missed during an outage. |

Install the Loro selection explicitly:

```bash
pnpm add @prometheus-ags/entity-graph-sync loro-crdt@^1.13.9
```

PGlite persistence, Loro merge semantics, graph projection, and WebSocket
recovery are separate proof obligations. The mandatory 3.0 commands are
`pnpm run test:sync-persistence`, `pnpm run verify:sync-persistence`, and
`pnpm run bdd:sync-persistence`. They do not certify any rendered showcase;
browser, mobile, accessibility, screenshot, trace, and device evidence remains
owned by each example's declared gate.

### DevTools

| Export | Description |
|--------|-------------|
| `useGraphDevTools` | Hook for debugging graph shape and activity in development. |

### UI (optional)

| Export | Description |
|--------|-------------|
| `EntityTable`, `InlineCellEditor` | Table + inline cell editing wired to the graph / view layer. |
| `EntityDetailSheet`, `EntityFormSheet`, `Sheet` | CRUD-oriented sheet primitives. |
| `selectionColumn`, `textColumn`, `numberColumn`, `dateColumn`, `enumColumn`, `booleanColumn`, `actionsColumn`, `SortHeader` | Column helpers with filter metadata for tooling. |

### Types (high level)

`GraphState`, `EntityState`, `ListState`, `EntityType`, `EntityId`, `EntitySyncMetadata`, `EntitySnapshot`, `EngineOptions`, `EntityQueryOptions`, `ListQueryOptions`, `ViewDescriptor`, `EntitySchema`, `RelationDescriptor`, realtime adapter types, GraphQL types, CRUD types, and column meta types are all exported from the package entry.

---

## Migration from TanStack Query

### Single record: `useQuery` → `useEntity`

**Before (TanStack Query)**

```tsx
const { data, isLoading } = useQuery({
  queryKey: ["post", id],
  queryFn: () => fetch(`/api/posts/${id}`).then((r) => r.json()),
});
```

**After (entity graph)**

```tsx
const { data, isLoading } = useEntity<Post, Post>({
  type: "Post",
  id,
  fetch: (postId) => fetch(`/api/posts/${postId}`).then((r) => r.json()),
  normalize: (raw) => raw,
});
```

**Difference:** the graph key is `(type, id)`, not an opaque query key. Anything else that uses the same `type`/`id` shares that record—no `setQueryData` across keys.

### Lists: `useQuery` + key → `useEntityList`

**Before**

```tsx
const { data } = useQuery({
  queryKey: ["posts", { status }],
  queryFn: () => api.posts.list({ status }),
});
```

**After**

```tsx
const { items, isLoading } = useEntityList<Post, Post>({
  type: "Post",
  queryKey: ["posts", { status }],
  fetch: (p) => api.posts.list({ status, page: p.page, pageSize: p.pageSize, cursor: p.cursor }),
  normalize: (row) => ({ id: row.id, data: row }),
});
```

**Difference:** the list stores **IDs**; row objects are always read through the normalized `Post` map, so updates propagate everywhere.

### TanStack Table: `useQuery` data prop → `useEntityListAsTable`

If you wire `useEntityList` directly into TanStack Table's `data` prop, the table treats a
new array reference as new data on every render. Use `useEntityListAsTable` instead—it
returns a referentially-stable `data` array that only changes when the underlying items
actually change.

**Before**

```tsx
const { data = [] } = useQuery<Post[]>({
  queryKey: ["posts"],
  queryFn: () => api.posts.list(),
});
const table = useReactTable({ data, columns, getCoreRowModel: getCoreRowModel() });
```

**After**

```tsx
import { useEntityListAsTable } from "@prometheus-ags/prometheus-entity-management";

const { data, rowCount, isLoading, isError, error } = useEntityListAsTable<Post, Post>({
  type: "Post",
  fetch: (p) => api.posts.list(p),
  normalize: (row) => ({ id: row.id, data: row }),
});

const table = useReactTable({ data, rowCount, columns, getCoreRowModel: getCoreRowModel() });
```

**Difference:** `data` identity is stable across renders where items haven't changed, so
TanStack Table's memoization works correctly and row state (selection, expansion) is
preserved between refetches.

### Mutations: `useMutation` → `useEntityMutation`

**Before**

```tsx
const qc = useQueryClient();
const mutation = useMutation({
  mutationFn: (id: string) => api.posts.archive(id),
  onSuccess: () => {
    qc.invalidateQueries({ queryKey: ["posts"] });
    qc.invalidateQueries({ queryKey: ["post"] });
  },
});
```

**After**

```tsx
import { serializeKey, useEntityMutation } from "@prometheus-ags/prometheus-entity-management";

const { mutate } = useEntityMutation<string, Post, Post>({
  type: "Post",
  mutate: (id) => api.posts.archive(id),
  normalize: (raw) => ({ id: raw.id, data: raw }),
  optimistic: (id) => ({ id, patch: { status: "archived" } }),
  invalidateLists: [serializeKey(["posts"])],
});
```

**Difference:** optimistic updates target the **entity**; optional list invalidation is declarative. Cross-view consistency comes from normalization, not from remembering every query key.

---

## Migration from Apollo Client

### Query: `useQuery` → `useGQLEntity` / `useGQLList`

**Before (Apollo)**

```tsx
const { data } = useQuery(GET_POST, { variables: { id } });
```

**After**

```tsx
const { data } = useGQLEntity({
  client: gqlClient,
  document: GET_POST,
  variables: {},
  type: "Post",
  id,
  descriptor: postDescriptor,
});
```

Use `useGQLList` with `document`, `queryKey`, `descriptor`, and `getItems` to map the response into rows.

**Difference:** you describe entities with **descriptors** (how to normalize IDs and nested types) once; you do not maintain a parallel universe of type policies and merge functions for every edge case.

### Mutation: `useMutation` → `useGQLMutation`

**Before**

```tsx
const [mutate] = useMutation(UPDATE_POST);
```

**After**

```tsx
const { mutate } = useGQLMutation({
  client: gqlClient,
  document: UPDATE_POST,
  type: "Post",
  descriptors: [postDescriptor],
});
```

Descriptors tell the client how to write normalized entities from the mutation payload—no Apollo-style type policies.

### Subscriptions: `useSubscription` → `useGQLSubscription`

**Before**

```tsx
useSubscription(POST_UPDATED, { variables: { id } });
```

**After**

```tsx
useGQLSubscription({
  client: gqlClient,
  wsClient: gqlWsClient,
  document: POST_UPDATED_SUB,
  variables: { id },
  descriptors: [postDescriptor],
});
```

**Difference:** GraphQL, REST, and realtime adapters can all write the **same** entity graph, so mixed stacks do not need two caches.

---

## Prisma integration

`createPrismaEntityConfig` targets REST APIs that accept Prisma-style `where` and `orderBy` as JSON query parameters (typical for Prisma-backed route handlers).

```typescript
import {
  createPrismaEntityConfig,
  registerSchema,
  useEntity,
  useEntityList,
} from "@prometheus-ags/prometheus-entity-management";

type Post = { id: string; title: string; authorId: string };

const Posts = createPrismaEntityConfig<Post>({
  type: "Post",
  endpoint: "/api/posts",
  relations: {
    author: { type: "User", foreignKey: "authorId", relation: "belongsTo" },
    comments: { type: "Comment", foreignKey: "postId", relation: "hasMany" },
  },
});

// Register cascade rules once (e.g. app init)
Posts.schemas().forEach(registerSchema);
```

```tsx
function PostDetail({ postId }: { postId: string }) {
  const { data } = useEntity(Posts.entity(postId));
  return data ? <h1>{data.title}</h1> : null;
}

function PostList() {
  const { items } = useEntityList(
    Posts.list({
      filter: [{ field: "status", op: "eq", value: "published" }],
      sort: [{ field: "createdAt", direction: "desc" }],
    })
  );
  return (
    <ul>
      {items.map((p) => (
        <li key={p.id}>{p.title}</li>
      ))}
    </ul>
  );
}
```

Use `Posts.crud()` with `useEntityCRUD` when you want the full list + detail + forms pipeline against the same endpoints.

---

## Examples

| Example | Path | What it demonstrates |
|--------|------|---------------------|
| **Vite app** | [`examples/vite-app/`](examples/vite-app/) | Full CRUD, realtime adapters, **TanStack Query → graph bridge** (`/tanstack-bridge`), `EntityTable` / sheets, mock API with latency |
| **Next.js app** | [`examples/nextjs-app/`](examples/nextjs-app/) | Project/Task/User flows plus a Next.js 16 runtime route. Each document request creates an isolated graph, serializes it through RSC, hydrates one `GraphStoreProvider`, preserves it across client routes, confirms a Server Action mutation, and hands ownership to client realtime after mount. |

From the repo root (this monorepo uses **pnpm**):

```bash
pnpm install
pnpm run dev:vite   # http://localhost:5173
pnpm run dev:next   # http://localhost:3000
```

---

## Architecture

### Data flow rules

- **Components → Hooks → Stores → APIs / realtime** — UI uses hooks only; hooks orchestrate; network and adapters update the graph.
- **Up into the graph:** fetches, mutations, and realtime events call into the Zustand store.
- **Down from hooks:** `useEntity`, `useEntityList`, `useEntityView`, GraphQL hooks, and CRUD read merged `entities` + `patches`.

### Graph structures (`src/graph.ts`)

1. **`entities`** — Canonical server-shaped records per `(type, id)`.
2. **`patches`** — Local-only overlays (`_selected`, `_loading`, …) merged at read time.
3. **`lists`** — Ordered `ids[]`, pagination, and fetch flags — **not** duplicated row payloads.
4. **`syncMetadata`** — Per-entity sync/provenance state layered into snapshot reads as `$synced`, `$origin`, and `$updatedAt`.

### Engine (`src/engine.ts`)

In-flight deduplication, retries, subscriber ref-counting, stale-while-revalidate, optional periodic garbage collection for entities without subscribers.

### Realtime (`src/adapters/realtime-manager.ts`)

Adapters emit a shared change shape; the manager batches updates per animation frame to avoid UI thrash.

### View layer (`src/view/`)

One `FilterSpec` / `SortSpec` can compile to REST, SQL, GraphQL variables, or Prisma shapes, and can run locally when the graph already holds enough data.

### CRUD (`src/crud/`)

`useEntityCRUD` keeps the edit buffer in React state so other views stay on committed data until save; `registerSchema` drives relation-aware cascade invalidation.

---

## Development (this repository)

```bash
pnpm install

# Examples
pnpm run dev:vite
pnpm run dev:next

# Typecheck
pnpm run typecheck
pnpm run typecheck:vite
pnpm run typecheck:next

# Production builds of examples
pnpm run build:vite
pnpm run build:next

# Clean artifacts
pnpm run clean
```

The library is consumed from source via path aliases in examples during development (no separate build step required for local hacking).

---

## License

MIT © Prometheus AGS / KnowMe LLC
