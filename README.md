# @prometheus-ags/prometheus-entity-management

**Normalized, globally-reactive entity graph store for React**

Update a post in one screen and every list row, detail panel, and badge that reads that entity updates automatically—without hand-maintained query keys. Normalization is built around your `type` + `id` + `normalize` function, not a separate cache product. The same graph holds data from **REST**, **GraphQL**, **WebSocket / Supabase / Convex**, **Prisma-shaped APIs**, and **ElectricSQL + PGlite** local-first sync.

### Documentation map

| Doc | Purpose |
|-----|---------|
| [docs/tanstack-query-and-table.md](docs/tanstack-query-and-table.md) | How this library fits with TanStack Query and TanStack Table |
| [docs/advanced.md](docs/advanced.md) | Engine, GC, Suspense, DevTools, SSR, testing |
| [RELEASING.md](RELEASING.md) | Versioning, `prepublishOnly`, npm publish |
| [CHANGELOG.md](CHANGELOG.md) | Release history |

---

## Quick start

### 1. Install

```bash
npm install @prometheus-ags/prometheus-entity-management zustand immer
```

(`pnpm` and `yarn` work the same way for app dependencies.)

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
| `useGraphStore` | Zustand store: `entities`, `patches`, `lists`, and graph mutations. Prefer hooks in UI; `getState()` is for effects/adapters. |
| `configureEngine` | App-wide defaults: stale time, retries, GC interval, GC time, etc. |
| `getEngineOptions` | Read merged engine options. |
| `serializeKey` | Stable string key for list `queryKey` serialization. |
| `fetchEntity` | Imperative single-entity fetch with dedupe and graph write (for custom hooks/adapters). |
| `fetchList` | Imperative list fetch with dedupe and graph write. |
| `dedupe` | Process-global in-flight promise deduplication helper. |
| `startGarbageCollector` / `stopGarbageCollector` | Periodic eviction of unsubscribed, stale entities (also started via `configureEngine`). |

### Hooks (REST-oriented)

| Export | Description |
|--------|-------------|
| `useEntity` | Subscribe to one entity; fetch/normalize into graph; SWR + subscriber-aware refetch. |
| `useEntityList` | Subscribe to a list query key; stores IDs; merges row data from graph. |
| `useEntityMutation` | Mutate with optional optimistic updates and list invalidation hooks. |
| `useEntityAugment` | Patch UI-only fields merged at read time across all subscribers. |
| `useSuspenseEntity` | Suspense variant of `useEntity` (non-null `id` required). |
| `useSuspenseEntityList` | Suspense variant of `useEntityList`. |

### View

| Export | Description |
|--------|-------------|
| `useEntityView` | Filter/sort/search with `local` / `remote` / `hybrid` completeness modes. |
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

### Local-first

| Export | Description |
|--------|-------------|
| `createElectricAdapter` | ElectricSQL / PGlite changes → graph. |
| `useLocalFirst` | Hook for local-first workflows with the adapter. |
| `usePGliteQuery` | Run queries against PGlite in sync with the graph story. |

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

`GraphState`, `EntityState`, `ListState`, `EntityType`, `EntityId`, `EngineOptions`, `EntityQueryOptions`, `ListQueryOptions`, `ViewDescriptor`, `EntitySchema`, `RelationDescriptor`, realtime adapter types, GraphQL types, CRUD types, column meta types — all exported from the package entry.

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
| **Next.js app** | [`examples/nextjs-app/`](examples/nextjs-app/) | Same feature set as the Vite example (Project/Task/User CRUD, realtime, engine settings, pure list view, TanStack Query → graph bridge). **SSR:** `GraphHydrationProvider` seeds the client graph from the shared demo data on first load |

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
