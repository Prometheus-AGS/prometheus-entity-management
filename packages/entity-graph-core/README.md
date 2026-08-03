# `@prometheus-ags/entity-graph-core`

Framework-neutral normalized entity graph for the Prometheus entity-management ecosystem. The package contains no React code. React, Svelte, Solid, Alpine, Lit, Tauri, and other bindings share this graph so an entity is stored once and every subscribed view observes the same value.

## Install

```bash
pnpm add @prometheus-ags/entity-graph-core
```

The core runtime depends on Zustand and Immer. Optional integrations such as AG-UI, Loro, and Tauri SQL are loaded only when their adapters are used.

## The data model

The graph keeps three distinct structures:

- `entities[type][id]` is canonical server-confirmed data.
- `patches[type][id]` contains local UI-only augmentation merged at read time.
- `lists[queryKey].ids` contains ordered identifiers, never copied entity records.

This ID-only list rule is what makes cross-view updates reliable: changing one canonical entity updates every list, detail view, and relation that reads that identifier.

## Register a transport

Register I/O once at application boot. Framework hooks call store and engine methods; transports and adapters own external communication.

```ts
import {
  registerEntityTransport,
} from "@prometheus-ags/entity-graph-core";

registerEntityTransport("users", {
  identify: (user) => user.id,
  authoritative: false,
  async list(query) {
    const response = await fetch(`/api/users?limit=${query.limit ?? 50}`, {
      signal: query.signal,
    });
    const rows = await response.json();
    return { rows, total: rows.length, nextCursor: null };
  },
});
```

Custom transports implement `EntityTransport<T>` with `identify`, `authoritative`, and `list`; `get` and `subscribe` are optional.

## Create, read, and update graphs outside a UI framework

```ts
import {
  createGraphStore,
  graphStore,
} from "@prometheus-ags/entity-graph-core";

const graph = graphStore.getState();

graph.upsertEntity("users", "user-1", {
  id: "user-1",
  name: "Ada Lovelace",
});

graph.setListResult("users:active", ["user-1"], {
  total: 1,
  hasNextPage: false,
});

const user = graphStore.getState().readEntity("users", "user-1");

// Isolated stores are useful for SSR requests, tests, and workers.
const requestGraph = createGraphStore();
requestGraph.getState().upsertEntity("users", "request-user", {
  id: "request-user",
  name: "Grace Hopper",
});
```

UI components should consume the hooks provided by their framework binding instead of reading the store directly.

The deprecated core `useGraphStore` name is a StoreApi-shaped alias for `graphStore`, not a React hook. React consumers import the callable `useGraphStore(selector)` hook from `@prometheus-ags/prometheus-entity-management`. See the repository's `release/framework-neutral-core.md` migration contract for the complete boundary.

## Optional Loro merge strategy

`loro-crdt` remains an optional peer. Node consumers can let core load it at
runtime; browser bundlers should provide a statically visible loader:

```ts
import {
  createLoroMergeStrategy,
  registerMergeStrategy,
} from "@prometheus-ags/entity-graph-core";

const strategy = await createLoroMergeStrategy(
  () => import("loro-crdt"),
);
registerMergeStrategy("Document", strategy);
```

The public `LoroModuleLoader` type describes this callback. Supplying it does
not make Loro part of the mandatory core bundle.

## Major capabilities

- request deduplication, stale-while-revalidate, subscriber tracking, and garbage collection
- transport-neutral filtering, sorting, search, pagination, and incremental views
- realtime adapters with coalesced graph writes
- graph actions, transactions, effects, snapshots, and time travel
- local-first persistence and retryable action replay
- schema and relation registries with cascade invalidation
- AG-UI snapshot/delta ingestion and JSON Patch
- REST, WebSocket, Supabase, GraphQL, ElectricSQL, PGlite, Tauri SQL, SurrealDB, and Flint adapter seams
- framework-neutral table row models and faceting

## Module support

The package publishes loader-specific artifacts and declarations:

- Node ESM and modern bundlers use `dist/index.mjs` with `dist/index.d.ts`.
- Node CommonJS uses `dist/index.cjs` with `dist/index.d.cts`.

Both paths are selected through conditional package exports.

## License

MIT
