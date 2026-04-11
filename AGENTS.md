<!-- superpowers-codex bootstrap (managed) -->
## Superpowers Bootstrap (Codex)

<IMPORTANT>
You have access to Superpowers skills.

**Skill bootstrap instructions:**
- Load and follow `/Users/gqadonis/.codex/superpowers/SKILL.md` before doing anything else.
- After loading it, announce: "Using Superpowers bootstrap skill to guide skill usage."
</IMPORTANT>
<!-- /superpowers-codex bootstrap -->

# Repository Guidance

This file provides guidance to coding agents working anywhere in this repository.

## Scope

- These rules apply to the core library and all example applications in this repo.
- Treat the architectural rules in this file as non-negotiable.
- If a proposed change would violate these rules, stop and choose a different design.

## Project Overview

`@prometheus-ags/prometheus-entity-management` is a normalized, globally reactive entity graph store for React built on Zustand.

It solves the data siloing problem created by query-owns-data approaches by keeping a single application-wide entity graph. Updating one entity in one place should immediately update every view that reads that entity.

**Core philosophy:** queries are instructions to populate the graph. The graph is the single source of truth. Lists store ordered arrays of entity IDs, never copies of entity data.

## Non-Negotiable Architectural Rules

**Critical:** these rules can never be broken.

### Package Management

- `pnpm` is the only package manager for this monorepo.
- Never use `npm` or `yarn` for installation or dependency management.

### Data Flow Architecture

The architecture is strictly layered:

```text
Components → Hooks → Stores → APIs/Realtime
    ↓         ↓        ↓
  (read)   (orchestrate) (fetch/sync)
```

#### Components

- Components must only use hooks to access data.
- Do not call `useGraphStore` directly from component files.
- Hooks define the data flow and provide the component-facing view.

#### Hooks

- Hooks orchestrate data flow between components and stores.
- Hooks must not talk to APIs or external services directly.
- Fetch, mutation, and realtime logic belongs in stores or adapters.
- Hooks call store methods; stores handle the actual I/O.

#### Stores and Adapters

- Stores own external communication.
- Stores talk to REST, GraphQL, and other external APIs.
- Stores and adapters set up realtime subscriptions.
- Stores manage caching, invalidation, synchronization, and writes to the entity graph.

### Why This Matters

- Breaking these rules creates data silos.
- Breaking these rules breaks cross-view reactivity.
- Breaking these rules defeats the purpose of the normalized entity graph.

## Development Commands

```bash
# Install all workspace dependencies
pnpm install

# Run example applications
pnpm run dev:vite      # Vite example → http://localhost:5173
pnpm run dev:next      # Next.js example → http://localhost:3000

# Type checking
pnpm run typecheck
pnpm run typecheck:vite
pnpm run typecheck:next

# Build examples
pnpm run build:vite
pnpm run build:next

# Cleanup
pnpm run clean
```

**Important:** there is no standalone library build step during development. The examples resolve `@prometheus-ags/prometheus-entity-management` directly to `../../src/index.ts` through TypeScript path aliases. Vite and Next.js handle compilation during development.

## Architecture: Three-Layer Model

```text
┌──────────────────────────────────────────────────────────────┐
│ Layer 3: UI Components                                      │
│ src/ui/                                                     │
│ EntityTable · EntityDetailSheet · EntityFormSheet · columns │
├──────────────────────────────────────────────────────────────┤
│ Layer 2: Access Patterns                                    │
│ src/hooks.ts, src/graphql/hooks.ts, src/crud/               │
│ useEntity · useEntityList · useEntityView · useEntityCRUD   │
│ useGQLEntity · useEntityMutation · useEntityAugment         │
├──────────────────────────────────────────────────────────────┤
│ Layer 1: Entity Graph                                       │
│ src/graph.ts                                                │
│ entities[type][id] · patches[type][id] · lists[queryKey]    │
└──────────────────────────────────────────────────────────────┘
              ▲           ▲           ▲           ▲
         REST fetch   GraphQL    WebSocket    ElectricSQL
```

- Data flows upward into Layer 1.
- Components read downward from the graph.
- There is no sideways data flow between components.

## The Entity Graph

The graph in `src/graph.ts` is a Zustand store with three core structures:

1. `entities: Record<type, Record<id, data>>`
   - Canonical storage for server-confirmed entity data.
   - Written by `upsertEntity`, `replaceEntity`, and `removeEntity`.
   - Never written by UI code directly.

