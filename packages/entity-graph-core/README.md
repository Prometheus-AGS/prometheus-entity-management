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

## Optional DevTools controller

The versioned DevTools runtime is isolated behind the
`@prometheus-ags/entity-graph-core/devtools` export. Normal application imports
do not expose the controller API.

```ts
import { createGraphStore } from "@prometheus-ags/entity-graph-core";
import {
  attachGraphDevtools,
  createGraphDevtoolsClient,
} from "@prometheus-ags/entity-graph-core/devtools";

const store = createGraphStore();
const attachment = attachGraphDevtools(store, {
  storeId: "admin-graph",
  historyLimit: 500,
});

if (attachment.controller) {
  const client = createGraphDevtoolsClient(
    attachment.controller.storeId,
    attachment.controller.connect("local-inspector"),
  );

  const snapshot = await client.request("get-snapshot");
  client.disconnect();
}

attachment.detach();
```

### Inspect entities, rendered views, and relationships

The controller projects inspection state on demand from the owning graph. It
does not copy entity values into a second store:

```ts
const attachment = attachGraphDevtools(store, {
  storeId: "admin-graph",
  values: { mode: "include" },
});

const controller = attachment.controller;
if (controller) {
  const view = controller.registerView({
    viewId: "users:active-table",
    label: "Active users",
    kind: "list",
    entityType: "users",
    queryKey: "users:active",
  });

  // Call this whenever the rendered membership changes.
  view.updateMembership(["user-1", "user-2"]);

  const entities = controller.getEntityRecords();
  const views = controller.getViews();
  const relationships = controller.getRelationships();

  view.unregister();
}
```

Entity records keep the canonical server-confirmed original, local graph patch,
and merged live value distinct. `dirtyReasons` names patched fields and
unsynchronized state; fetch/sync timestamps, typed fetch errors, store-local
revisions, and the stable IDs of views displaying the entity are projected
beside them. Missing canonical rows retained only by patch or metadata state are
reported as `presence: "missing-canonical"`.

View registrations are token-scoped. Duplicate registrations for one stable
`viewId` share the projected view but retain independent lifetimes, so one
consumer cannot unregister another. List views include current graph/list
statistics, and membership is available in both directions.

Relationships are derived from the existing CRUD schema registry and current
merged graph values. `belongsTo`, reverse `hasMany`, and `manyToMany` edges are
reported as `resolved` or `missing-target`; DevTools does not create a parallel
relationship registry.

### Preview and restore a local patch

Preview commands write through the graph's existing patch layer, so every live
consumer observes the proposed value:

```ts
const preview = await client.request("preview-entity-patch", {
  type: "users",
  id: "user-1",
  patch: { displayName: "Proposed name" },
});

if (preview.ok && "previewId" in preview.result) {
  const restore = await client.request("restore-entity-preview", {
    previewId: preview.result.previewId,
  });
}
```

The receipt captures the exact prior patch. Restore replaces that patch
atomically only when no intervening canonical or patch publication touched the
entity. Otherwise it returns a typed `conflict` receipt and leaves current graph
state unchanged. Fetch/sync metadata-only publications do not cause false
conflicts. Only one active preview is retained per entity, and receipts are
discarded with their controller.

The same value policy governs events, entity records, and preview receipts.
Under the default metadata-only policy, value positions contain an explicit
`{ $type: "hidden-by-policy" }` marker. Hosts must opt into `mode: "include"`
before canonical values, patches, merged values, or receipt values can cross the
inspection boundary.

The versioned conformance fixture is published at
`@prometheus-ags/entity-graph-core/devtools/fixtures/entity-inspection-v1.json`.
Its byte-identical source copy under `packages/entity_graph_flutter` freezes the
TypeScript/Flutter wire semantics; changing those semantics requires a new
fixture version.

Node ESM consumers import the JSON fixture with an import attribute:

```ts
import fixture from "@prometheus-ags/entity-graph-core/devtools/fixtures/entity-inspection-v1.json"
  with { type: "json" };
```

### Rewind controller-owned snapshot history

Each active controller captures one initial attach baseline and the complete
mutable graph data slice after every semantic graph publication. Snapshot
payloads, stable cursors, imported candidates, rewind state, and the protected
live head stay inside that controller; UI code renders status and submits
intent rather than owning a second history ring.

