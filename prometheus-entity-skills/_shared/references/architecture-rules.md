# @prometheus-ags/prometheus-entity-management — architecture rules (agent reference)

Non-negotiable constraints distilled from `CLAUDE.md` / `AGENTS.md`. Violating these breaks cross-view reactivity and the purpose of the normalized graph.

## Three-layer model

Data flows **up** into the graph; UI reads **down** through hooks.

| Layer | Location | Responsibility |
|-------|----------|----------------|
| **UI** | Components | Render only; call hooks for data and actions. |
| **Hooks** | `hooks.ts`, `graphql/hooks.ts`, `crud/`, `view/` | Orchestrate reads/writes between components and the graph; **no direct I/O**. |
| **Graph + engine** | `graph.ts`, `engine.ts`, stores/adapters | Own fetches, mutations, realtime, cache writes. |

Sideways data flow between components (duplicated caches, prop-drilled copies) is an anti-pattern; the graph is the single source of truth.

## Framework store boundary

- `@prometheus-ags/entity-graph-core` exports `createGraphStore()` and the vanilla `graphStore`; it has no React runtime or type dependency.
- `@prometheus-ags/prometheus-entity-management` exports the callable React `useGraphStore(selector)` hook over that singleton.
- Core's deprecated `useGraphStore` name is a StoreApi alias only. New non-React code uses `graphStore`; SSR code that requires request isolation uses `createGraphStore()`.
- Non-React local-first code uses `getGraphSyncStatus()` or `graphSyncStatusStore`; React components use `useGraphSyncStatus()`.
- React, Svelte, Solid, Web Components, Alpine, and HTMX bindings declare core as one required compatible peer plus a workspace-only development dependency. Never add core as a binding production dependency or mark its peer optional; the application owns resolution of the shared graph.
- Require `pnpm run verify:binding-singletons` before claiming those packed bindings resolve one physical core or share reactive behavior. Native Tauri/Flutter and browser/device claims require their own later gates.
- `packages/entity_graph_flutter` is the sole canonical Dart graph package. `provenance/imports/knowme-flutter` is a non-buildable, non-workspace, non-public history boundary; never import, analyze, build, publish, or expose it as a second runtime. Require `pnpm run verify:flutter-source-provenance` for source-lineage claims. Require `pnpm run verify:dart-graph-riverpod` and `pnpm run verify:dart-exports` for Dart runtime/API claims, but do not treat their scoped widget goldens as complete Flutter showcase or device evidence.

## Dart provider boundary

- Flutter widgets read generated Riverpod providers and call provider controllers; they do not own entity copies or invoke transports directly.
- `EntityGraph` alone owns canonical rows, patches, sync metadata, and ID-only list membership.
- Riverpod families select/orchestrate that graph. Local, remote, and hybrid list modes all join models from it.
- `EntityTransport` implementations own list/get/create/update/delete/change I/O and normalization.
- `FfiEntityTransportAdapter` is optional and cannot introduce a second graph or mandatory native runtime.
- Terminal provider failures do not retry; transient fetches receive at most two retries; mutation side effects are not automatically retried.
- Complete Flutter/A2UI applications additionally validate an entire untrusted message batch before GenUI mutation, apply exact application authority after protocol validation, and route approved actions through generated controllers. Host tests and goldens are partial evidence until stable-SDK and Android/iOS receipts pass.

## Components NEVER interact directly with stores

- Do **not** import or subscribe to `useGraphStore` inside **component** files.
- Components use **`useEntity`**, **`useEntityList`**, **`useEntityView`**, **`useEntityCRUD`**, GraphQL hooks, etc.
- `graphStore.getState()` (or the React hook's attached compatibility method) is allowed **inside** engine code, adapters, CRUD internals, **custom app hooks** (e.g. syncing TanStack Query results into the graph), effects, workers, and other **non-component** modules—not in presentational `*.tsx` components.

## Entities live exactly once (normalized cache)

- Upsert every server-shaped record into `entities[type][id]`; store **IDs** elsewhere (lists, relations, UI selection).
- Never keep a second copy of the same row in React state, context, or another cache unless it is a deliberate, short-lived edit buffer (see CRUD `editBuffer`).

## Queries are instructions, not containers

- Hooks describe **what** to load and **how** to normalize; they do not own the resulting data.
- The graph owns canonical data. Changing one entity updates every view that joins list IDs to the graph.

## Lists store IDs, not data

- `ListState.ids` is an ordered array of **`EntityId`** values plus pagination meta.
- Row objects at render time = `ids.map(id => readEntity(type, id))` (via hooks). This enables instant cross-screen updates when any entity changes.

## Immer for all graph mutations

- All writes that touch `entities`, `patches`, `lists`, or `entityStates` go through the Zustand + Immer middleware paths provided by the store API (`upsertEntity`, `patchEntity`, etc.).
- Do not mutate graph state with plain assignment from app code.

## JSDoc on public hooks

- Every **exported** hook in the library carries JSDoc describing purpose, parameters, and the problem it solves. New public hooks must follow the same standard.

## TypeScript: avoid `any`

- No `any` except at unavoidable **adapter boundaries** (e.g. wrapping third-party clients). When used, document **why** in a short comment.
- Prefer `unknown`, generics, and `Record<string, unknown>` for entity-shaped data.

## Package manager (monorepo)

- **`pnpm` only** for this monorepo and for skills that scaffold into repos that adopt the same rule.

## Related mental models

- **Patches** (`patches[type][id]`) are UI-only overlays merged at read time; never sent to the server.
- **Cascade invalidation** after mutations uses `registerSchema` metadata to mark related lists/entities stale—prefer this over manual key hunting.