2. `patches: Record<type, Record<id, patch>>`
   - Local UI-only augmentations such as `_selected`, `_expanded`, and `_loading`.
   - Written by `patchEntity`, `unpatchEntity`, and `clearPatch`.
   - Never sent to the server.
   - Read-time merge rule: `readEntity(type, id) = { ...entities[type][id], ...patches[type][id] }`.

3. `lists: Record<queryKey, ListState>`
   - Ordered arrays of entity IDs plus pagination and fetching state.
   - Includes fields like `ids`, `total`, `nextCursor`, `hasNextPage`, and `isFetching`.
   - Lists never store entity data directly.

**Key architectural decision:** lists store IDs, not data. That is what allows cross-view reactivity: when one entity changes, every list containing that ID can update by joining IDs against the graph at render time.

## The Engine

`src/engine.ts` handles the machinery between a hook requesting data and data landing in the graph.

- In-flight deduplication uses a process-global `Map<key, Promise>` so concurrent identical fetches collapse into one request.
- Subscriber ref-counting registers and unregisters `Symbol` tokens on mount and unmount.
- Background revalidation skips entities with no subscribers.
- Stale-while-revalidate is the default behavior.
- Entities older than `staleTime` default to background refetch after 30 seconds.
- On focus or reconnect, all subscribed entities are marked stale and revalidated.

## The View Layer

The view layer in `src/view/` uses a transport-agnostic `FilterSpec`.

The same filter spec can compile to:

- REST query params
- GraphQL variables
- SQL `WHERE` clauses
- Local JavaScript predicates

### Completeness Modes

- `local`: all required data is already in the graph, so filtering and sorting happen in JavaScript with zero network.
- `remote`: data is incomplete locally, so filter and sort instructions are forwarded to the server.
- `hybrid`: local results render immediately and a remote fetch runs in parallel.

### Realtime Sorted Insertion

- Realtime updates use binary search for sorted insertion.
- The goal is to place incoming entities in the correct sorted position without a full re-sort.

## The Realtime Manager

`src/adapters/realtime-manager.ts` coalesces changes inside a 16ms window so repeated updates to the same entity collapse into a single Zustand write and a single React render cycle.

- This prevents Supabase, WebSocket, or other rapid update sources from thrashing the UI.
- Set `flushInterval: 0` only when synchronous unbatched behavior is explicitly needed.

## CRUD Lifecycle

### Edit Buffer Isolation

`useEntityCRUD` keeps its `editBuffer` in React component state via `useState`, not in the graph patches layer.

- While editing, other views continue showing the original data.
- The graph updates after `save()` succeeds.
- `applyOptimistic()` is the exception: it writes the buffer to the graph as a patch for immediate feedback such as toggles or sliders.

### Cascade Invalidation

After every successful mutation, `cascadeInvalidation()`:

1. Reads relation schemas from the registry.
2. Compares previous and next values to find changed foreign keys.
3. Marks affected list queries stale for background revalidation.
4. Marks related entities stale.
5. Traverses reverse relations.

## Key Concepts and Design Decisions

### Entities Live Exactly Once

- Never store a copy of an entity.
- Always `upsertEntity` into the graph and store only references such as IDs elsewhere.

### Queries Are Instructions, Not Containers

- `useEntity` and `useEntityList` describe what to fetch and how to normalize it.
- They do not own the resulting data.
- The graph owns the data.

### Local Patches Are Visible Everywhere

- `patchEntity` and `useEntityAugment` write to the patches layer.
- Patches merge at read time.
- Any subscriber to that entity sees the patch across list views, detail views, and other hooks.

### The Graph Is Zustand

- `useGraphStore` is a plain Zustand store.
- `useGraphStore.getState()` is appropriate when hooks do not cover the use case or when debugging outside React.
- This does not override the rule that components must not read stores directly.

### No GraphQL Requirement

- The normalization model is backend-agnostic.
- It is designed to work with REST, GraphQL, WebSocket, Supabase Realtime, Convex, and ElectricSQL within one entity graph.

## Common Development Patterns

### Testing a Library Change

1. Make changes in `src/`.
2. Run `pnpm run dev:vite` or `pnpm run dev:next`.
3. Use the example apps for manual verification and hot reload.
4. Verify type checking with `pnpm run typecheck`.

### Adding a New Hook

1. Add the hook in `src/hooks.ts`, `src/graphql/hooks.ts`, or `src/crud/` as appropriate.
2. Export it from `src/index.ts`.
3. Add JSDoc describing the purpose and the problem it solves.
4. Use `useRef` for callbacks when needed to avoid stale closure bugs in effects.

### Adding a Realtime Adapter