```ts
const attachment = attachGraphDevtools(store, {
  storeId: "admin-graph",
  snapshotLimit: 50,
  snapshotBytesLimit: 10 * 1024 * 1024,
});

const controller = attachment.controller;
if (controller) {
  const status = controller.getSnapshotHistoryStatus();
  const cursor = status.newestCursor;

  if (cursor !== null) {
    const rewind = controller.rewind(cursor);
    if (rewind?.status === "rewound") {
      // Every graph subscriber now reads the selected historical state.
      controller.returnToLive();
    }
  }
}
```

Count and byte ceilings both apply; eviction always removes whole oldest
snapshots. A cursor is never reused. Rewinding an evicted, cleared, or
unavailable capture returns a typed `expired-history` receipt with the current
retained range and never mutates the graph. Oversize captures remain visible as
`unavailable` metadata rather than retaining a partial graph.

The first rewind protects an exact deep clone of the live head. Explicit
return-to-live restores that clone through the Zustand publication boundary.
If an application mutation occurs while rewound, DevTools first emits a live
transition with `reason: "mutation"`, then emits and snapshots the completed
mutation as the new branch; the former protected future is released.

History imports are inert until confirmation. `inspectHistoryImport()` accepts
only the current protocol version, the same controller store ID, ordered stable
cursors, JSON-safe complete graph data, and the controller's count/byte budget.
`confirmHistoryImport(candidateId, cursor)` is one-shot and restores only the
exact inspected candidate. Inspection receipts and time-travel events expose
metadata, not snapshot values.

The deprecated root functions (`recordGraphSnapshot`,
`restoreGraphSnapshot*`, `stepTimeTravel`, and `getTimeTravelState`) are a thin
compatibility facade over the selected store's controller. They own no graph
payloads or cursors and return unavailable results until the explicit
`@prometheus-ags/entity-graph-core/devtools` module has been loaded. New tools
should use the controller's stable cursors and explicit return-to-live API.

The versioned time-travel fixture is published at
`@prometheus-ags/entity-graph-core/devtools/fixtures/time-travel-v1.json`. Its
byte-identical Flutter source copy freezes retention, rewind/live, branching,
expired-cursor, and confirmed-import semantics for the later Dart controller.

Each store owns one reference-counted controller. Attachments to the same store
share its event sequence and bounded history; separate stores never share
events, commands, clients, or teardown. The first active attachment determines
that controller's identifier, limits, and value policy until its final
attachment detaches.

Set `enabled: false` when a host should skip creating a particular attachment.
This is an attachment-level no-op, not a global kill switch: it never tears
down a controller still referenced by another attachment. Detach every active
attachment to stop observation for that store.

The controller observes the Zustand publication boundary, so transactions,
adapter writes, hydration, rollback, and direct `store.setState` changes use the
same semantic event stream. Events carry protocol version, store and event IDs,
sequence/correlation data, before/after graph counts, and categorized changes.

The deprecated root `subscribeDevtoolsEvent` API remains the original
history-free graph-transaction op-site stream. It does not attach this
controller and does not observe arbitrary direct `store.setState` writes. New
inspection tools should use this versioned subpath; the separate root shim
exists only for compatibility and keeps its incremental patch payloads.

### DevTools data boundary

Entity and patch values are omitted by default. Events contain metadata and
counts unless the host explicitly opts into values and supplies any required
redaction policy:

```ts
const attachment = attachGraphDevtools(store, {
  values: {
    mode: "include",
    redact(value, context) {
      if (context.category !== "entity" || !value || typeof value !== "object") {
        return value;
      }
      const { accessToken: _secret, ...safe } = value as Record<string, unknown>;
      return safe;
    },
  },
});
```

The current v1 redactor receives each whole changed value, represented by an
empty `context.fieldPath`. `context.destination` distinguishes retained event
history from on-demand inspection. Nested field paths are reserved for later
field-level inspection. A throwing redactor marks that change with
`valueState: "redaction-error"` and exposes neither the exception nor the
original value.

History is bounded by both event count and encoded bytes. Oversized included
values are removed before an event is retained or delivered; if metadata alone
still exceeds the per-event limit, `changesOmitted` records the explicit loss.
Redactor and
observer failures are isolated from graph writes, disconnected clients cannot
continue issuing commands, and the controller stops observing the store after
the final detach. A transport adapter is responsible for preserving the same
store/client boundary when messages leave the process.

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
- DevTools ESM uses `dist/devtools.mjs` with `dist/devtools.d.ts`.
- DevTools CommonJS uses `dist/devtools.cjs` with `dist/devtools.d.cts`.

Both paths are selected through conditional package exports.

## License

MIT
