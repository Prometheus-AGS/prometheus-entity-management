# Architecture

Deep technical design notes. Read this if you're contributing to the library core
or integrating it with a non-standard data source.

---

## The Three-Layer Model

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: UI                                                     │
│  EntityTable · EntityDetailSheet · EntityFormSheet · columns.tsx │
│  (optional — library users can build their own UI)              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Access Patterns                                        │
│  useEntity · useEntityList · useEntityView · useEntityCRUD      │
│  useGQLEntity · useGQLList · useLocalFirst · useEntityMutation  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Entity Graph                                           │
│  useGraphStore (Zustand)                                         │
│  entities[type][id] · patches[type][id] · lists[key]            │
└─────────────────────────────────────────────────────────────────┘
              ▲           ▲           ▲           ▲
         REST fetch   GraphQL    WebSocket    ElectricSQL
```

Data always flows **up** into the graph. Components always read **down** from the graph.
There is no sideways data flow between components.

---

## The Entity Graph (graph.ts)

The graph has three main data structures:

### `entities: Record<type, Record<id, data>>`

The canonical store for all server-confirmed entity data. Written by:
- `upsertEntity` (partial merge — new fields layered on top of existing)
- `replaceEntity` (full replace — used after confirmed server writes)
- `removeEntity`

Never written by UI code directly. Always written via hooks or the realtime manager.

### `patches: Record<type, Record<id, patch>>`

Local UI-only augmentations. Written by:
- `patchEntity` — merge new fields into existing patch
- `unpatchEntity` — remove specific keys
- `clearPatch` — remove all augmentations for an entity

**Merge semantics at read time:**
```
readEntity(type, id) = { ...entities[type][id], ...patches[type][id] }
```

The patch layer is intentionally shallow-merged. Nested objects are not deep-merged.
If you need deep-merged patches, apply them to a flat representation first.

**Key design decision:** Patches are never sent to the server. They exist only for
the session lifetime. This makes them safe for UI-only state like `_selected`,
`_expanded`, `_loading`, local draft content, etc.

### `lists: Record<queryKey, ListState>`

List state contains:
- `ids: EntityId[]` — ordered array of entity IDs (refs into the entities graph)
- `total: number | null` — server-reported total count
- `nextCursor / prevCursor` — pagination state
- `hasNextPage / hasPrevPage`
- `isFetching / isFetchingMore / stale / error / lastFetched`

Lists do NOT store entity data — only IDs. This is the core architectural decision
that enables cross-view reactivity: when any entity in a list changes, the list
re-renders without a refetch because its items are read by joining IDs to the
entity graph at render time.

---

---

## The Engine (engine.ts)

The engine handles everything between "a hook wants data" and "data lands in the graph."

### In-flight deduplication

```
const inflight = new Map<string, Promise<unknown>>();

function dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = fn().finally(() => inflight.delete(key));
  inflight.set(key, p);
  return p;
}
```

If 10 components mount simultaneously and all call `useEntity("Post", "123")`,
only one fetch fires. The other 9 receive the same promise. This is process-global —
it works across component trees, not just within a single `QueryClient` scope.

### Subscriber ref-counting

Components register a `Symbol` token on mount and unregister on unmount.
`hasSubscribers(key)` allows the background revalidation listener to skip
entities that nobody is currently watching.

### Stale-while-revalidate

On mount:
1. Check if entity exists in graph
2. Check if `lastFetched` is older than `staleTime` (default 30s)
3. If stale or missing: fire fetch
4. If not stale: render immediately from graph, no fetch

On focus/reconnect (via `attachGlobalListeners`):
1. Mark all currently-subscribed entities stale
2. Each hook's `useEffect` detects `stale === true` and fires a refetch
3. The refetch writes the new data into the graph
4. All subscribers re-render

---

## The View Layer (view/)

### FilterSpec compilation

`FilterSpec` is a transport-agnostic filter description. The same spec compiles to:

| Target | Translator | Example output |
|--------|-----------|----------------|
| REST query params | `toRestParams()` | `?status=published&sort=-createdAt` |
| GraphQL variables | `toGraphQLVariables()` | `{ where: { status: { _eq: "published" } } }` |
| SQL WHERE clause | `toSQLClauses()` | `"status" = $1 ORDER BY "created_at" DESC` |
| Local JS | `matchesFilter()` | `entity.status === "published"` |

Custom predicates (`op: "custom"`) are detected by `hasCustomPredicates()` and
force `completenessMode: "local"`. They are never serialized to any remote form.

### Completeness detection

```ts
function checkCompleteness(loadedCount, total, hasNextPage) {
  if (!hasNextPage && total !== null && loadedCount >= total)
    return { isComplete: true, reason: "all-loaded" };
  if (hasNextPage)
    return { isComplete: false, reason: "has-more-pages" };
  return { isComplete: true, reason: "no-more-pages" };
}
```

`completenessMode` is derived:
- `local` — all data is in the graph, filter/sort in JS, zero network
- `hybrid` — local results shown instantly, remote fetch fires in parallel
- `remote` — filter/sort params forwarded to server, results replace local

`hybrid` is the default when `remoteFetch` is provided and the dataset is incomplete.
It gives sub-16ms first paint (local) with eventual accuracy (remote).

### Realtime sorted insertion

When a realtime change arrives for an entity that matches the current filter,
it needs to appear in the sorted list at the correct position without a full re-sort.

```ts
function findInsertionIndex(entity, sortedIds, getEntity, sort): number {
  // Binary search O(log n) against the current sorted list
  let lo = 0; let hi = sortedIds.length;
  while (lo < hi) {
    const mid = (lo + hi) >>> 1;
    const midEntity = getEntity(sortedIds[mid]);
    if (!midEntity) { lo = mid + 1; continue; }
    if (compareEntities(entity, midEntity, sort) <= 0) hi = mid;
    else lo = mid + 1;
  }
  return lo;
}
```

This is O(log n) per realtime event regardless of list size.

---

## The Realtime Manager (adapters/realtime-manager.ts)

### Change coalescing

Within a 16ms window (one animation frame), changes to the same entity are merged:

```
Incoming: [update Post:123 {status:"archived"}], [update Post:123 {viewCount:42}]
Coalesced: [upsert Post:123 {status:"archived", viewCount:42}]
→ One Zustand write, one React render cycle
```

A `delete` operation always wins and cannot be overridden by a subsequent `upsert`
in the same flush window.

### Why 16ms?

Realtime sources like Supabase can fire multiple changes in rapid succession for
the same row (e.g., a trigger that fires on both `OLD` and `NEW` versions, or
multiple column updates batched from the application). 16ms is one animation frame —
enough time to accumulate these related changes without introducing visible lag.

Set `flushInterval: 0` if you need synchronous (unbatched) behavior.

---

## CRUD Lifecycle (crud/)

### The Edit Buffer Isolation Guarantee

`useEntityCRUD`'s `editBuffer` is **React component state** (`useState`), not a
graph patch. This is intentional:

```
Graph:       { title: "Original", status: "draft" }
editBuffer:  { title: "Edited Title", status: "published" }  ← local only

While editing, PostListView still shows "Original" with status "draft".
Only after save() succeeds does the graph update.
```

The exception is `applyOptimistic()`, which writes the current buffer to the
graph as a patch. Use this for toggle switches, sliders, and other "instant
feedback" controls where the user expects to see the change reflected immediately
across the UI before they click Save.

### Cascade Invalidation

After every successful mutation, `cascadeInvalidation` fires. It:
1. Reads the schema registry for the mutated entity type
2. Compares `previous` and `next` to find changed foreign keys
3. Marks affected list queries stale (they revalidate in the background)
4. Marks affected related entities stale
5. Traverses reverse relations (other schemas pointing at this type)

This is O(schemas) — typically a handful of entries. It runs synchronously
after the API call resolves and before `setMode("detail")` fires.

---

## SSR Hydration (GraphHydrationProvider)

The provider writes entities into the Zustand graph **synchronously in render**,
before React commits to the DOM:

```tsx
if (!hydrated.current && initialEntities.length > 0) {
  hydrated.current = true;
  const store = useGraphStore.getState();
  for (const { type, id, data } of initialEntities) {
    store.upsertEntity(type, id, data);
    store.setEntityFetched(type, id);
  }
}
```

Because Zustand's `getState()` is synchronous and doesn't trigger a re-render
(we're in the render phase of the provider component, not a child), this write
completes before any child component renders. The first `useEntity` / `useEntityView`
call in any child sees the data immediately.

This differs from TanStack Query's `dehydrate/hydrate`:
- TQ hydrates the `QueryClient`'s internal cache, which is scoped to queries
- This library hydrates the entity graph, which is scoped to entities
- A TQ dehydrated post query only pre-populates `["post", "123"]`
- This library's hydrated `Post:123` entity is immediately available to every
  `useEntity("Post", "123")` call anywhere in the component tree — including
  in components that were never involved in the original server fetch
