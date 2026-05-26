# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@prometheus-ags/prometheus-entity-management` is a **normalized, globally-reactive entity graph store for React** built on Zustand. It solves the data siloing problem inherent in TanStack Query's query-owns-data model by maintaining a single application-wide entity graph where updating an entity in one place instantly updates all views displaying that entity.

**Core Philosophy**: Queries are instructions to populate the graph. The graph is the single source of truth. Lists store ordered arrays of entity IDs — never copies of data.

## Non-Negotiable Architectural Rules

**CRITICAL**: These rules apply to ALL development on the library and ALL example applications. They can NEVER be broken.

### Package Management
- **`pnpm` is the only package manager** for all projects in this monorepo
- Never use `npm` or `yarn` for installation or dependency management

### Data Flow Architecture
The data flow is strictly layered with no exceptions:

```
Components → Hooks → Stores → APIs/Realtime
    ↓         ↓        ↓
  (read)   (orchestrate) (fetch/sync)
```

**1. Components NEVER interact directly with stores**
   - Components must ONLY use hooks to access data
   - No direct `useGraphStore` calls in component files
   - Hooks set up the data flow and provide the component view

**2. Hooks NEVER talk to APIs or external services directly**
   - Hooks orchestrate data flow between components and stores
   - All fetch/mutation/realtime logic lives in stores or adapters
   - Hooks call store methods; stores handle the actual I/O

**3. Stores own all external communication**
   - Stores talk to APIs (REST, GraphQL, etc.)
   - Stores set up realtime subscriptions (WebSocket, Supabase, etc.)
   - Stores manage caching, invalidation, and synchronization
   - Stores write to the entity graph

**Why This Matters**: Breaking these rules creates data silos, breaks cross-view reactivity, and defeats the entire purpose of the normalized entity graph.

## Development Commands

```bash
# Install all workspace dependencies (monorepo with examples)
pnpm install

# Run example applications (best way to test changes)
pnpm run dev:vite      # Vite example → http://localhost:5173
pnpm run dev:next      # Next.js example → http://localhost:3000

# Type checking
pnpm run typecheck           # Library source only
pnpm run typecheck:vite      # Vite example
pnpm run typecheck:next      # Next.js example

# Build examples (library has no build step during dev)
pnpm run build:vite
pnpm run build:next

# Cleanup
pnpm run clean          # Remove all node_modules and build artifacts
```

**Important**: There is NO build step during development. Examples resolve `"@prometheus-ags/prometheus-entity-management"` directly to `../../src/index.ts` via tsconfig path aliases. TypeScript compilation is handled by the example app bundlers (Vite/Next.js).

## Architecture: The Three-Layer Model (2.0)

Understanding the layer separation is critical for making changes:

```
┌─────────────────────────────────────────────────────────────┐
│  Layer 3: UI Components (optional, users can build their own)│
│  src/ui/                                                      │
│  EntityTable · EntityDetailSheet · EntityFormSheet · columns │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: Access Patterns (hooks - how components read data) │
│  src/hooks/use-entities.ts    → useEntities (thin, 2.0)      │
│  src/hooks/use-entity-query.ts → useEntityQuery (rich, 2.0)  │
│  src/hooks.ts                  → useEntityList (deprecated)  │
│  src/view/use-entity-view.ts   → useEntityView (deprecated)  │
│  src/graphql/hooks.ts, src/crud/ → useGQLEntity, useEntityCRUD│
├─────────────────────────────────────────────────────────────┤
│  Transport Registry (2.0 — ONE implementation per entity)    │
│  src/transport/registry.ts   registerEntityTransport         │
│  src/transport/types.ts      EntityTransport<T>              │
│  src/transport/rest.ts       makeRestTransport               │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Entity Graph (Zustand store - canonical data)      │
│  src/graph.ts                                                 │
│  entities[type][id] · patches[type][id] · lists[queryKey]    │
└─────────────────────────────────────────────────────────────┘
              ▲           ▲           ▲           ▲
         REST fetch   GraphQL    WebSocket    ElectricSQL
```

**Data flow is strictly upward**: All data flows UP into Layer 1 (the graph). Components read DOWN from the graph. There is no sideways data flow between components.

### 2.0 Transport Registry Pattern

