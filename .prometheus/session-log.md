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

## 2026-08-03 — Next.js task 4 documentation and ledger boundary

- Updated the Next.js coverage entry with its packed verification command and
  source paths while keeping runtime and visual evidence planned until the
  clean production/browser receipt exists.
- Added the React scoped-store runtime exports to the 203-name ledger and
  documented `GraphStoreProvider`, `useGraphStoreApi`, provider props, and
  store-scoped engine behavior.
- Replaced stale skill guidance that hydrated request data into the singleton
  with a canonical per-request server graph, serializable RSC snapshot, one
  browser graph, scoped provider, and client-only realtime contract.
- Coverage semantics (13/13), coverage contract tests (14/14), Next structural
  tests (5/5), focused ESLint, strict OpenSpec validation, ledger truthfulness,
  and diff hygiene passed.
- A direct React package typecheck was not valid in the current unbuilt
  worktree because core `dist/` is absent. Task 5 retains the dependency-ordered
  clean build, full export-ledger verification, packed production build, and
  Playwright evidence; no green claim was inferred from source documentation.
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

## 2026-08-03 — Next.js task 5 clean packed verification

- Added the Next example's missing direct Vitest development dependency after
  the clean external consumer exposed its accidental reliance on the root
  workspace installation.
- Corrected an observed light-theme WCAG contrast failure by darkening the
  Prometheus ember token; the clean browser rerun reported zero serious or
  critical axe findings.
- Passed the tarball-only production verifier with 5 structural checks, 12
  focused units, core and React `3.0.0-rc.1` builds/packs, external strict-peer
  install, typecheck, Next.js production build, 12-request SSR isolation, and
  both Playwright flows.
- Promoted the Next.js showcase and SSR/browser receipts to `implemented` only
  after checking in the JSON, screenshot, Playwright report, and trace evidence.
- The 203-export ledger, all three TypeScript scopes, 13/13 semantic scenarios,
  14/14 coverage regressions, strict OpenSpec, Changesets, release contract,
  diff hygiene, and security gate all passed. Security reported zero critical,
  high, or blocking advisories and two low advisories.
- Dart/Melos, Cargo, Flutter, and Tauri gates were not applicable to this
  Next.js task. Overall release coverage remains in progress with three planned
  showcases.

## 2026-08-03 — Next.js task 6 evidence and release disposition

- Completed a criterion-by-criterion audit against the signed phase plan and
  OpenSpec delta. Concurrent SSR isolation, hydration without refetch or error,
  tarball-only production build, and browser E2E each have direct retained
  evidence.
- Recorded six artifact hashes, pass predicates for every verifier command,
  explicit browser/hosting/platform exclusions, and the observed Vitest and
  accessibility corrections in the final verification packet.
- Recorded release impact without collapsing the two lanes: the pushed Next.js
  continuation adds scoped-store APIs for a later coordinated prerelease, while
  the frozen React `3.0.0-rc.1` candidate and its isolated gate-fix PR can stage
  first without moving candidate source.
- Confirmed no current root, example, release, or coverage document still calls
  the Next.js showcase planned. Historical task-4 evidence remains unchanged
  because it truthfully records the state at that earlier boundary.
- The change is ready for artifact-refiner, isolated adversarial review, strict
  OpenSpec verification, and archive. Those certification results are not
  inferred from implementation evidence and remain the next gates.

## 2026-08-03 — Next.js review corrections and refiner cycle 2

- The first isolated review passed without critical findings but surfaced two
  real warnings: task-5 output was mislabeled as task 3, and provider-owned
  graphs attached listeners without receiving their own GC interval.
- Corrected both at `9051b10`: final report metadata is task 5, garbage
  collection is keyed by selected graph, and a focused regression proves that
  collecting one graph does not mutate its sibling. Singleton defaults remain
  backward compatible.
- Regenerated the complete tarball-only Next.js receipt with the corrected core
  bytes. All 10 commands, 13 focused units, 5 structural tests, 12/12 isolated
  requests, 2/2 browser flows, and accessibility checks passed.
- Updated advanced/package/skill API guidance and all six retained hashes.
  React exports, semantic coverage, coverage regressions, strict OpenSpec,
  Changesets, release contract, frozen install, diff hygiene, and security pass.
- Artifact-refiner cycle 2 (`46725a52-9c0b-409b-bf20-26eb6447cb8e`) finalized
  with 2/2 warnings corrected and 8/8 blocking constraints satisfied. A new
  full-diff adversarial review remains required; the prior review cannot certify
  the changed artifact.

## 2026-08-03 — Next.js second review block and lifecycle correction

- The complete cycle-2 review returned BLOCK with one critical finding: the
  advertised no-argument verifier still defaulted to the obsolete task-3
  evidence path. It also warned that scoped window listeners and GC retained
  unmounted provider graphs.
- Changed the default output to `task-5-verification.json` and added a structural
  regression that locks the package command, default path, and task metadata
  together.
- Replaced render-time one-shot listener attachment with React-effect ownership
  and a reference-counted core disposer. The final hook unmount now removes all
  selected-graph window listeners and stops its GC interval; repeated disposer
  calls are idempotent.
- Added core and React lifecycle tests. The exact no-argument verifier passed
  with 6 structural tests, 15 focused units, 12/12 request isolation, 2/2
  browser flows, zero serious/critical accessibility findings, and regenerated
  hashes. The blocked review is retained and cannot be used for archive.

## 2026-08-03 — Next.js final review and archive

- Two later isolated reviews found additional evidence-boundary defects: the
  packed verifier first substituted the checked-in Next config, then scanned
  only that config while the copied Vitest config retained workspace aliases.
- Preserved the real Next config, added provider-store rebinding and adapter
  cleanup, excluded source-only tests/config only after their focused gate, and
  scanned all 112 remaining copied TypeScript, JavaScript, JSON, and YAML files.
- The final task-5 receipt records zero aliases, 9/9 structural checks, 16/16
  focused runtime tests, 12/12 isolated requests, 2/2 browser flows, and zero
  serious or critical accessibility findings.
- Artifact-refiner cycle 5 (`eb548fe2-93fa-4cbf-a1d7-c8e067a2c188`) passed all
  eight blocking constraints and six evidence hashes. The final REST review was
  verified cross-model distinct, passed strict anti-sycophancy at 0.0, and
  returned PASS with one retained queued-flush warning.
- Synced the new main capability spec and archived the complete OpenSpec change
  to `openspec/changes/archive/2026-08-03-v3-nextjs-app-router-example/`.
  Stable 3.0 and npm publication remain separate gates.
