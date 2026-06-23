# @prometheus-ags/entity-graph-svelte

Svelte 5 runes bindings for the [Prometheus entity graph](../../README.md).

Wraps `@prometheus-ags/entity-graph-core` with reactive stores that update
automatically when the underlying entity graph changes — no polling, no prop-
drilling, full cross-view reactivity.

---

## Installation

```bash
pnpm add @prometheus-ags/entity-graph-svelte @prometheus-ags/entity-graph-core
```

---

## Quick start

### 1. Bootstrap the engine (once, at app root)

```ts
// src/routes/+layout.svelte or App.svelte
import { initEntityGraph } from "@prometheus-ags/entity-graph-svelte";

initEntityGraph({ defaultStaleTime: 30_000, globalListeners: true });
```

### 2. Register a transport (once at boot)

```ts
import {
  registerEntityTransport,
  makeRestTransport,
} from "@prometheus-ags/entity-graph-core";

registerEntityTransport(
  "Invoice",
  makeRestTransport({ baseUrl: "/api/invoices" })
);
```

### 3. Use `createEntityStore` in a component

`createEntityStore` returns a plain object whose properties are tracked by
Svelte 5 when accessed inside `{#if}` / `{#each}` / `{@html}` / `$derived`
expressions. Wrap it in `$state()` so mutations to `store.entity` etc. are
reactive.

```svelte
<script lang="ts">
  import { createEntityStore } from "@prometheus-ags/entity-graph-svelte";
  import { onDestroy } from "svelte";

  const { id } = $props<{ id: string }>();

  const store = $state(
    createEntityStore<RawInvoice, Invoice>("Invoice", {
      id,
      fetch: (id) => fetch(`/api/invoices/${id}`).then((r) => r.json()),
      normalize: (raw) => raw,
    })
  );

  onDestroy(() => store.destroy());
</script>

{#if store.isLoading}
  <p>Loading…</p>
{:else if store.error}
  <p>Error: {store.error}</p>
{:else if store.entity}
  <h1>{store.entity.title}</h1>
  <button onclick={() => store.refetch()}>Refresh</button>
{/if}
```

### 4. Use `createEntityList` for collections

```svelte
<script lang="ts">
  import { createEntityList } from "@prometheus-ags/entity-graph-svelte";
  import { onDestroy } from "svelte";

  const list = $state(
    createEntityList<RawInvoice, Invoice>("Invoice", {
      queryKey: ["invoices"],
      fetch: ({ cursor }) =>
        fetch(`/api/invoices?cursor=${cursor ?? ""}`).then((r) => r.json()),
      normalize: (raw) => ({ id: raw.id, data: raw }),
    })
  );

  onDestroy(() => list.destroy());
</script>

{#if list.isLoading}
  <p>Loading…</p>
{:else}
  {#each list.items as invoice (invoice.id)}
    <InvoiceRow {invoice} />
  {/each}
  {#if list.hasNextPage}
    <button onclick={() => list.loadMore()} disabled={list.isLoadingMore}>
      {list.isLoadingMore ? "Loading…" : "Load more"}
    </button>
  {/if}
{/if}
```

---

## API

### `createEntityStore<TRaw, TEntity>(type, opts): EntityStore<TEntity>`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `id` | `string \| null \| undefined` | yes | Entity primary key |
| `fetch` | `(id: string) => Promise<TRaw>` | yes | Transport fetcher |
| `normalize` | `(raw: TRaw) => TEntity` | yes | Row normalizer |
| `enabled` | `boolean` | no | Skip fetch when false (default: `true`) |
| `staleTime` | `number` | no | Override global stale time (ms) |
| `idField` | `string` | no | Field containing the entity id (default: `"id"`) |

**Returns** `EntityStore<TEntity>`:

| Property | Type | Description |
|----------|------|-------------|
| `entity` | `TEntity \| null` | Merged canonical + patch view |
| `isLoading` | `boolean` | Fetch in flight |
| `error` | `string \| null` | Last fetch error |
| `isReady` | `boolean` | Entity loaded and not fetching |
| `refetch()` | `() => void` | Force refresh |
| `destroy()` | `() => void` | Cleanup — call from `onDestroy` |

---

### `createEntityList<TRaw, TEntity>(type, opts): EntityList<TEntity>`

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `queryKey` | `unknown[]` | yes | Stable cache key array |
| `fetch` | `(params: ListFetchParams) => Promise<ListResponse<TRaw>>` | yes | List fetcher |
| `normalize` | `(raw: TRaw) => { id: string; data: TEntity }` | yes | Row normalizer |
| `enabled` | `boolean` | no | Skip fetch when false |
| `staleTime` | `number` | no | Override global stale time (ms) |
| `mode` | `"replace" \| "append"` | no | Pagination strategy |

**Returns** `EntityList<TEntity>`:

| Property | Type | Description |
|----------|------|-------------|
| `items` | `TEntity[]` | Resolved entity rows |
| `isLoading` | `boolean` | Full-page fetch in flight |
| `isLoadingMore` | `boolean` | Load-more in flight |
| `error` | `string \| null` | Last list error |
| `hasNextPage` | `boolean` | More pages available |
| `total` | `number \| null` | Server-reported total |
| `refetch()` | `() => void` | Reset and re-fetch page 1 |
| `loadMore()` | `() => void` | Fetch next page (append) |
| `destroy()` | `() => void` | Cleanup |

---

### `initEntityGraph(opts?)`

Bootstrap the graph engine. Must be called once before any store is created.

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `globalListeners` | `boolean` | `true` | Attach focus/reconnect SWR listeners |
| `defaultStaleTime` | `number` | `30_000` | Global stale time (ms) |
| `maxRetries` | `number` | `3` | Retry count on transient errors |
| (all `EngineOptions`) | — | — | Forwarded to `configureEngine` |

---

## Cross-view reactivity

The entity graph is a **single** normalized store. When any adapter writes to
`entities["Invoice"]["inv-1"]`, every `createEntityStore` and
`createEntityList` that references that id re-renders automatically — no
cache invalidation needed.

---

## Architecture

```
Svelte component
  └── createEntityStore / createEntityList  (this package)
        └── useGraphStore.subscribe()       (entity-graph-core)
              ├── fetchEntity / fetchList   (core engine)
              └── graph mutations           (core graph.ts)
```

Components never touch the graph store directly. All I/O is owned by core.
