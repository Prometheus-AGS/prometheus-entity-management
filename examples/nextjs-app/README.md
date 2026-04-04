# Next.js example (`prometheus-entity-management-nextjs`)

Next.js App Router demo with **feature parity** with [`examples/vite-app`](../vite-app/README.md): the same **Project / Task / User** mock backend, navigation, and pages (dashboard, projects, tasks, team, realtime, settings, UI demo, pure demo, TanStack Query bridge).

**SSR hydration:** on each full page load, the root layout builds `initialEntities` from the same seed as the client Zustand demo stores and passes them to `GraphHydrationProvider`, which upserts them into the entity graph before interactive UI runs—so the documented “server → graph” pattern stays valid without the old products/reviews catalog.

## Run

From the **monorepo root**:

```bash
pnpm install
pnpm run dev:next
```

Open [http://localhost:3000](http://localhost:3000) (redirects to `/dashboard`).

## Stack notes

- The library resolves from `../../src/index.ts` via `tsconfig` paths and `next.config` aliases (Webpack + Turbopack).
- Example code follows the repo layering rules: UI uses hooks; `GraphHydrationProvider` is infrastructure-only for bridging SSR data into the graph store.
