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

## 2026-08-20 — full-3.0-release takeover; v3-nextjs-app-router-example certified

- Session opened on the `full-3.0-release` takeover brief
  (`docs/kimi-launch-prompt.md`) on branch `main-takeover-kimi`. Restored
  position from `.kbd-orchestrator/`: the waypoint and `position.json` were
  stale — `v3-a2ui-protocol-bridge` was already archived and 14 changes were
  done, not the 2/28 the brief and 7/28 the waypoint claimed. Reconciled both
  ledgers against `openspec/changes/archive/` (now 15/28) and advanced the
  cursor honestly instead of trusting the stale files.
- Started at the first genuinely pending change in dependency order:
  `v3-nextjs-app-router-example`. Shipped an example-only implementation:
  per-request server graph (`src/lib/server/request-graph.ts`,
  `createGraphStore()` per request, tenant-sliced demo seed), neutral
  hydration payload types, `RequestHydrationBoundary` (identical server/first
  client render, post-mount freshness-stamped writes — no mismatch, no
  duplicate fetch inside staleTime), dynamic `force-dynamic`
  `/release-showcase` RSC route with 7 scenario cards, global and route
  loading/error boundaries, sidebar entry, fetch instrumentation, and a static
  release-test guard that server modules never write the process-global store.
- Fixed one observed defect: axe reported 3 serious color-contrast violations
  on light-mode `--primary`/`--ring` (`224 78 40`); moved to ember
  `177 51 23` (≥4.5:1) in `globals.css`.
- All focused gates green: typecheck, 4/4 SSR isolation node:tests, production
  `next build`, 4/4 Playwright Chromium (screenshots + traces retained),
  single-command verifier, coverage verifier, 6/6 release contract tests,
  3 scenarios/17 steps BDD, lint, validate, strict OpenSpec validation, and
  `changeset status` (after an empty changeset — the status failure was
  pre-existing baseline: local `main` lags 430 package files and prior
  changesets are consumed in `pre.json` rc mode).
- Change archived as `openspec/changes/archive/2026-08-20-v3-nextjs-app-router-example`;
  evidence in `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-nextjs-app-router-example/`.
- Discovered `origin/codex/full-3.0-continue` holds a complete never-merged
  parallel implementation of this change with library-level fixes (scoped
  graph runtime, GC/listener). Not ported — unobserved on this surface;
  flagged for operator decision in release-impact.md.
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched. Next pending: `v3-agentic-a2ui-example`.
