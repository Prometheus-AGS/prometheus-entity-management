# Vite example (`prometheus-entity-management-vite`)

React 19 + Vite + TanStack Router demo for the entity graph library.

## Run

From the **monorepo root**:

```bash
pnpm install
pnpm run dev:vite
```

Open [http://localhost:5173](http://localhost:5173).

## What to try

| Route | Notes |
|-------|--------|
| `/dashboard`, `/projects`, `/tasks`, `/team` | CRUD + mock API latency |
| `/realtime` | Realtime adapter demos |
| `/tanstack-bridge` | **TanStack Query** `useQuery` + sync into **`upsertEntity`**; second column reads the same row from the graph |

## Stack notes

- The library is resolved from `../../src/index.ts` via `tsconfig` paths (no published package required for local dev).
- **TanStack Query** is only required for the `/tanstack-bridge` demo; the rest of the app uses the entity graph hooks directly.
