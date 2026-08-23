# Next.js App Router example

This example demonstrates `@prometheus-ags/prometheus-entity-management` with
Next.js 16, React 19, Server Components, request-owned graph state, hydration,
Server Actions, and client-only realtime takeover. It also retains the shared
Project / Task / User showcase routes used by the React/Vite example.

## Request ownership

Every full document request follows one explicit path:

```text
async RootLayout
  -> preloadRequestGraph()
  -> createGraphStore() for this request only
  -> dehydrateGraphStore() to serializable data
  -> GraphHydrationProvider creates one browser store
  -> GraphStoreProvider scopes every descendant React hook
```

The server never writes request data to the process-wide `graphStore`.
`GraphHydrationProvider` constructs the browser store once with `useState`, so
client route transitions keep the same graph while a document reload receives
a new request graph. React hooks resolve the nearest store through
`useGraphStoreApi()` and retain the package singleton as the non-SSR fallback.

The root layout exports `dynamic = "force-dynamic"` because the example is
specifically proving request isolation. A production application may choose a
different caching policy only when its data is genuinely safe to share.

## Demonstrated flow

Open `/next-runtime` to exercise the Next-specific boundary:

- a Server Component preloads a normalized graph and serializes entities,
  patches, fetch metadata, sync metadata, and ID-only lists;
- hydration reads the server data without a duplicate client fetch;
- client navigation preserves the scoped graph;
- a reload creates a new request ID and graph instance;
- a validated Server Action confirms an optimistic Task mutation;
- a `RealtimeManager` receives the scoped store explicitly and starts only
  after the client mounts;
- `loading.tsx` and `error.tsx` provide route lifecycle boundaries.

The Server Action accepts only a known demo task and an allowlisted status. It
returns server-owned data; client input does not grant graph or entity
authority.

## Run locally

From the monorepo root:

```bash
pnpm install
pnpm run dev:next
```

Open [http://localhost:3000/next-runtime](http://localhost:3000/next-runtime).
During workspace development the example uses the core and React workspace
packages. The release verifier replaces both dependencies with freshly packed
candidate tarballs in an external application.

## Verification

Focused implementation checks:

```bash
pnpm run test:nextjs-app-router:unit
node --test tests/release/v3-nextjs-app-router-example.test.mjs
pnpm run typecheck:next
```

The release boundary is:

```bash
pnpm run verify:nextjs-app-router
```

That command builds and packs core and React, creates an external Next.js app
with no workspace aliases, installs only the candidate tarballs, type-checks and
builds the production app, starts `next start`, and runs Playwright against it.
The browser gate requires twelve concurrent requests with twelve distinct graph
IDs, zero duplicate client fetches, zero hydration errors, route persistence,
Server Action confirmation, realtime takeover, zero serious or critical axe
findings, a screenshot, and a trace.

The clean command now passes against an external production app installed only
from packed core and React `3.0.0-rc.1` candidates. Its checked-in receipt,
screenshot, Playwright report, and traces promote this showcase to
`implemented` in `examples/coverage.json`; source presence or focused unit
success alone would not have been sufficient.

## Layering

- Server Components and server helpers create, populate, and serialize vanilla
  graph stores; they do not import React hooks.
- Client components read through feature hooks.
- Hooks coordinate the scoped graph, mutations, and realtime manager.
- Stores and adapters own I/O and graph writes.
- UI components render state and submit intent only.

The canonical implementation is under
`src/features/next-runtime/`; the reusable React scoping API is
`GraphStoreProvider` plus `useGraphStoreApi()`.