**Problem**: 1.x hooks accepted inline `remoteFetch`, `normalize`, `queryKey`,
and error-handling strategy at every call site. Each call site could (and did)
introduce subtle variations of the same retry-loop bug.

**Solution**: Register ONE transport per entity type at app boot:

```ts
// src/shared/db/entity-transports.ts  (call once at boot)
registerEntityTransport("Invoice", makeRestTransport({ supabase, table: "invoice" }));
registerEntityTransport("Client",  makeRestTransport({ supabase, table: "client" }));
```

Hooks thereafter look up the transport by entity type:

```ts
// Simple list (5-field return):
const { items, isLoading, isError, error, refetch } = useEntities<Invoice>("Invoice", {
  filter: { field: "company_id", op: "eq", value: companyId },
  enabled: !!companyId,
});

// Rich view with toolbar:
const { items, setFilter, setSort, fetchNextPage } = useEntityQuery<Client>("Client", {
  view: { filter, sort },
});
```

### 2.0 Typed Errors

```ts
// instanceof-checkable — no string parsing required
if (error instanceof TerminalError) {
  // 4xx: don't offer a retry button — the request is structurally wrong
} else if (error instanceof TransientError) {
  // 5xx/network: show retry button — the server had a bad day
}
```

- `TerminalError` (`kind: "terminal"`) — 4xx, permanent. Engine: 0 retries.
- `TransientError` (`kind: "transient"`) — 5xx / network. Engine: up to `maxRetries` with exponential backoff.

## The Entity Graph (src/graph.ts)

The graph is a Zustand store with three core data structures:

1. **`entities: Record<type, Record<id, data>>`**
   Canonical storage for all server-confirmed entity data. Written by `upsertEntity`, `replaceEntity`, `removeEntity`. **Never written by UI code directly**.

2. **`patches: Record<type, Record<id, patch>>`**
   Local UI-only augmentations (e.g., `_selected`, `_expanded`, `_loading`). Written by `patchEntity`, `unpatchEntity`, `clearPatch`. **Never sent to server**.
   Read-time merge: `readEntity(type, id) = { ...entities[type][id], ...patches[type][id] }`

3. **`lists: Record<queryKey, ListState>`**
   Stores ordered arrays of entity IDs (NOT the entity data itself) plus pagination state (`ids[]`, `total`, `nextCursor`, `hasNextPage`, `isFetching`, etc.)

**Key Architectural Decision**: Lists store IDs, not data. This enables cross-view reactivity: when `Post:123` updates, every list containing that ID re-renders by joining IDs to the entity graph at render time.

## The Engine (src/engine.ts)

Handles the machinery between "a hook wants data" and "data lands in the graph":

- **In-flight deduplication**: Process-global `Map<key, Promise>`. If 10 components mount simultaneously requesting the same entity, only one fetch fires.
- **Subscriber ref-counting**: Components register/unregister `Symbol` tokens on mount/unmount. Background revalidation skips entities with no subscribers.
- **Stale-while-revalidate**: Entities older than `staleTime` (default 30s) trigger background refetch. On focus/reconnect, all subscribed entities are marked stale and revalidated.

## The View Layer (src/view/)

**FilterSpec** is transport-agnostic. The same filter spec compiles to:
- REST query params (`?status=published&sort=-createdAt`)
- GraphQL variables (`{ where: { status: { _eq: "published" } } }`)
- SQL WHERE clauses (`"status" = $1 ORDER BY "created_at" DESC`)
- Local JavaScript predicates (`entity.status === "published"`)

**Completeness detection** determines `completenessMode`:
- `local`: All data in graph → filter/sort in JS, zero network
- `remote`: Incomplete data → filter/sort params forwarded to server
- `hybrid`: Local results shown instantly (<16ms), remote fetch fires in parallel

**Realtime sorted insertion**: When a realtime change arrives, binary search (O(log n)) finds the correct insertion point in the sorted list without a full re-sort.

## The Realtime Manager (src/adapters/realtime-manager.ts)

**Change coalescing**: Within a 16ms window (one animation frame), multiple changes to the same entity are merged into a single Zustand write → one React render cycle. This prevents rapid-fire updates from Supabase/WebSocket from thrashing the UI.

Set `flushInterval: 0` for synchronous (unbatched) behavior if needed.