1. Create `src/adapters/your-source.ts`.
2. Implement the `RealtimeAdapter` interface from `src/adapters/types.ts`.
3. Export it from `src/index.ts`.
4. Add a usage example in `examples/vite-app/src/`.
5. Emit `ChangeSet` objects from the adapter and let `RealtimeManager` handle graph writes.

### Adding a Column Type

1. Add the builder to `src/ui/columns.tsx`.
2. Return a `ColumnDef<T>` with `meta.entityMeta` populated.
3. Ensure `meta.entityMeta.filterType` drives the filter toolbar control type.

## Code Style Requirements

- TypeScript strict mode throughout.
- Avoid `any` except at unavoidable adapter boundaries, and document why when used.
- Use Immer for graph mutations.
- Do not write graph state directly.
- Add JSDoc to all public hooks.
- Use `useRef` for callbacks where needed to prevent stale closures.
- Repository source files should use lowercase kebab-case names (for example `dashboard-page.tsx`, `entity-table.tsx`, `use-entity-view.ts`).
- Keep convention-required filenames unchanged (`README.md`, `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `package.json`, etc.).

## File Organization Reference

```text
src/
├── graph.ts                  Zustand entity graph
├── engine.ts                 Fetch dedup, retry, SWR, subscribers
├── hooks.ts                  Core hooks
├── index.ts                  Public API
│
├── adapters/
│   ├── types.ts              RealtimeAdapter interface, ChangeSet types
│   ├── realtime-manager.ts   Coalescing flush, 16ms batch window
│   ├── realtime-adapters.ts  WebSocket, Supabase RT, Convex, GraphQL-WS
│   └── electricsql.ts        PGlite + ElectricSQL adapter
│
├── graphql/
│   ├── client.ts             GraphQL client and normalization
│   └── hooks.ts              GraphQL hooks
│
├── view/
│   ├── types.ts              FilterSpec and transport compilers
│   ├── evaluator.ts          Local filter and sort engine
│   └── useEntityView.ts      Local, remote, and hybrid behavior
│
├── crud/
│   ├── relations.ts          Schema registry and cascade invalidation
│   └── useEntityCRUD.ts      CRUD orchestration and dirty tracking
│
└── ui/
    ├── columns.tsx           Column builders
    ├── EntityTable.tsx       Table UI
    ├── EntitySheets.tsx      Detail and form sheets
    └── utils.ts              `cn()` utility

examples/
├── vite-app/
│   └── src/
│       ├── schema/
│       ├── mock/
│       └── pages/
│
└── nextjs-app/
    └── src/
        ├── app/
        └── components/
```

## Important Constraints

- **Tests**: Vitest smoke tests run in CI (`pnpm run test`). Use example apps for deeper manual checks when changing behavior.
- **DevTools**: `useGraphDevTools` is available; `useGraphStore.getState()` remains valid for debugging outside React.
- **Garbage collection**: Engine supports GC via `configureEngine` and `startGarbageCollector` (see `src/engine.ts`).
- **Suspense**: `useSuspenseEntity` and `useSuspenseEntityList` are implemented.
- **Skills ↔ code sync (immutable)**: Any PR that changes public exports in `src/index.ts` or architecture rules documented here must update `prometheus-entity-skills/_shared/references/library-exports.json` (and related skill docs) so CI (`pnpm run verify:skills`) passes. Use the PR template checklist (`.github/pull_request_template.md`).

## Where to Start When Reading Code

1. Core graph flow: `src/graph.ts` → `src/engine.ts` → `src/hooks.ts`
2. Realtime flow: `src/adapters/types.ts` → `src/adapters/realtime-manager.ts`
3. Filter and sort flow: `src/view/types.ts` → `src/view/evaluator.ts` → `src/view/useEntityView.ts`
4. CRUD flow: `src/crud/relations.ts` → `src/crud/useEntityCRUD.ts`
5. SSR flow: `examples/nextjs-app/src/components/GraphHydrationProvider.tsx`

## Dependencies

Core library dependencies in `src/`:

- `zustand`
- `immer`

Example applications additionally use libraries such as:

- `@tanstack/react-table`
- `@tanstack/react-router`
- Next.js and related UI dependencies

## Coverage Notes

This `AGENTS.md` intentionally carries forward all repository rules and architectural guidance from `CLAUDE.md`, while rewriting them for Codex and other coding agents.

In particular, it preserves:

- the `pnpm`-only package policy
- the strict components → hooks → stores → external systems layering
- the entity graph data model and ID-only list rule
- the engine, view, realtime, and CRUD behavior expectations
- development workflows for hooks, adapters, columns, and manual verification
- code style requirements, repo map, reading order, and known limitations
