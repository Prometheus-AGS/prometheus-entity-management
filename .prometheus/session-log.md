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

### v3-agentic-a2ui-example certified (same session, second change)

- Built the dedicated `examples/agentic-a2ui` Vite 8 + React 19 app: in-page
  deterministic A2A v1 agent (keyless, fixed-clock golden replays), official
  A2UI v0.9.1 rendering, and the policy-gated action catalog with a human
  approval dialog. Console demonstrates streaming states, artifact rendering,
  validation failure, authorization denial (allowlist + tenant), cancellation,
  optimistic confirm, realtime coalescing, lifecycle events, and an
  HTTPS/loopback-only external-agent panel.
- Golden fixtures (`tests/golden/*.json`) pin happy/denied/malformed/cancelled
  plus the contract surface and the 403 tenant guard; byte-for-byte replay via
  `pnpm run test:agentic-a2ui:golden`.
- Defects found by the evidence loop (both example-local, no library fixes):
  unstable Zustand selector snapshots (React #185) → stable slice selection +
  memoized joins; double realtime event counting → single adapter channel
  registration. Also learned: A2A `patch` targets the local patch layer, so
  canonical agent mutations use `upsert`; stream events arrive wrapped in
  `{task|statusUpdate|artifactUpdate}` envelopes.
- Gates: typecheck, golden 6/6, production build, Playwright 4/4 (zero
  serious/critical axe, zero console errors), verifier with sha256 artifact
  pins, coverage verifier, release tests 7/7, BDD 3/15, lint, validate,
  strict OpenSpec, changeset status. Archived as
  `2026-08-20-v3-agentic-a2ui-example`; cursor advanced to
  `v3-flutter-riverpod-a2ui-example` (16/28).

## 2026-08-21 — v3-flutter-riverpod-a2ui-example certified (17/28)

- Built the dedicated `examples/flutter-riverpod` app on the certified
  `entity_graph_flutter@3.0.0` package: Riverpod 3 (`>=3.3.2 <3.4.0`) in the
  pub workspace, genui 0.10.1 `SurfaceController` + a2ui_core 0.1.0 A2UI
  surfaces, and an app-owned fail-closed action policy (allowlist
  `task.update`, approval-gated `task.replace`, denied `task.delete`, tenant
  guard, malformed rejection). Task/Project/Comment domain mirrors the
  agentic demo seed (task-sync, project-atlas, tenant-a); offline persistence
  + convergence adapter included.
- Tests: 29/29 `flutter test` across policy, protocol, adapter-boundary,
  widget, and golden suites; goldens pin the A2UI surface message stream and
  phone/tablet task-board layouts (macOS baselines; `linux-` prefix
  auto-selected on Linux CI).
- Defects found by the evidence loop (all example-local, no library fixes):
  lambda `toGraph` closures forking Riverpod families per rebuild → static
  `encode` tear-offs; auto-dispose CRUD provider dying between `ref.read` and
  `save()` → tile watches `.notifier`; fake-clock zone trap → runtime
  constructed inside `testWidgets` body + `pumpUntilReceipts` polling;
  conflict merge now restores base value.
- Platform smoke compile-level only: `flutter build apk --debug` and
  `flutter build ios --simulator --no-codesign` succeed (Flutter
  3.48.0-0.1.pre beta, Xcode 26.6); no booted-device run — retained limit,
  not waived.
- Workspace gates: `pnpm run dart:format`, `dart:analyze` (--fatal-infos),
  `dart:test` (package 70 + example 29) all SUCCESS. Verifier
  `scripts/verify-flutter-riverpod-a2ui-example.mjs` + root scripts
  (`verify:flutter-riverpod-a2ui`, `test:v3-flutter-riverpod-a2ui-example`,
  `bdd:flutter-riverpod-a2ui`); release test 8/8, BDD 3 scenarios/17 steps,
  coverage verifier errors: [] (4 surgical coverage.json updates).
- Melos minimal fixes: `generate` gained `--depends-on=build_runner`,
  `package:check` gained `--no-private` (verified working).
- Change archived as `openspec/changes/archive/2026-08-21-v3-flutter-riverpod-a2ui-example`;
  evidence in `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-flutter-riverpod-a2ui-example/`
  (verification.json/.md + release-impact.md). Cursor advanced to
  `v3-tauri-universal-example` (17/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.

## 2026-08-21 — v3-tauri-universal-example certified (18/28)

- Built `examples/tauri-app`: one React 19/Vite 8 frontend driving Tauri 2
  desktop + mobile shells on the certified `@prometheus-ags/entity-graph-tauri`
  plugin (workspace path dep), official SQL + deep-link plugins, shared
  task-sync/project-atlas/tenant-a domain, least-privilege capabilities
  (read-only default + explicit mutation grants; denied fixtures grant
  nothing), deep links (`prometheus-tasks://task/<id>`, fail-closed parse),
  lifecycle revalidation, responsive 720px-breakpoint layout.
- Platform conditionals only in `src/platform/` (tauri-bridge/web-bridge);
  structural pins in verifier + release test enforce it.
- Tests: Rust MockRuntime E2E 3/3 (command round-trip, fail-closed denied
  webview, offline persist/clear/restore restart); bridge contract 5/5;
  Playwright Chromium desktop (1280x800) + mobile (390x844) lanes, 7/7
  scenarios each, zero serious/critical axe, zero console errors, per-project
  receipts (learned: afterAll clobbers shared evidence across workers).
- Platform builds: desktop debug binary (`tauri build --debug --no-bundle`),
  Android `app-universal-debug.apk`, iOS unsigned simulator `Prometheus Tasks.app`
  (`-t aarch64-sim`); booted-device runs recorded as retained limits.
- Defects found/fixed (9, all example-local, no library changes): SetListPayload
  hasNextPage drift; generated mobile scaffolding's `node tauri` resolution
  broken under pnpm workspace (project.yml + BuildTask.kt now point at the
  workspace CLI); `tauri ios init` needs $USER set; Gradle 8.14.3 vs Java 25
  (pinned JAVA_HOME=Temurin 21); stale edit-buffer closure on one-tap advance;
  useEntityView list doesn't live-join (board switched to useEntityList pure
  subscription); frozen-seed listFetch reverted optimistic writes (in-memory
  backend now authoritative); storage-key collision crashed reload hydration;
  Playwright evidence receipt clobbering.
- Gates: typecheck 23/23, verifier PASS (verification.json with sha256
  artifact pins), release test 8/8, BDD 3 scenarios/14 steps, validate,
  eslint clean, openspec strict valid.
- Archived as `2026-08-21-v3-tauri-universal-example`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-tauri-universal-example/`.
  Cursor advanced to `v3-flint-portable-contracts` (18/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.