## CRUD Lifecycle (src/crud/)

**Edit Buffer Isolation**: `useEntityCRUD`'s `editBuffer` is React component state (`useState`), NOT a graph patch. This is intentional:
- While editing, other views still show the original data
- Only after `save()` succeeds does the graph update
- Exception: `applyOptimistic()` writes the buffer to the graph as a patch for instant feedback (toggles, sliders)

**Cascade Invalidation**: After every successful mutation, `cascadeInvalidation()` fires automatically:
1. Reads relation schemas from registry
2. Compares previous/next to find changed foreign keys
3. Marks affected list queries stale (background revalidation)
4. Marks related entities stale
5. Traverses reverse relations

## Key Concepts & Design Decisions

### Entities Live Exactly Once
**Never store a copy of an entity**. Always `upsertEntity` into the graph and store a reference (ID) elsewhere. This is the foundation of cross-view reactivity.

### Queries Are Instructions, Not Containers
A `useEntity` or `useEntityList` hook describes **what to fetch and how to normalize it**. It does not own the resulting data. The graph owns it.

### Local Patches Are Visible Everywhere
`patchEntity` and `useEntityAugment` write to the patches layer, which is merged at read time. Any subscriber to that entity sees the patch — list views, detail panels, other hooks.

### The Graph Is Zustand
`useGraphStore` is a plain Zustand store. Use `useGraphStore.getState()` directly when hooks don't cover your use case. Access outside React is supported.

### No GraphQL Required
Unlike Apollo Client, this library's normalization works with REST, GraphQL, WebSocket, Supabase Realtime, Convex, and ElectricSQL — all unified in the same entity graph.

## Common Development Patterns

### Testing a Library Change
1. Make changes in `src/`
2. Run `npm run dev:vite` or `npm run dev:next`
3. Examples hot-reload automatically (no build step)
4. Verify typecheck passes: `npm run typecheck`

### Adding a New Hook
1. Add to appropriate file: `src/hooks.ts` (core), `src/graphql/hooks.ts` (GraphQL), `src/crud/` (CRUD)
2. Export from `src/index.ts`
3. Add JSDoc comment explaining purpose and the problem it solves
4. Use `useRef` for callbacks to avoid stale closure bugs in effects

### Adding a Realtime Adapter
1. Create `src/adapters/your-source.ts`
2. Implement `RealtimeAdapter` interface from `src/adapters/types.ts`
3. Export from `src/index.ts`
4. Add usage example in `examples/vite-app/src/`
5. Adapter emits `ChangeSet` objects; `RealtimeManager` handles graph writes (adapter never touches graph directly)

### Adding a Column Type
1. Add builder to `src/ui/columns.tsx`
2. Return `ColumnDef<T>` with `meta.entityMeta` populated
3. `meta.entityMeta.filterType` drives the filter toolbar control type

## Code Style Requirements

