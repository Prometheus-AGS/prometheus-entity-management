# Design: v3-nextjs-app-router-example

## Candidate reuse decisions

### cand-002 — Next.js (App Router)

- **Verdict:** adopt
- **Decision:** Keep and harden the existing `examples/nextjs-app` (Next 16.2.12,
  React 19.2.8) rather than replacing it with a third-party starter. The pinned
  versions come from the release dependency matrix already exercised by
  `v3-main-ci-baseline`; no dependency changes are introduced by this change.

## Boundary

Reuse or adapt the `v3-vite-react19-example` release-showcase feature only within
the boundaries recorded in `library-candidates.json`. Live external services stay
explicit opt-in modes; the Next.js showcase ships deterministic demo modes only
(PGlite/Loro convergence evidence remains owned by the Vite showcase and is not
duplicated here).

## SSR isolation model (the core decision)

The React binding's hooks bind to a process-global Zustand store
(`graphStore` from `@prometheus-ags/entity-graph-core`). On a Node server that
store is shared by every concurrent request, so request-scoped data must never
be written to it during server rendering. The binding has no per-request React
context store; adding one would change the published core/binding API and is out
of scope (it would require its own OpenSpec change).

Therefore:

1. **Per-request graph creation (server).** All server-side graph work goes
   through `createRequestGraph()` (`src/lib/server/request-graph.ts`), a thin
   wrapper over the core's `createGraphStore()`. One instance per request.
   Server modules (`src/lib/server/**`) and server route files never import the
   React binding; a static release test enforces this.
2. **Server prefetch / dehydrate.** RSC route handlers build a serializable
   `HydrationPayload` (entities + list slots keyed by `serializeKey(queryKey)`)
   from a pure per-request data source
   (`src/lib/server/demo-data-source.ts` — no module-global mutable state, all
   reads deep-clone). Server components may render data HTML directly from the
   request graph; nothing request-scoped touches the process-global store.
3. **Client hydration without mismatch or duplicate fetch.**
   `RequestHydrationBoundary` (client) renders its `fallback` on the server pass
   and on the first client render (identical HTML → no hydration mismatch), then
   in a mount effect writes entities (`upsertEntity` + `setEntityFetched`) and
   list slots (`setListResult`, which stamps `lastFetched` and clears `stale`)
   and only then mounts graph-reading children. Children mount after the write,
   so their staleness predicates see fresh data inside `staleTime` and do not
   fire a duplicate fetch.
4. **Legacy seed hydration stays unchanged.** The existing
   `GraphHydrationProvider` hydrates only the static demo seed (identical for
   every request); it writes no request-scoped data and is left untouched
   (minimal diff). Request-scoped payloads flow exclusively through the new
   boundary.
5. **Realtime client takeover.** The realtime/showcase surfaces render from the
   hydrated payload immediately; `RealtimeManager` adapters connect only after
   client mount, so post-hydration updates demonstrate takeover without any
   server write to the global store.

## Verification strategy

- **Unit (concurrent SSR isolation):** `tests/nextjs/v3-nextjs-request-isolation.test.ts`
  (node:test + tsx) builds payloads for interleaved concurrent tenants, hydrates
  per-request graphs, asserts tenant disjointness, serializability, deep-clone
  independence, freshness semantics, and that the process-global `graphStore`
  remains untouched by the server path.
- **Static release test:** `tests/release/v3-nextjs-app-router-example.test.mjs`
  asserts the file surface, the server-module import boundary, absence of
  source-path aliases for the library (packed/dist resolution only), and the
  coverage.json showcase entries.
- **Browser E2E:** `tests/browser/v3-nextjs-app-router-example.spec.ts` runs
  against `next start` after a production build; asserts every declared scenario
  receipt, zero hydration-mismatch console errors, zero backend reads for
  hydrated lists inside the fresh window (instrumented fetch metrics), route
  transitions, mutation, realtime takeover, and zero serious/critical axe
  violations. Evidence lands in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/`.
- **Single-command verifier:** `scripts/verify-nextjs-app-router-example.mjs`
  (mirrors `verify-vite-react19-example.mjs`) chains typechecks, the isolation
  unit, package builds, the production build, and the browser suite, then
  validates the browser evidence against `examples/coverage.json`.

## Evidence boundary (explicit)

Browser evidence is `source-workspace-production-browser` and does **not** claim
packed-package coverage (`countsAsPackedPackageEvidence: false`), matching the
certified precedent set by `v3-vite-react19-example`. Packed-tarball consumer
certification remains owned by `v3-package-module-contracts` and the archived
`v3-release-pipeline-rc` packed-consumer lane. The library is consumed through
its package `exports` (built `dist`); no source-path alias is used or counted.
