# Task 2 — Next.js App Router implementation

Date: 2026-08-03
Change: `v3-nextjs-app-router-example`
Result: **IMPLEMENTATION COMPLETE; ACCEPTANCE CERTIFICATION PENDING TASKS 3–6**

## Implemented scope

- Added `GraphStoreProvider` and `useGraphStoreApi` while preserving the public
  default singleton for non-provider consumers.
- Scoped engine in-flight requests, subscribers, Suspense waiters, mutations,
  CRUD relation reads/invalidation, GraphQL normalization, ElectricSQL hooks,
  DevTools counts, and realtime managers to the selected graph store.
- Replaced server rendering against the process-global singleton with a new
  `createGraphStore()` instance for every App Router render.
- Added deterministic server preload, graph dehydration, and client hydration
  before descendants render. The root provider remains mounted across route
  transitions.
- Converted route entry files to Server Components and retained interactive
  demo pages as explicit client islands.
- Added `/next-runtime` to demonstrate the request identifier, a Server Action
  mutation, and client-only realtime takeover.
- Added App Router loading and error boundaries.
- Updated the existing realtime and TanStack Query examples to use the scoped
  graph rather than the default singleton.
- Added the framework-neutral core as an explicit Next example dependency so
  React-free server preload code does not import the React binding package.

## Security boundary

The Server Action accepts only a task ID and a known task status. It validates
both fields and resolves the authoritative demo task server-side instead of
accepting an entire client-supplied entity as server truth.

## Tier 0 verification

| Check | Result |
| --- | --- |
| `pnpm --filter @prometheus-ags/entity-graph-core typecheck` | PASS |
| React package source-mapped `tsc --noEmit` | PASS |
| Next example source-mapped `tsc --noEmit` | PASS |
| ESLint over all touched TypeScript/TSX surfaces | PASS, zero warnings |
| `openspec validate v3-nextjs-app-router-example --strict --no-interactive` | PASS |
| `git diff --check` | PASS |

The source-mapped checks were used because this clean continuation worktree had
no prebuilt workspace `dist` directories and the package graph resolves type
exports from those artifacts. Running package builds here would have crossed
the designated build gate before task 3/5. Locked dependencies were installed
with pnpm; no version was advanced and no registry was mutated.

## Explicitly not claimed by task 2

Concurrent SSR isolation tests, hydration/duplicate-fetch assertions, packed
consumer production builds, and browser E2E evidence are not claimed here.
They remain the work of tasks 3 and 5. Coverage/public API ledgers, skills, and
documentation remain task 4; final evidence and release impact remain task 6.
