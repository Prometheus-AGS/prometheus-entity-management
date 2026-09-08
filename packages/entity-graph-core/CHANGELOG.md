# @prometheus-ags/entity-graph-core

## 4.0.2

### Patch Changes

- **Republish of 4.0.1 with the workspace protocol resolved.** 4.0.1 was
  published with `npm publish`, which does not rewrite pnpm's `workspace:`
  protocol. 11 of the 13 packages therefore shipped literal
  `"@prometheus-ags/entity-graph-core": "workspace:^"` specifiers, which npm
  cannot resolve — installing those packages fails.

  4.0.2 is the same code, published with `pnpm publish` so the specifiers are
  rewritten to real version ranges. **Use 4.0.2; 4.0.1 is deprecated.**

  No source changes between 4.0.1 and 4.0.2.

## 4.0.1

### Patch Changes

- **Scope pending actions and sync status per runtime.** `startLocalFirstGraph`
  kept pending actions and sync status in module-level state, so two runtimes in
  one process shared and clobbered each other's status. Each runtime now owns a
  `RuntimeScope`. The `graphSyncStatusStore` export still works and remains
  last-writer-wins under multiple runtimes; per-runtime status is the new path.

- **`dispose()` drains in-flight persistence.** Disposal returned without
  awaiting writes already in flight, so a caller could tear a runtime down mid-
  write and lose the tail of a batch. `dispose()` is now async, tracks in-flight
  writes, and drains them before resolving. It is memoized, so repeat calls
  return the same promise rather than starting a second drain.

  Note for React callers: effect cleanup is synchronous and cannot await this.
  Hand the disposal promise to whatever opens the next runtime, so the next open
  awaits the previous close.

- **Commit replica rows and their resume checkpoint atomically.** Rows and the
  checkpoint that describes them were written separately, so an interruption
  between the two left a replica whose checkpoint disagreed with its contents —
  and the disagreement was silent, producing a resume from a position that never
  matched what was stored. `setWithCheckpoint()` now writes value and checkpoint
  columns in a single statement, and `evaluateResume()` reports `resume` or
  `rebuild` rather than assuming the checkpoint is trustworthy.

- **Carry the Electric cursor through change sets.** `toChange` read
  `msg.offset` and discarded it, so no offset reached a consumer by any path.
  `ChangeSet.cursor` now carries `{handle, offset}` from the batch's last
  message. The empty offset on the LISTEN/NOTIFY path is correct and unchanged —
  such a frame genuinely has no Electric offset.

## 4.0.0

### Major Changes

- **ESM-only.** Every package now ships ESM exclusively — no `.cjs`, no
  `.d.cts`, no `require` condition. CommonJS consumers must switch to
  `await import(...)`.

  The trigger was `@tanstack/react-table` v9, which is itself ESM-only
  (`"type": "module"`, a single `exports` entry, no CJS build). A CommonJS
  declaration file cannot `require` an ESM dependency's types — TypeScript
  raises TS1479 — so the React binding could not both re-export v9's types and
  ship a `.d.cts`. Rather than special-case one package and leave the workspace
  half-dual, the whole set moved.

  **`@tanstack/react-table` v8 → v9** in the React binding. v9 requires an
  explicit feature set and registers row models as feature slots. `stockFeatures`
  is deliberately not used — TanStack documents it as a migration shortcut rather
  than a production end state, and taking it would forfeit v9's tree-shaking.

  **`EntityColumnDef<T>` is unchanged for consumers.** v9 widened
  `ColumnDef<TData, TValue>` to `ColumnDef<TFeatures, TData, TValue>`. The public
  alias supplies `TFeatures`, so existing column definitions compile untouched —
  a type-level regression test asserts a hand-written v8-shaped column literal
  still assigns.

  **React bindings publish as `@prometheus-ags/entity-graph-react`**, matching
  every other framework binding. `@prometheus-ags/prometheus-entity-management`
  continues to publish as a compatibility alias re-exporting all three
  entrypoints, so existing installs keep resolving under the new name.

  Also in this release:
  - `@electric-sql/pglite` moves from a pinned `0.5.4` devDependency to `^0.5.8`,
    verified against the PGlite persistence adapter.
  - `entity_graph_flutter` moves to `hooks_riverpod` and the current Riverpod
    toolchain, and gains `useEntity`, `useEntityList` and `useEntityQuery`
    helpers mirroring the React surface.

### Patch Changes

