# @prometheus-ags/entity-graph-solid

SolidJS bindings for `@prometheus-ags/entity-graph-core` — fine-grained reactive entity and list primitives backed by the normalized entity graph.

## Architecture

```
Component (SolidJS)
  └─ createEntity / createEntityList  (this package, Layer 2)
       └─ core engine fetchEntity / fetchList  (entity-graph-core, Layer 1)
            └─ useGraphStore (Zustand, Layer 0)
```

Components access data only through `createEntity` / `createEntityList`. The store (Zustand) is the single source of truth; SolidJS signals mirror it for fine-grained reactivity.

## Installation

```bash
pnpm add @prometheus-ags/entity-graph-solid @prometheus-ags/entity-graph-core solid-js
```

## Quick Start

### 1. Configure the engine once at app boot

```ts
// src/index.tsx
import { setupGraphProvider } from "@prometheus-ags/entity-graph-solid";
import { registerEntityTransport, makeRestTransport } from "@prometheus-ags/entity-graph-core";

// Register transports at startup — one per entity type.
registerEntityTransport("Invoice", makeRestTransport({ baseUrl: "/api" }));

// Wire focus/reconnect listeners and GC.
const cleanup = setupGraphProvider({ staleTime: 60_000 });
```

### 2. Fetch a single entity

```tsx
import { createEntity } from "@prometheus-ags/entity-graph-solid";
import { createSignal, Show } from "solid-js";

interface Invoice {
  id: string;
  amount: number;
  status: "draft" | "paid";
}

function InvoiceDetail(props: { id: string }) {
  const invoice = createEntity<{ id: string; amount: number; status: string }, Invoice>({
    type: "Invoice",
    id: () => props.id,
    fetch: (id) => fetch(`/api/invoices/${id}`).then((r) => r.json()),
    normalize: (raw) => ({ id: raw.id, amount: raw.amount, status: raw.status as Invoice["status"] }),
  });

  return (
    <Show when={!invoice.isLoading()} fallback={<p>Loading…</p>}>
      <Show when={invoice.data()} fallback={<p>Not found</p>}>
        {(inv) => (
          <div>
            <h1>Invoice #{inv().id}</h1>
            <p>Amount: ${inv().amount}</p>
            <p>Status: {inv().status}</p>
          </div>
        )}
      </Show>
    </Show>
  );
}
```

### 3. Fetch a reactive list

```tsx
import { createEntityList } from "@prometheus-ags/entity-graph-solid";
import { createSignal, For, Show } from "solid-js";

function InvoiceList() {
  const [status, setStatus] = createSignal<string>("all");

  const invoices = createEntityList<{ id: string; amount: number }, Invoice>({
    type: "Invoice",
    queryKey: () => ["invoices", { status: status() }],
    fetch: ({ cursor, params }) =>
      fetch(`/api/invoices?cursor=${cursor ?? ""}&status=${params?.status ?? "all"}`)
        .then((r) => r.json()),
    normalize: (raw) => ({
      id: raw.id,
      data: { id: raw.id, amount: raw.amount, status: "draft" },
    }),
  });

  return (
    <div>
      <button onClick={() => setStatus("paid")}>Show paid</button>
      <Show when={invoices.isLoading()}>
        <p>Loading…</p>
      </Show>
      <For each={invoices.items()}>
        {(inv) => <div>{inv.id} — ${inv.amount}</div>}
      </For>
      <Show when={invoices.hasNextPage()}>
        <button
          onClick={() => invoices.fetchNextPage()}
          disabled={invoices.isLoadingMore()}
        >
          Load more
        </button>
      </Show>
    </div>
  );
}
```

### 4. Ad-hoc graph slice

```ts
import { createGraphStore } from "@prometheus-ags/entity-graph-solid";

// Fine-grained accessor for any graph slice.
const invoiceCount = createGraphStore(
  (s) => Object.keys(s.entities["Invoice"] ?? {}).length,
);

console.log(invoiceCount()); // reactive SolidJS signal
```

## API Reference

### `createEntity(opts)`

| Option | Type | Description |
|--------|------|-------------|
| `type` | `string` | Entity kind (graph partition key). |
| `id` | `() => string \| null` | Reactive id accessor. |
| `fetch` | `(id) => Promise<TRaw>` | Transport fetch function. |
| `normalize` | `(raw) => TEntity` | Maps raw response to canonical shape. |
| `idField` | `string` | Id field name in normalized entity (default `"id"`). |
| `staleTime` | `number` | Cache freshness in ms. |
| `enabled` | `() => boolean` | Gate fetching. |
| `onSuccess` | `(entity) => void` | Called after successful graph write. |
| `onError` | `(error) => void` | Called after all retries fail. |

**Returns** `{ data, isLoading, isRefetching, error, typedError, refetch, entityState }`

### `createEntityList(opts)`

| Option | Type | Description |
|--------|------|-------------|
| `type` | `string` | Entity kind. |
| `queryKey` | `() => unknown[]` | Reactive list cache key. |
| `fetch` | `(params) => Promise<ListResult>` | Transport fetcher. |
| `normalize` | `(raw) => { id, data }` | Per-row normalizer. |
| `mode` | `"replace" \| "append"` | Replace list or append (infinite scroll). |
| `staleTime` | `number` | Cache freshness in ms. |
| `enabled` | `() => boolean` | Gate fetching. |

**Returns** `{ items, isLoading, isLoadingMore, error, typedError, total, hasNextPage, hasPrevPage, fetchNextPage, refetch, listState }`

### `createGraphStore(selector, equalityFn?)`

Returns a fine-grained SolidJS accessor that updates when the selected graph slice changes.

### `setupGraphProvider(opts?)`

Configures the engine and attaches browser listeners. Call once at app startup. Returns a cleanup function.

## Error Handling

```tsx
import { TerminalError, TransientError } from "@prometheus-ags/entity-graph-solid";

const invoice = createEntity({ ... });

// String error (always available):
<Show when={invoice.error()}><p>Error: {invoice.error()}</p></Show>

// Typed error (list variant):
const list = createEntityList({ ... });
const err = list.typedError();
if (err instanceof TerminalError) {
  // 4xx — do not offer a retry button
} else if (err instanceof TransientError) {
  // 5xx / network — show retry button
}
```

## License

MIT
