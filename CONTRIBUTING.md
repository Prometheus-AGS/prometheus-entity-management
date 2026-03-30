# Contributing to prometheus-entity-management

## Setup

```bash
# Install all workspace dependencies
npm install

# Run the Vite example app
npm run dev:vite      # → http://localhost:5173

# Run the Next.js example app
npm run dev:next      # → http://localhost:3000
```

## Project Structure

```
src/           Library source — this is what you ship
examples/      Demo applications — illustrate the API in action
```

## Library Development Workflow

The examples resolve `"prometheus-entity-management"` directly to `../../src/index.ts`
via `tsconfig.json` path aliases and `vite.config.ts` aliases. There is no build step
during development — TypeScript compilation is handled by the app bundlers.

To typecheck the library source:
```bash
npm run typecheck       # root tsconfig
```

## Code Style

- TypeScript strict mode throughout
- No `any` except where unavoidable at adapter boundaries (documented in comments)
- Immer for all graph mutations (no direct state writes)
- Every public hook must have a JSDoc comment explaining its purpose and the problem it solves
- Callbacks always use `useRef` to avoid stale closure bugs in effects

## Adding a New Realtime Adapter

1. Create `src/adapters/your-source.ts`
2. Implement the `RealtimeAdapter` interface from `src/adapters/types.ts`
3. Export from `src/index.ts`
4. Add a usage example in `examples/vite-app/src/` demonstrating the adapter

The adapter contract is intentionally minimal:

```ts
interface RealtimeAdapter {
  readonly name: string;
  subscribe(config: SubscriptionConfig, handler: (changeset: ChangeSet) => void): UnsubscribeFn;
  onStatusChange?: (cb: (status: AdapterStatus) => void) => UnsubscribeFn;
}
```

The adapter emits `ChangeSet` objects. The `RealtimeManager` handles coalescing,
batching, and writing to the entity graph. Your adapter should not touch the graph directly.

## Adding a New Column Type

Column builders live in `src/ui/columns.tsx`. Each builder returns a `ColumnDef<T>` with
`meta.entityMeta` populated. The metadata is used by `EntityTableToolbar` to render
the appropriate filter control for that column type.

```ts
export function myColumn<T>(opts: { field: keyof T & string; header: string }): ColumnDef<T> {
  return {
    id: opts.field,
    accessorKey: opts.field,
    header: ({ column }) => <SortHeader column={column} label={opts.header} />,
    cell: ({ getValue }) => <span>{String(getValue() ?? "")}</span>,
    meta: {
      entityMeta: {
        field: opts.field,
        filterType: "text",   // drives the filter toolbar control
        hideable: true,
      },
    },
  };
}
```

## Relation Schema

Schemas are registered at app startup via `registerSchema()`. The cascade invalidation
engine (`src/crud/relations.ts`) reads them when `cascadeInvalidation()` is called after
any `useEntityCRUD` mutation. New relation cardinalities (`belongsTo`, `hasMany`,
`manyToMany`) can be added to `RelationDescriptor` — just implement the invalidation
logic in the `cascadeInvalidation` switch statement.

## Principles (please read before contributing)

**Entities live exactly once.** Never store a copy of an entity. Always upsert into the
graph and store a reference (ID) elsewhere.

**Queries are instructions, not containers.** A `useEntity` or `useEntityList` hook
describes what to fetch and how to normalize it. It does not own the resulting data.

**Local patches are visible everywhere.** `patchEntity` and `useEntityAugment` write
to the patches layer, which is merged at read time. Any subscriber to that entity sees
the patch — including list views, detail panels, and other hooks.

**The edit buffer is isolated.** `useEntityCRUD`'s `editBuffer` is local React state
and is never applied to the graph until `save()` is called. This prevents half-typed
form values from propagating to other views.

**The graph is Zustand.** `useGraphStore` is a plain Zustand store. Use it directly
whenever the hooks don't cover your use case.

## License

MIT