- TypeScript strict mode throughout (see `tsconfig.json`)
- No `any` except where unavoidable at adapter boundaries (document why in comments)
- Immer for all graph mutations (no direct state writes)
- JSDoc required on all public hooks
- Callbacks use `useRef` to avoid stale closures
- Repository source files should use lowercase kebab-case names (for example `dashboard-page.tsx`, `entity-table.tsx`, `use-entity-view.ts`)
- Keep convention-required filenames unchanged (`README.md`, `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `package.json`, etc.)

## File Organization Reference

```
src/
├── graph.ts                  Zustand entity graph (entities, patches, lists)
├── engine.ts                 Fetch dedup, retry, SWR, subscribers
├── hooks.ts                  Core hooks (useEntity, useEntityList, useEntityMutation)
├── index.ts                  Public API (all exports)
│
├── adapters/
│   ├── types.ts              RealtimeAdapter interface, ChangeSet types
│   ├── realtime-manager.ts   Coalescing flush, 16ms batch window
│   ├── realtime-adapters.ts  WebSocket, Supabase RT, Convex, GraphQL-WS
│   └── electricsql.ts        PGlite + ElectricSQL local-first adapter
│
├── graphql/
│   ├── client.ts             GQLClient, EntityDescriptor, normalization
│   └── hooks.ts              useGQLEntity, useGQLList, useGQLMutation, useGQLSubscription
│
├── view/
│   ├── types.ts              FilterSpec, SortSpec, toRestParams/toSQL/toGraphQL
│   ├── evaluator.ts          Local JS filter+sort engine, binary sorted insertion
│   └── useEntityView.ts      local/remote/hybrid mode, realtime entity insertion
│
├── crud/
│   ├── relations.ts          Schema registry, cascade invalidation logic
│   └── useEntityCRUD.ts      Unified list+detail+edit+create, dirty tracking
│
└── ui/
    ├── columns.tsx           Column builders (text, number, date, enum, actions)
    ├── EntityTable.tsx       Full table with inline editing, pagination
    ├── EntitySheets.tsx      EntityDetailSheet, EntityFormSheet
    └── utils.ts              cn() utility

examples/
├── vite-app/                 React 19 + Vite 6, full CRUD demo
│   └── src/
│       ├── schema/           Project/Task/User relation registration
│       ├── mock/             In-memory API with realistic latency
│       └── pages/            Dashboard, Projects, Tasks, Team
│
└── nextjs-app/               Next.js 15, SSR hydration demo
    └── src/
        ├── app/              Server Components + API routes
        └── components/       GraphHydrationProvider (SSR → graph pattern)
```

## Important Constraints

- **Tests**: The library includes Vitest smoke tests (`pnpm run test`). Expand coverage for risky changes; example apps remain useful for manual verification.
- **DevTools**: `useGraphDevTools` is available for lightweight graph inspection. For ad-hoc debugging you can also use `useGraphStore.getState()`.
- **Garbage collection**: Configurable via `configureEngine` (`defaultGcTime`, `gcInterval`) and `startGarbageCollector` / `stopGarbageCollector`. Entities with no subscribers can be evicted after `defaultGcTime`.
- **Suspense**: `useSuspenseEntity` and `useSuspenseEntityList` are implemented for Suspense boundaries (non-null entity id required where applicable).
- **Skills ↔ code sync (immutable)**: Any change to public exports in `src/index.ts` or to architecture rules here must update `prometheus-entity-skills/_shared/references/library-exports.json` (run `pnpm run refresh:exports`) and related skill docs so `pnpm run verify:skills` passes in CI. PR checklist: `.github/pull_request_template.md`.

## Where to Start When Reading Code

1. **Understanding the core**: Read `src/graph.ts` (Zustand store structure) → `src/engine.ts` (fetch machinery) → `src/hooks.ts` (how components use the graph)
2. **Understanding realtime**: Read `src/adapters/types.ts` (ChangeSet contract) → `src/adapters/realtime-manager.ts` (coalescing logic)
3. **Understanding filtering/sorting**: Read `src/view/types.ts` (FilterSpec) → `src/view/evaluator.ts` (local engine) → `src/view/useEntityView.ts` (completeness modes)
4. **Understanding CRUD**: Read `src/crud/relations.ts` (schemas) → `src/crud/useEntityCRUD.ts` (lifecycle management)
5. **Understanding SSR**: Read `examples/nextjs-app/src/components/GraphHydrationProvider.tsx` (SSR → graph pattern)

## v1.3 — Upstream features (Change 13)

| API | File | Plan item |
|-----|------|-----------|
| `createPGlitePersistenceAdapter` | `src/adapters/pglite-persistence.ts` | 13.1 |
| `createTenantScopedElectricAdapter` | `src/adapters/electricsql-tenant.ts` | 13.2 — also fulfils **13.11** (auth-claim-aware shape registration): the `tenantClaim: { companyId }` is the typed seam where authn meets shape registration. Refusing unscoped shapes is the runtime enforcement of RULE 5. |
| `registerEntityFromSql` | `src/schema-from-sql.ts` | 13.3 |
| `startLocalFirstGraph({ retryPolicy })` + `replayActionWithRetry` | `src/local-first-runtime.ts` | 13.6 |
| `useEntityListAsTable` | `src/table/use-entity-list-as-table.ts` | 13.7 |

Items 13.4, 13.5, 13.8, 13.9, 13.10 are deferred to a follow-up release.

## Dependencies

Core library (`src/`) only requires:
- `zustand` (entity graph store foundation)
- `immer` (immutable mutations)

Examples use `@tanstack/react-table` (optional in library users), `@tanstack/react-router` (Vite example routing), and various UI libraries.
