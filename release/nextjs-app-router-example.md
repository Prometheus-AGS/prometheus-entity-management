# Next.js App Router example boundary

The `v3-nextjs-app-router-example` change implements the Next.js 16 / React 19
server-client boundary required by the 3.0 example portfolio. It is deliberately
separate from the already certified React 19/Vite 8 browser showcase.

## Implemented architecture

Each dynamic document render creates a vanilla graph with
`createGraphStore()`, prefills normalized entities and ID-only lists, and
dehydrates a structured-clone-safe snapshot. The server passes that snapshot
through the Root Layout to a client `GraphHydrationProvider`, which creates one
browser-owned store and scopes descendant hooks with `GraphStoreProvider`.

This prevents two ownership errors:

- concurrent server requests never share entity, subscriber, fetch-dedupe, or
  realtime state through the process singleton;
- hydration does not copy server rows into a second client cache or start a
  duplicate fetch for already-fetched entities.

The `/next-runtime` route also demonstrates client route persistence, a
validated Server Action mutation, realtime takeover after mount, and explicit
loading/error boundaries. The Server Action resolves the entity from
server-owned fixtures and allowlists the status; client input does not grant
entity or graph authority.

## Public React surface

The React package adds:

- `GraphStoreProvider`
- `useGraphStoreApi`
- `GraphStoreProviderProps`

Core engine dedupe, subscribers, fetches, and global listeners accept a selected
graph, and `RealtimeManager` accepts `ManagerOptions.store`. Existing
applications that do not install a provider continue to use the default
singleton.

## Focused checks

```bash
pnpm run test:nextjs-app-router:unit
node --test tests/release/v3-nextjs-app-router-example.test.mjs
pnpm run typecheck:next
```

These checks cover same-key/different-store dedupe, selected-store realtime,
React provider isolation, concurrent server snapshots, serializability,
singleton non-interference, and rejected Server Action inputs. They are
implementation feedback, not the release receipt.

## Packed release boundary

```bash
pnpm run verify:nextjs-app-router
```

The verifier builds and packs the core and React candidates, copies the example
outside the workspace, replaces both workspace dependencies with tarballs,
installs the external application, type-checks and builds it, starts
`next start`, and runs Playwright. The browser gate requires:

- twelve concurrent requests with twelve unique request graph IDs;
- zero hydration mismatches and zero duplicate client fetches;
- graph persistence across a client route transition and a new graph after
  document reload;
- confirmed Server Action mutation and client realtime takeover;
- zero serious or critical axe findings;
- a hashable screenshot and Playwright trace.

## Current evidence disposition

The clean task-5 command passed against an external Next.js 16 production app
that installed only the packed core and React `3.0.0-rc.1` candidates. The
receipt proves twelve isolated concurrent request graphs, zero hydration
refetches or errors, route persistence, reload replacement, Server Action
confirmation, realtime takeover, zero serious or critical axe findings, and
hash-verified screenshot and trace artifacts. The showcase is therefore
`implemented` in `examples/coverage.json`.

The authoritative receipts are
`task-5-verification.json`, `browser-evidence.json`, the Playwright JSON report,
the screenshot, and both retained traces under the change evidence directory.
This does not claim that npm `next`, stable 3.0.0, external provider
configuration, or the remaining example portfolio is complete.
