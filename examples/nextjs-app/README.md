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

- The library resolves through pnpm workspace `workspace:*` dependencies to the published package `exports` (built `dist`) of `@prometheus-ags/entity-graph-core` and `@prometheus-ags/prometheus-entity-management`. There are no source-path aliases.
- Example code follows the repo layering rules: UI uses hooks; `GraphHydrationProvider` is infrastructure-only for bridging SSR data into the graph store.

## Per-request SSR isolation (`/release-showcase`)

The `/release-showcase` route (`force-dynamic`) demonstrates the certified SSR
pattern for this binding:

- **Per-request graphs on the server.** The React binding's hooks bind to a
  process-global Zustand store, which would leak data between concurrent
  requests if written during server rendering. Server code therefore never
  touches it: `src/lib/server/request-graph.ts` mints a fresh graph per request
  via the framework-neutral core's `createGraphStore()`, and
  `src/lib/server/demo-data-source.ts` serves deep-cloned per-request data.
- **Prefetch → dehydrate → hydrate.** The RSC page builds a serializable
  payload (entities + list slots keyed by `serializeKey(queryKey)`), renders
  data HTML directly from the request graph, and passes the payload to
  `RequestHydrationBoundary`. The boundary renders an identical shell on the
  server and first client pass (no hydration mismatch), writes the payload
  post-mount with `setEntityFetched` / `setListResult` freshness stamps, and
  only then mounts graph-reading children — so hooks see fresh data inside
  `staleTime` and never refetch prefetched data.
- **Client takeover.** Mutations and realtime streams (`RealtimeManager`) run
  client-side after hydration; hydrated entities update in place across views.
- **Proof.** `pnpm --filter prometheus-entity-management-nextjs run test:ssr-isolation`
  runs concurrent-request isolation units; `pnpm run verify:nextjs-app-router`
  (from the monorepo root) runs the full gate: typechecks, isolation units,
  package builds, production build, and the Playwright browser suite with
  fetch-instrumentation assertions (`window.__pemFetchMetrics`) and axe.