- d1588d8: Reactive read-path fixes from graph-explorer's architectural review (AR5).

  **`useEntities` now subscribes to entity data.** Its `items` were computed in
  a `useMemo` over `getState()` keyed on the list's ids — no subscription — so
  mutating an entity already in the list did not re-render consumers until a
  remount. `items` is now a store-subscribed selector under `useShallow`,
  reading through the cached `readEntitySnapshot`. Return-shape note: items now
  carry `$synced` / `$origin` / `$updatedAt` like `useEntityList` and
  `useEntityQuery` already did — additive, and the three hooks now agree.

  **`readEntity` has a stable identity contract.** It allocated a fresh
  `{...base, ...patch}` merge on every call whenever a patch existed, defeating
  shallow comparison in every React consumer. Reads are now cached: same `base`
  - same `patch` (by reference) returns the same object, mirroring
    `readEntitySnapshot`'s cache.

  **`ingestFetchedList` dedupes ids on the replace path.** The append path
  always deduped; the replace path passed fetched ids through verbatim, so a
  backend returning two physical rows for one logical id rendered the entity
  twice in every list consumer. A list of entity ids never contains the same id
  twice, regardless of what a fetch returned.

## 3.2.0

### Minor Changes

- Release the complete DevTools distribution with the synchronized 3.2.0 workspace, including bounded core event metadata and responsive React inspector search during continuous graph updates.

## 3.1.0

## 3.0.5

### Patch Changes

- Resolve imperative graph access against the active graph instead of the package
  singleton, so `GraphStoreProvider` scopes `useGraphStore.getState()`,
  `.setState()`, `.subscribe()` and `.getInitialState()` (issue #42).

  3.0.4 replaced the copied StoreApi with delegates that warned but still targeted
  the singleton, which left consumers using the documented imperative API with no
  isolation. The React binding now proxies those methods, resolving per call.

  New in `entity-graph-core`:
  - `runWithGraphStore(store, fn)` — an `AsyncLocalStorage` request scope, so
    concurrent server renders never share entity state.
  - `prepareGraphStoreScope()` — awaited once during startup on **pure-ESM**
    servers, where there is no synchronous `require` to load `node:async_hooks`.
    Without it request scoping degrades to a module-level store and warns.
  - `setActiveGraphStore(store)` — the module-level active store, set by
    `GraphStoreProvider` on mount and restored on unmount.
  - `resolveActiveGraphStore(fallback)` — request scope → module-level store →
    fallback.

  `node:async_hooks` is loaded lazily and never statically imported, so browser
  bundles are unaffected. With no provider and no request scope, behaviour is
  unchanged from 3.0.4, and the deprecation warning is gone because the methods
  now do what callers expected.

## 3.0.4

## 3.0.3

### Patch Changes

- Ingest fetched entity lists, lifecycle metadata, and list projections in one
  atomic graph publication. Core and React list paths no longer publish once per
  returned row.

## 3.0.0

### Patch Changes

- 30fc348: Certify the React 19 and Vite 8 release showcase with normalized cross-view
  updates, local/remote/hybrid queries, optimistic confirmation and rollback,
  relationship invalidation, realtime coalescing, PGlite persistence, Loro
  convergence, Suspense and error-boundary lifecycle behavior, DevTools, and
  browser accessibility evidence.
- 7b64d76: Scope engine dedupe, subscribers, fetches, React hooks, mutations, and realtime
  writes to an application-owned graph so concurrent Next.js requests can
  dehydrate and hydrate without sharing process-global entity state.

## 3.0.0-rc.1

### Patch Changes

- Preserve coalesced realtime update operations while merging repeated patches, so a burst does not degrade into a data-less upsert that the graph discards.
- Accept a public `LoroModuleLoader` callback in `createLoroMergeStrategy` so browser bundlers can include the optional `loro-crdt` peer without making it a core dependency.

## 3.0.0

### Major Changes

- v3.0.0 — Universal Platform Evolution

  Evolves the React-only entity graph into a cross-platform, multi-framework,
  AI-native, local-first ecosystem.
  - **Monorepo split (breaking, but consumer-safe):** the framework-agnostic core
    is extracted into `@prometheus-ags/entity-graph-core` (zero React). The
    published `@prometheus-ags/prometheus-entity-management` package is the React
    binding over the vanilla core. Existing React hook names remain available,
    while core-only imperative consumers migrate from `useGraphStore.getState()`
    to `graphStore.getState()`; the deprecated core alias remains through the
    next-major removal window.
  - **New framework bindings:** `entity-graph-svelte` (Svelte 5 runes),
    `entity-graph-solid`, `entity-graph-web-components` (Lit 3), `entity-graph-alpine`,
    `entity-graph-htmx` (Node SSE fragment server).
  - **Peer sync:** `entity-graph-sync` with a pluggable SyncProvider — Yjs (default)
    and Loro (reusing the 2.2.0 merge seam).
  - **AI-native:** `entity-graph-a2a` plus `a2ui-react` with official A2UI
    v0.9.1 rendering and default-deny graph actions; legacy
    EntityChat/Copilot/Stream/Diff/Approval APIs live under `./ag-ui`.
  - **Codegen contract:** `entity-graph-sdl` (schema → validated IR).
  - **Native (published outside npm):** `entity-graph-cli` + `entity-graph-mcp`
    (Rust, via crates.io), `entity-graph-tauri` (Tauri v2 plugin), and
    `entity_graph_flutter` (Riverpod 3, via pub.dev).

  All integrations ship as optional peer dependencies; the core bundle stays
  `zustand + immer`.
