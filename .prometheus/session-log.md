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

## 2026-08-03 — Agentic A2UI archive boundary

- Delta: isolated review cycles 6 and 7 exposed two real trust-boundary defects
  and one later false positive. Pending destructive approvals now fail closed at
  run/reset boundaries, and credential-bearing external A2A URLs are rejected
  before discovery; both corrections were observed RED before implementation.
- The deletion-aware verifier passes 19 commands with 11/11 example units, four
  endpoint-policy regressions, package builds, three Chromium flows, 13/13
  semantic scenarios, 14/14 coverage tests, zero serious/critical accessibility
  findings, and zero blocking security advisories. All ten retained hashes match.
- Artifact-refiner cycle 7 passed 8/8 blocking constraints. The initial cycle-7
  catalog-array finding contradicted both current source and the pinned official
  processor, so no speculative code was added. An alternate isolated reviewer
  returned PASS with zero findings and anti-sycophancy score 0.0.
- The frozen React RC remains on remote `main` at
  `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; this continuation does not alter
  it. npm trusted-publisher authorization remains external to repository code.
- Completed task 2 of `v3-agentic-a2ui-example` through the signed KBD apply
  boundary. Added a dedicated React 19/Vite 8 application with an in-process
  official A2A v1 reference server, optional external-agent executor, streamed
  task lifecycle and cancellation, official A2UI v0.9.1 artifacts, exact
  application action rules, tenant denial, malformed-action and component
  rejection, human approval, and normalized list/detail graph projections.
- Scoped T0 verification passed for the new example (`tsc --noEmit` and ESLint).
  Full unit/integration/browser checks remain task 3; full build and aggregate
  phase gates remain task 5. The frozen React RC source and registry state were
  not changed; npm trusted-publisher authentication remains incomplete.
- Completed task 3 of `v3-agentic-a2ui-example` through the signed KBD apply
  boundary. Added stored happy and hostile-component A2UI v0.9.1 golden
  fixtures; direct action-policy, human-approval, graph-projection, no-model-key,
  layering, streamed artifact, malformed artifact, and cancellation tests; and
  three production-browser flows covering happy/denied/invalid/undeclared/
  approval, malformed, and cancelled behavior.
- The focused Vitest gate passed 10/10 tests. Scoped TypeScript and ESLint
  passed, and Playwright discovery found all three expected browser tests.
  Production build and browser execution remain intentionally unclaimed until
  task 5.

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

## 2026-08-03 — React-first RC immutable rehearsal certified

- Merged PR #12 as `1c40eaa08da210cbe3e20a77c5db211712b5c3a1` after the
  Node 22, 24, and 26 CI matrix passed. The correction makes GitHub Actions
  include the hidden `.release-candidate` directory and staging recovery
  journal in uploaded artifacts.
- Dispatched release-candidate rehearsal run `30837597774` from `main` and
  verified its recorded `headSha` exactly matched the merge commit. The full
  certification gate, 16-artifact rehearsal, GitHub attestation, and immutable
  bundle upload all passed.
- Downloaded and independently inspected the uploaded bundle. All 12 npm
  tarballs are `3.0.0-rc.1`, their SHA-512 digests match the recovery journal,
  packed names and internal RC ranges are correct, and the source SHA is bound
  to `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`.
- The rehearsal made no registry mutation, preserved every existing `latest`
  tag, selected npm `next`, retained 15 package/native dry-run receipts, and
  recorded Flutter with zero warnings plus successful Rust CLI/MCP dry runs.
- The remaining pre-staging boundary is npm account authority. The existing
  token authenticates as `babyice1906`, but npm rejects trusted-publisher reads
  with HTTP 403 because bypass-style tokens cannot manage trust. Two isolated
  web-login attempts expired without browser completion and were cancelled at
  the password prompt; no password, OTP, or temporary npm configuration was
  retained.

## 2026-08-03 — Agentic A2UI task 4 coverage and guidance synchronization

- Corrected the showcase path to `examples/agentic-a2ui-app` and added partial
  capability evidence for the focused keyless lifecycle, action-policy, golden,
  and architecture tests.
- Preserved the fail-closed showcase contract: both runtime and visual evidence
  remain `planned` until task 5 runs the clean production build and Chromium
  flows.
- Added the release guide and agent skill reference, then linked the example
  from the root, release, examples, A2A, and A2UI documentation.
- Confirmed the example changes no package source or publishable entry point;
  the A2A and A2UI public export ledgers remain unchanged.
- Coverage validation passed all 13 semantic scenarios, the focused coverage
  suite passed 14/14 tests, strict OpenSpec validation passed, and diff/link
  hygiene passed. Package export verification could not run without built
  `dist/` artifacts and is deferred explicitly to the task-5 clean gate.
- Completed KBD task 4 of 6 at signed revision 70. Tasks 5 and 6 remain.

## 2026-08-03 — Agentic A2UI task 5 clean verification

- Added a deletion-aware `pnpm run verify:agentic-a2ui` gate and ran it from a
  clean generated state. Frozen install, typecheck, lint, 10 focused units, four
  package builds, both export ledgers, the production Vite build, three Chromium
  flows, coverage checks, the production security audit, strict OpenSpec, and diff
  hygiene passed.
- The browser run retained exactly three screenshots and three traces, recorded
  zero serious or critical accessibility findings, and proved the happy policy and
  approval flow, malformed-artifact rejection, and pre-delivery cancellation.
- Corrected two observed contrast defects, aligned one browser assertion with the
  policy's “not allowlisted” message, and fixed a real transactional defect where a
  rejected untrusted component left a partial empty surface in the official A2UI
  runtime.
- The partial-surface cleanup is security hardening at the actual untrusted-agent
  artifact boundary. A focused regression proves the invalid surface is removed
  without deleting previously existing surfaces.
- Promoted the example's runtime and visual coverage plus its public docs and skill
  guidance to `implemented`, then reran the coverage, ledger, strict OpenSpec, and
  diff gates against that final declaration state.
- Recorded the source-workspace evidence boundary, the non-blocking approximately
  661 kB Vite chunk warning, two low audit findings with zero blocking findings, and
  the explicit exclusion of external-agent, packed-consumer, Flutter, Tauri, and
  native certification from this change.

## 2026-08-03 — Flutter/Riverpod A2UI dependency boundary

- Activated `v3-flutter-riverpod-a2ui-example` in the signed KBD control plane,
  registered its complete six-task surface before execution, and completed task
  1 at revision 83. A follow-up signed transition restored the change itself to
  `in_progress` at revision 84 after task registration re-derived it to pending.
- Confirmed `v3-dart-graph-riverpod`, `v3-a2ui-protocol-bridge`, and
  `v3-example-coverage-contract` from their archived 6/6 OpenSpec task surfaces,
  retained verification artifacts, promoted canonical specs, and fresh strict
  OpenSpec validation passes.
- Preserved the provenance caveat: the signed legacy import retains aggregate
  completion but does not backfill individual events for those older changes,
  so their empty pending KBD task maps were not presented as completion proof.
- The task-1 receipt keeps the canonical architecture explicit: one Dart
  `EntityGraph`, Riverpod as projection/orchestration, official `genui` protocol
  ownership, safe catalog actions, deterministic coverage evidence, and an
  optional native transport that does not own graph state.
- No Flutter application code or dependency version changed in this task.
  Tasks 2–6 remain, and publication remains unauthorized.

## 2026-08-03 — Flutter/Riverpod A2UI implementation boundary

- Added the complete `examples/flutter-riverpod` Android/iOS application on the
  shared Task/Project/User fixture domain and registered it in the root Pub
  workspace.
- Implemented one canonical application graph, generated Riverpod list/entity/
  CRUD/mutation/realtime flows, ID-only list projections, project and assignee
  joins, optimistic confirmation/rollback, relationship invalidation, offline
  queue convergence, and deterministic realtime changes.
- Added an optional `FfiEntityTransportAdapter` demonstration whose callback
  bridge forwards I/O without owning graph state.
- Exact-pinned official `genui 0.10.1`, adapted the shared A2UI semantic fixture
  to GenUI's required `v0.9` wire identifier, and isolated the experimental API
  behind an app-local renderer.
- Added atomic untrusted-JSONL preflight plus application action policy at the
  real agent-output, tenant, mutation, and native-transport trust boundaries.
  Unknown components/client functions fail before surface mutation; tenant and
  payload mismatches fail before graph mutation; archive requires approval;
  delete is denied.
- Scoped formatting and fatal-info/fatal-warning Dart analysis pass with no
  issues. Tests, goldens, stable Flutter 3.44.8 resolution, Android/iOS smoke,
  coverage promotion, docs, and publication remain explicitly unclaimed.

## 2026-08-03 — Flutter task-3 test and mobile-smoke surface

- Added 25 passing Flutter host tests covering atomic A2UI validation, policy
  decisions, official GenUI rendering/actions, the normalized graph, generated
  Riverpod CRUD/mutations, optimistic confirmation and rollback, offline queue
  convergence, realtime updates, relationships, FFI forwarding, lifecycle
  states, accessibility semantics, and complete widget action flows.
- Added and inspected three deterministic phone/tablet goldens, with their
  SHA-256 receipts recorded in task evidence.
- Added one shared integration test plus manually dispatched Android API 35 and
  iOS simulator workflow lanes pinned to Flutter 3.44.8 stable. Static workflow
  validation passes; native execution remains task 5 and is not claimed here.
- The tests found and corrected three runtime defects: duplicate GenUI button
  labels, auto-disposed CRUD/mutation notifiers losing their `Ref` during async
  operations, and seeded relationship rows lacking invalidatable entity state.
- Fatal Dart analysis and the complete 25-test app suite pass. Coverage ledger
  promotion, stable-toolchain/device certification, and publication remain
  pending.

## 2026-08-03 — Flutter task-4 declared surface

- Added an evidence-bearing `partial` showcase state so the release ledger can
  record passing Flutter host tests and goldens without misreporting
  stable-SDK or Android/iOS certification.
- Promoted only the Flutter host runtime, optimistic CRUD, in-memory
  offline/reconnect, and visual entries to partial; overall coverage remains
  in progress and release certification remains false.
- Added complete example, release, and skill guidance for the one-graph
  Riverpod/transport architecture and the atomic, default-deny GenUI action
  boundary.
- Confirmed the application adds no package declaration: the Dart public API
  ledger remains byte-identical at 81 entries.
- Coverage, 35 focused Node/Dart tests, three BDD tags, release-contract
  validation, scoped ESLint, strict OpenSpec, link checks, and diff hygiene
  pass. The aggregate skill gate stops only at an unrelated missing Tauri dist;
  all reached ledgers and the directly affected Dart ledger pass.
- Stable Flutter 3.44.8 and Android/iOS execution remain task 5. No publication
  authority changed, and the React RC lane remains frozen.

## 2026-08-04 — Flutter showcase verification and archive

- Stable Flutter 3.44.8 / Dart 3.12.2 passed generation, analysis, 70 package
  tests, 25 showcase tests, and three goldens. The shared mobile smoke passed
  once on an iPhone 17/iOS 26.5 simulator and once on an Android API 35 arm64
  emulator.
- Promoted only the evidence-backed Flutter showcase, CRUD, visual, and platform
  capabilities to implemented. Durable offline persistence remains partial,
  overall coverage remains in progress, and release certification remains
  false.
- Artifact-refiner passed 8/8 blocking constraints. Three isolated review
  cycles corrected a stale KBD projection/incomplete packet and then a real
  workflow working-directory defect; the final review and 0.0 sycophancy screen
  passed.
- Final root CI passed 90/90 BDD scenarios and 428/428 steps with zero blocking
  production advisories. All 17 promoted OpenSpec specifications pass strict
  validation.
- Synchronized the bounded main spec and archived the completed 6/6 change at
  `openspec/changes/archive/2026-08-04-v3-flutter-riverpod-a2ui-example/`.
- Preserved the frozen React `3.0.0-rc.1` source on remote `main`; no registry,
  npm tag, pub.dev, app-store, or stable-release authority changed.
