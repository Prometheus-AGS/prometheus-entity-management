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
