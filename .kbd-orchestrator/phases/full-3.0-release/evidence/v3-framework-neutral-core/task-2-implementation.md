# Task 2 — Framework-neutral core implementation

## Implemented boundary

- `@prometheus-ags/entity-graph-core` now creates stores with `createStore` from `zustand/vanilla`.
- `createGraphStore()` provides isolated non-React graph instances and `graphStore` is the default process-wide vanilla store.
- The deprecated core `useGraphStore` name is retained only as a StoreApi-shaped migration alias; the callable React hook now belongs to the React package.
- Local-first sync status uses `graphSyncStatusStore`, a vanilla store, with `getGraphSyncStatus()` for imperative consumers.
- React owns `useGraphStore()` and `useGraphSyncStatus()` subscriptions in `packages/entity-graph-react/src/graph-store.ts`.
- React-only action, item, empty-state, icon, and render-node contracts moved to `packages/entity-graph-react/src/table/react-types.ts`.
- Core table renderer outputs are framework-neutral `unknown` values and the table engine remains independently usable.

## Compatibility decision

The core `useGraphStore` migration alias is intentionally deprecated and exposes only the vanilla StoreApi contract. This follows the release contract's current-plus-next-major deprecation policy while preventing React runtime/types from remaining in core. The React package preserves the callable hook surface and attached imperative methods.

## Verification run during implementation

- `pnpm --filter @prometheus-ags/entity-graph-core typecheck` — passed.
- `pnpm --filter @prometheus-ags/entity-graph-core build` — passed for ESM, CJS, `.d.ts`, and `.d.cts`.
- `pnpm --filter @prometheus-ags/prometheus-entity-management typecheck` — passed against the rebuilt core declarations.
- `pnpm --filter @prometheus-ags/prometheus-entity-management build` — passed.
- `pnpm --filter @prometheus-ags/entity-graph-core test` — 25 files passed; 172 tests passed, 1 skipped, 1 todo (pre-existing suite state).
- `pnpm --filter @prometheus-ags/prometheus-entity-management test` — 6 files and 46 tests passed.

Dedicated packed-artifact dependency guards, non-React consumer scenarios, and React compatibility scenarios are task 3.
