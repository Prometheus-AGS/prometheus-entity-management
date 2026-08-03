# Session log

## 2026-08-03 — Full 3.0 release execution resumed

- Restored the signed KBD authority after compaction and confirmed that the live
  control plane is the canonical source, not the stale revision-103 compatibility
  projection that was present in the worktree.
- Reused the existing mode-0600 service device identity to avoid introducing or
  enrolling a second signer.
- Reconciled task 1 of `v3-release-pipeline-rc` through `kbd-apply`; canonical
  revision advanced to 6.
- The signed authority still points to `v3-release-contract`, while the release
  pipeline has 1 canonical task complete and task 6 registered as pending. The
  previously completed OpenSpec implementation and release evidence remain
  intact.
- Recorded immutable KBD plan revision 3 to prioritize
  `v3-vite-react19-example` for the requested React-first release path.
- Transitioned the React change to `in_progress`, verified all four prerequisite
  OpenSpec changes from their archived completed task surfaces, and completed
  React task 1 of 6 through `kbd-apply`.
- Registered React tasks 2–6 before further execution after observing that lazy
  single-task registration could temporarily make KBD derive a false completed
  change. The signed state recalculated correctly once the full task surface was
  registered.
- Completed React task 2 of 6. Added the React 19/Vite 8 RC showcase, deterministic
  REST/GraphQL transport modes, normalized cross-view and optimistic flows,
  relationship invalidation, local/remote/hybrid views, realtime coalescing,
  Suspense/error handling, DevTools, PGlite persistence, and Loro convergence.
- Corrected the observed `useEntityQuery` base-list and remote-ID selection defects.
  T0 verification passed for both the Vite app and React package TypeScript checks.
- Completed the implementation evidence for React task 6 of 6. The final record
  distinguishes the implementation browser receipt from the deletion-aware
  clean-room receipt, preserves all twelve matching screenshot/trace hashes,
  and records unresolved browser, live-integration, Flutter/Tauri, immutable-SHA,
  and registry-authority limits without waiving them.
- The focused task-6 gates passed: coverage verifier, 14 release coverage tests,
  strict OpenSpec validation, Changesets status, JSON parsing, and diff hygiene.
  The next boundary is artifact-refiner plus isolated adversarial review before
  OpenSpec verification/archive. The fastest accepted React path remains a
  coordinated twelve-package numbered RC on npm `next`, with consumers installing
  only core and the React binding.
- Closed the React change through the complete KBD quality boundary. Four
  isolated-review iterations separated packet omissions from real defects,
  corrected the release contract's `.js`/`.mjs` mismatch with a twelve-package
  validator, and ended with a cross-model PASS (0 findings, sycophancy 0.0).
- Artifact-refiner finished four persisted cycles with seven of seven blocking
  constraints satisfied. KBD/OpenSpec verification passed and
  `v3-vite-react19-example` was archived on 2026-08-03. npm publication remains
  unauthorized; immutable source, aggregate CI, protected staging, and registry
  verification remain downstream.
- Froze the certified React RC source and PR at `c06ffe0`, then created the
  isolated `codex/full-3.0-continue` worktree so continued 3.0 development
  cannot move the React candidate SHA.
- Recorded KBD plan revision 4 with `v3-nextjs-app-router-example` as the exact
  next work and registered its complete six-task surface through the enrolled
  service signer before starting task 1.
- Confirmed all four Next.js prerequisites from their archived 6/6 OpenSpec
  task surfaces and merged strict-valid specifications. The signed legacy
  import still projects those historical changes as pending; direct archive
  evidence, not that stale projection, is the dependency-readiness authority.
- Completed the implementation boundary for Next.js task 2: request-owned
  server graphs, dehydrate/hydrate into a provider-scoped browser graph,
  Server/Client Component route boundaries, loading/error boundaries, Server
  Action mutation, and client realtime takeover. Core engine registries and
  React REST, rich-query, GraphQL, ElectricSQL, CRUD, mutation, Suspense,
  realtime, and DevTools paths now honor the selected graph store while the
  default singleton remains backward compatible.
- Tier 0 source-mapped TypeScript checks passed for core, React, and Next; the
  touched-file ESLint gate, strict OpenSpec validation, and diff hygiene also
  passed. Production builds, packed consumers, concurrent SSR tests, and
  browser E2E remain deliberately unclaimed until the later registered tasks.
- Completed the Next.js task-3 test surface. Seventeen focused tests now cover
  per-store engine dedupe, scoped realtime, provider isolation, 24 concurrent
  serializable server snapshots, default-singleton non-interference, Server
  Action input denial, and fail-closed packed/browser harness contracts.
- Added a clean external-consumer verifier that builds and packs core plus the
  React binding, replaces workspace dependencies with the two tarballs, then
  drives Next typecheck/build/start and Playwright. Browser coverage requests
  12 concurrent documents, checks unique request IDs, zero hydration refetches,
  route persistence, reload replacement, mutation, realtime takeover, axe,
  screenshot, and trace receipts. Its higher-tier execution remains reserved
  for task 5 and is not claimed by task 3.
- Test design exposed that request-owned state alone was insufficient if Next
  statically prerendered the layout. The root layout now forces dynamic document
  rendering, making the per-request contract testable rather than aspirational.
