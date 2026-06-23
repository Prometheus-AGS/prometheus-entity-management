# @prometheus-ags/entity-graph-alpine

Alpine.js plugin for the [Prometheus entity graph](../../README.md). Registers
`$entity(type, id)` and `$entityList(type, query)` magics that wire the
framework-agnostic `@prometheus-ags/entity-graph-core` Zustand store into
Alpine's reactive system via `Alpine.reactive()`.

## Installation

```bash
pnpm add @prometheus-ags/entity-graph-alpine alpinejs
```

## Quick Start

```js
import Alpine from "alpinejs";
import {
  EntityGraphAlpinePlugin,
} from "@prometheus-ags/entity-graph-alpine";
import {
  registerEntityTransport,
  makeRestTransport,
} from "@prometheus-ags/entity-graph-core";

// 1. Register entity transports at app boot (once per entity type).
registerEntityTransport(
  "Invoice",
  makeRestTransport({ supabase, table: "invoice" }),
);

// 2. Install the plugin before Alpine.start().
Alpine.plugin(EntityGraphAlpinePlugin);

// 3. Start Alpine.
Alpine.start();
```

## Magics

### `$entity(type, id)`

Returns an `AlpineEntitySnapshot` whose properties update automatically when
the underlying graph slice changes.

```html
<div x-data="{ inv: $entity('Invoice', invoiceId) }">
  <p x-show="inv.isLoading">Loading…</p>
  <p x-show="inv.error" x-text="'Error: ' + inv.error"></p>
  <div x-show="inv.isReady">
    <h2 x-text="inv.data.title"></h2>
    <span x-text="inv.data.amount"></span>
  </div>
  <button @click="inv.refetch()">Refresh</button>
</div>
```

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | Merged entity (`canonical + patches`), or `null` if not loaded |
| `isLoading` | `boolean` | `true` while a fetch is in flight |
| `error` | `string \| null` | Last fetch error message |
| `isReady` | `boolean` | `true` when data is present and not loading |
| `refetch()` | `() => void` | Invalidate and re-fetch |
| `destroy()` | `() => void` | Release graph subscription (called automatically on component destroy) |

### `$entityList(type, query)`

Returns an `AlpineEntityList` whose `items` update automatically when any entity
in the list changes anywhere in the app.

```html
<div x-data="{ list: $entityList('Invoice', { queryKey: ['invoices'], limit: 20 }) }">
  <p x-show="list.isLoading">Loading…</p>
  <ul>
    <template x-for="item in list.items" :key="item.id">
      <li x-text="item.title"></li>
    </template>
  </ul>
  <p x-show="list.total !== null" x-text="list.items.length + ' / ' + list.total"></p>
  <button @click="list.loadMore()" x-show="list.hasNextPage" :disabled="list.isLoadingMore">
    Load more
  </button>
</div>
```

| Property | Type | Description |
|----------|------|-------------|
| `items` | `T[]` | Resolved entities in list order |
| `isLoading` | `boolean` | `true` while the first page loads |
| `isLoadingMore` | `boolean` | `true` while loading additional pages |
| `error` | `string \| null` | Last fetch error |
| `hasNextPage` | `boolean` | `true` when more pages are available |
| `total` | `number \| null` | Server-reported total row count |
| `loadMore()` | `() => void` | Fetch the next page |
| `refetch()` | `() => void` | Reset and re-fetch from page one |
| `destroy()` | `() => void` | Release graph subscription |

#### Query Options

```ts
interface AlpineListQuery {
  queryKey: unknown[] | string; // Stable cache key
  filter?: Record<string, unknown>; // Transport-agnostic filter
  search?: string;               // Free-text search
  limit?: number;                // Page size
  enabled?: boolean;             // Default true
  staleTime?: number;            // ms; overrides engine default
}
```

## Custom Magic Names

Use `createEntityGraphPlugin` when another plugin already claims `$entity`:

```js
import { createEntityGraphPlugin } from "@prometheus-ags/entity-graph-alpine";

Alpine.plugin(
  createEntityGraphPlugin({ entityMagicName: "$ent", listMagicName: "$entList" })
);
```

## How It Works

1. The plugin calls `Alpine.magic(name, factory)` for each magic.
2. Each factory creates an internal reactive cell via `Alpine.reactive({})`.
3. The cell subscribes to `useGraphStore` from `@prometheus-ags/entity-graph-core`
   using Zustand's `subscribe` with a selector. When the graph slice changes,
   the cell properties are updated — Alpine's reactivity system detects the
   mutation and schedules re-renders for any template expression that read them.
4. On component `destroy()` (or when Alpine calls the registered `cleanup` fn),
   the Zustand subscription is torn down and the engine subscriber token is
   released (enabling garbage collection of idle entities).

## Prerequisites

- `alpinejs >= 3.13`
- `@prometheus-ags/entity-graph-core` at the same version (already a dependency)

Entity fetching requires at least one transport registered via
`registerEntityTransport(type, transport)` before Alpine starts. See
[entity-graph-core README](../entity-graph-core/README.md) for transport setup.

## License

MIT
