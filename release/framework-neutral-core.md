# Framework-neutral core contract

The `v3-framework-neutral-core` quality gate certifies that the installable `@prometheus-ags/entity-graph-core` artifact is genuinely independent of React. This is narrower than certifying every framework binding or declaring the complete 3.0 release ready.

## Public store boundary

Core exports a Zustand vanilla StoreApi:

```ts
import {
  createGraphStore,
  graphStore,
  type GraphStore,
} from "@prometheus-ags/entity-graph-core";

const requestGraph = createGraphStore();
requestGraph.getState().upsertEntity("Project", "p1", { name: "Prometheus" });

const sharedProject = graphStore
  .getState()
  .readEntity<{ name: string }>("Project", "p1");
```

- `createGraphStore()` creates an isolated graph. Use it for SSR requests, tests, workers, or any host that must not share process state.
- `graphStore` is the default process-wide vanilla singleton used by framework bindings.
- `GraphStore` is the StoreApi type returned by the factory.
- Core's deprecated `useGraphStore` export is a temporary StoreApi-shaped migration alias for `graphStore`; it is not a React hook.

React consumers continue importing a callable hook from the React package:

```tsx
import {
  graphStore,
  useGraphStore,
} from "@prometheus-ags/prometheus-entity-management";

const project = useGraphStore((state) =>
  state.readEntity<{ name: string }>("Project", "p1"),
);

graphStore.getState().upsertEntity("Project", "p1", { name: "Prometheus" });
```

The React hook subscribes to the same vanilla singleton and retains attached `getState`, `setState`, and `subscribe` methods for compatibility. Application components should still prefer domain hooks such as `useEntity` and `useEntityList` to preserve the required Components → Hooks → Stores layering.

## Local-first status boundary

Core owns `graphSyncStatusStore` and the imperative `getGraphSyncStatus()` reader. React owns `useGraphSyncStatus()`. This keeps the persistence/runtime state usable from Node, workers, Tauri commands, and other non-React hosts without importing React types.

## React-only table contracts

The headless table engine remains in core. Types whose values are React render nodes or component types—actions, item descriptors, empty states, batch actions, and React renderer aliases—are exported by the React package. Existing React-package imports keep their names; core-only consumers no longer receive React presentation types.

## Migration from 2.x and early 3.0 alphas

| Previous usage | 3.0 usage |
|---|---|
| `useGraphStore.getState()` imported from core | `graphStore.getState()` from core |
| `useGraphStore(selector)` in React | `useGraphStore(selector)` from the React package |
| one implicit global store in SSR | `createGraphStore()` once per server request |
| `useGraphSyncStatus()` imported from core | `getGraphSyncStatus()` in non-React code or `useGraphSyncStatus()` from React |
| React table/view types imported from core | import the same presentation type names from the React package |

The deprecated core alias follows the release contract's current-plus-next-major removal policy. It exists to make imperative migrations incremental, but new core code should use `graphStore` explicitly.

## Reproduce certification

```bash
pnpm run test:framework-neutral-core
pnpm run verify:framework-neutral-core
pnpm run bdd:framework-neutral-core
```

The packed verifier:

1. builds and packs core;
2. rejects React/React DOM runtime or type dependencies in the manifest and resolved pnpm graph;
3. rejects React imports in ESM/CommonJS and React types in both declaration formats;
4. installs only the tarball and TypeScript in a temporary non-React consumer;
5. verifies shared ESM/CommonJS singleton behavior, isolated factories, selector subscriptions, and TypeScript with `types: []`.

## Certification limits

This gate itself does not prove that framework bindings resolve exactly one core package instance. That separate six-binding proof is now documented in [`binding-singleton-contract.md`](binding-singleton-contract.md). Neither gate certifies showcase UI behavior, visual evidence, native Tauri/Flutter behavior, the Docusaurus deployment, registry provenance, or stable npm promotion.
