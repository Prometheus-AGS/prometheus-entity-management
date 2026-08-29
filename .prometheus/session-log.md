# Session log

## 2026-08-29 — React DevTools accepted UI specification implementation

- Completed task 10 of `v3-devtools-react-inspector` at canonical revision 377
  and restored the parent change to in-progress at revision 378.
- Added controller-owned affected entity/view attribution, ordered registered
  view membership, rendered subscriber counts, Graph Pulse, cross-workspace
  causal selection, collapsible navigator/trace rails, original/patch/live/diff
  inspection, entity history, view last-change truth, Activity correlation and
  retention details, Overview event rate, a serializable URL state adapter, and
  the accepted responsive forensic visual system.
- Core typecheck, scoped task-file ESLint, source-contract assertions, and diff
  hygiene passed. React's package typecheck remained intentionally unclaimed
  because the unbuilt core declarations do not yet contain the new protocol
  fields; the dependency-ordered packed gate remains task 11.
- No unit, component, isolated, mock-backed, snapshot, partial integration,
  full integration, or build gate ran. Sovereign sync was not changed.

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

## 2026-08-05 — RC staging trusted-publishing hotfix

- Protected npm staging run `30976967778` failed before registry mutation because
  `actions/setup-node@v6` injected its dummy `NODE_AUTH_TOKEN` and the OIDC-only
  release guard correctly rejected any long-lived write-token-shaped authority.
- Updated only the stage job to `actions/setup-node@v7`, retained the token guard,
  and added an explicit cross-run candidate reuse path so the already-certified
  rehearsal artifact can be staged without repeating the full CI rehearsal.
- The reuse path binds run ID and source SHA atomically and proves the current-repo
  workflow path, completed source run, successful `rehearse` job, and unexpired
  SHA-named artifact before download. An isolated first review found two defects
  in the initial reuse design; both were corrected and the second review passed.
- Local release verification passed for 12 tarballs and 16 artifacts with no
  registry mutation. npm publication remains pending protected-environment
  approval and post-stage registry verification.

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

## 2026-08-04 — Universal Tauri example dependency gate

- Reconciled the stale KBD next-work pointer against signed revision 98 and the
  immutable plan sequence, then activated `v3-tauri-universal-example`.
- Registered its complete six-task surface before starting task 1. Signed
  revision 108 records task 1 complete and the parent change restored to
  in-progress after task registration reproduced the known pending-reset seam.
- Verified all three dependencies from archived 6/6 task surfaces, promoted
  strict specifications, and retained verification receipts. The legacy signed
  pending projections for imported dependency changes were not treated as
  completion evidence.
- Preserved the remaining application boundary: shared desktop/mobile Tauri
  runtime, restart/offline behavior, capability denial, lifecycle/deep-link UI,
  responsive interaction, desktop E2E, and separate Android/iOS build/smoke
  receipts remain implementation work.
- No package, application, coverage, public API, or registry state changed; the
  frozen React RC source remains independent.

## 2026-08-04 — Universal Tauri example task-2 implementation

- Added one React 19/Vite 8/Tauri 2 application shared by desktop, Android, and
  iOS, including official generated mobile shells and Prometheus icon assets.
- Kept the application on the canonical singleton normalized graph with ID-only
  task lists and strict component-to-hook-to-store-to-service layering.
- Added native SQLite and browser-preview persistence behind one adapter
  boundary, plus a separately durable offline mutation queue with optimistic
  graph patches and reconnect convergence.
- Added lifecycle/deep-link handling, responsive desktop/mobile UI, and a real
  least-privilege capability-denial path while withholding destructive graph
  permissions.
- Corrected observed TypeScript record-shape, hook dependency, error-cause,
  Tauri icon, serde_json, and executable-runtime integration defects.
- Scoped TypeScript, ESLint, Rust formatting, stable locked Cargo check, diff
  hygiene, component layering, and Android/iOS initialization all pass.
  Runtime/E2E/restart tests, docs/ledgers, clean builds, and platform smoke stay
  assigned to tasks 3–5. The frozen React RC and all registry state remain
  untouched.

## 2026-08-04 — Universal Tauri example task-3 test boundary

- Added five passing browser-runtime units for normalized ID-only graph state,
  durable offline restart/reconnect convergence, malformed persisted queue
  denial, truthful browser/native capability reporting, and fail-closed deep
  links.
- Added two passing stable-Rust Tauri mock-host tests that prove registered
  graph IPC commands work and the main webview is denied destructive clear.
- Added a seven-check source verifier with four rejection regressions for
  capabilities, layering, and generated mobile shells; it cannot be mistaken
  for native platform build evidence.
- Authored and discovered three Playwright flows for graph reactivity, offline
  reload/convergence, and responsive accessibility. Their execution remains at
  the clean task-5 boundary alongside desktop and Android/iOS platform lanes.
- The machine's default Rust 1.99.0 nightly hit a compiler ICE in Tokio; the
  unchanged locked suite passed 2/2 on certified Rust 1.97.1 stable. The frozen
  React RC source and npm registry state remain untouched.

## 2026-08-04 — Universal Tauri task-4 declared surface

- Corrected the Tauri showcase path to `examples/tauri-universal` and recorded
  partial capability evidence for browser-runtime durable queue/reload and
  stable-Rust MockRuntime command/denial checks.
- Kept the showcase planned because browser visuals, desktop packaging,
  Android/iOS app smoke, relationship invalidation, and realtime coalescing
  remain unexecuted task-5 gates.
- Added complete example, release, and agent-reference documentation for the
  one-graph/service-boundary architecture and its evidence limits.
- Reconciled stale plugin prose with the existing hash-verified Android
  physical-device and iOS simulator receipts without using those receipts as
  universal-app certification.
- Confirmed no package API changed: all JS, Tauri, and Dart ledgers pass; the
  Tauri ledger remains 26 runtime and 57 declaration exports with its prior
  hash intact.
- Coverage, coverage/release BDD, strict OpenSpec, focused lint, stable root
  Rust tests, source verification, and diff hygiene pass. The React RC source
  and registry state remain independent and untouched.
- Signed task completion committed at revision 116 with both after-hooks green.
  The known parent-projection reset was corrected through a typed transition at
  revision 117; tasks 5 and 6 remain pending and the change remains in progress.

## 2026-08-04 — Universal Tauri task-5 platform and clean gates

- Executed five Chromium flows with zero serious/critical axe findings and
  retained hash-bound screenshots/traces for normalized identity, relationship
  invalidation, realtime coalescing, offline restart/reconnect, and responsive
  accessibility.
- Built and ran the complete application as a packaged macOS app, Android API
  36 arm64 emulator APK, and unsigned iOS 26.5 arm64 simulator archive. macOS
  proved native SQLite across process restart and reconnect; macOS and Android
  proved real capability denial.
- Corrected the Tauri list IPC optional-metadata mismatch, persisted browser
  connection mode, application version `0.0.1`, and stable Rust selection in
  generated Android/iOS build phases. Added a patch changeset only for the
  public Tauri package correction.
- Promoted the fifth and final requested showcase to `implemented` at its
  declared evidence boundary. Overall 3.0 coverage remains `in-progress` and
  Windows/Linux, physical devices, signing, app stores, documentation,
  certification, and publication remain separate.
- Frozen install, app/package typechecks, 7 application tests, 6 contract
  regressions, 16 Tauri package tests, 2 stable-Rust host tests, both builds,
  package dry-run, coverage/BDD, release-contract/BDD, skills, security,
  Changesets, strict OpenSpec, and diff hygiene passed.
- Recorded a redacted postmortem after a failed diagnostic exposed an inherited
  Cargo registry credential in tool output. Subsequent builds removed registry
  credentials from child environments; the external credential owner must
  rotate the exposed value.
- The frozen React `3.0.0-rc.1` source, remote `main`, npm `next`, and npm
  `latest` were not changed.

## 2026-08-04 — PR #10 merge-readiness repair

- Confirmed the PR remains required: its 56 commits contain the active 3.0
  release implementation that is absent from `main`.
- Merged the four newer `main` commits without reintroducing stale active
  OpenSpec copies, preserving the Flutter provenance, `uv`, and hidden release
  artifact hotfixes plus their postmortems.
- Corrected scoped graph persistence, hydration, offline replay, Entity
  Explorer projections, and time-travel restore behavior while retaining the
  singleton defaults for existing callers.
- Full repository CI passed, including validation, lint, workspace typechecks,
  builds, tests, skills verification, and security checks. An isolated
  adversarial review reported no actionable findings.

## 2026-08-04 — PR #10 remote CI follow-up

- The first remote matrix run exposed a GitHub-hosted runner timeout in the
  100k incremental parity proof; retained the workload and bounded that one
  test to 15 seconds.
- The next Node 22 run exposed a stale sync/persistence contract assertion that
  still described the now-certified Tauri platform receipt as `planned`.
  Updated it to the ledger's `implemented` status and verifier command.
- Recorded both observed defects in `.prometheus/postmortems/`; no production
  behavior or security boundary changed in either follow-up.
- A subsequent Node 22 runner exposed contention in the 10k wall-clock scale
  assertion (306 ms versus 250 ms) while the parallel 100k proof occupied the
  same suite. The next run reproduced the same issue at 1k (59.7 ms versus 50
  ms). Preserved both focused/local ceilings and applied an explicit 2×
  scheduling allowance only when `CI` is exactly `true`.

## 2026-08-04 — Universal Tauri task-6 certification and archive

- Tightened durable offline-queue hydration so retained mutations must use the
  canonical `task-status:<taskId>` identifier, a canonical ISO timestamp, and
  one queued mutation per task before they can enter application state.
- Rebuilt and re-ran the current macOS, Android API 36 emulator, and iOS 26.5
  simulator lanes against the remediated source. The retained 30-file source
  bundle is bound by SHA-256
  `c52fabe6890b49bd04a4d283f9f2d06ef9c3f0bdf92ae14ecaa93181f9764ee6`.
- Artifact-refiner passed all 8 blocking constraints. The isolated REST judge
  returned PASS with 0 critical, 1 warning, and 0 suggestions; the strict
  anti-sycophancy screen passed at 0.0. The retained warning identifies the
  lack of an in-process retry after a transient initialization failure and did
  not expand the bounded lifecycle contract.
- Promoted the universal-example specification and archived the completed 6/6
  change at
  `openspec/changes/archive/2026-08-04-v3-tauri-universal-example/`. All 18
  promoted OpenSpec specifications pass strict validation.
- The frozen React RC source remains remote `main` commit
  `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; no npm tag or registry state was
  changed by this work.

## 2026-08-04 — Flint portable contracts dependency gate

- Activated `v3-flint-portable-contracts`, registered its complete six-task
  surface, and completed task 1 through the KBD-owned apply driver. Signed
  revision 132 retains task 1 complete and restores the parent change to
  `in_progress` after the known task-transition projection reset.
- Verified both plan dependencies from archived changes, retained verification
  receipts, and promoted specifications that pass strict OpenSpec validation.
  Legacy signed pending projections were not used as completion evidence.
- Refreshed the fetched `origin/main` revisions for Flint Realtime Fabric, Flint
  Gate, and Flint Forge and confirmed the realtime SDK still exposes the
  structural `watchEntities`/`mutateEntity` contract consumed locally.
- Refreshed official JWT, JWKS/signing-key, and RBAC research through Firecrawl.
  The portable fixture, explicit fail-closed live lane, auth/provisioning tests,
  documentation, clean gates, QA, review, and archive remain tasks 2–6.
- Preserved the frozen React `3.0.0-rc.1` source at remote `main` commit
  `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; no package or registry state
  changed.

## 2026-08-04 — Flint portable contracts task-2 implementation

- Removed the default test's absolute sibling paths and silent skip. Default
  CI now executes a checked fixture pinned to Flint Realtime Fabric revision
  `cfc1bb2bfc5db3b152967e0383aeaaf5207a4b89` through the normalized graph.
- Added a dedicated real-SDK test and manual GitHub workflow that require an
  immutable commit, frozen installs, built SDK artifacts, compatible exports,
  and the expected entity-change kind. Missing or incompatible inputs fail the
  lane.
- Proved the negative lane exits nonzero without its required external root and
  proved the positive lane 1/1 against a clean detached worktree at the pinned
  revision. Portable tests passed 2/2; core typecheck, focused lint, actionlint,
  default discovery, and diff hygiene pass.
- Corrected an observed TypeScript include defect by naming the Node-only lane
  as an integration test and excluding only that file from default Vitest.
- Kept the public Flint adapter API and dependency graph unchanged. Security
  matrix tests, Forge/Gate documentation, coverage/skills synchronization,
  clean gates, and final QA remain tasks 3–6.
- Signed task 2 complete at revision 134 with both after-hooks successful, then
  restored the parent change to `in_progress` through a typed revision-135
  transition after the known projection reset.
- Preserved remote `main` and the frozen React RC source; npm and all registry
  tags remain untouched.

## 2026-08-04 — Flint portable contracts task-3 verification

- Added a hash-bound Flint contract fixture plus six Node regressions and five
  BDD scenarios for realtime, issuer/tenant/`kid`/JWKS, role/key separation,
  and Forge provisioning semantics.
- Extended the opt-in live workflow to pin and verify Realtime Fabric, Gate,
  and Forge together. Clean detached worktrees at revisions `cfc1bb2`,
  `2438892`, and `2289d15` passed all 14 source-file digests.
- The first BDD run exposed a CommonJS-loader failure from CLI top-level await;
  wrapping the entrypoint in async `main()` corrected the observed boundary.
  The rerun passed 5/5 scenarios and 16/16 steps.
- Corrected the stale strict-JWK assessment: current RSA publication contains
  standard `n` and `e`, while EC still lacks `crv`, `x`, and `y`. No unbuilt
  Forge or JWK adapter is claimed.
- Task-scoped units, BDD, verifier receipts, focused lint, core typecheck,
  actionlint, JSON parsing, and diff hygiene pass. Aggregate clean gates and
  final QA remain tasks 5 and 6.
- Signed task 3 complete at revision 137 with both after-hooks successful, then
  restored the parent change to `in_progress` through typed revision 138 after
  the known projection reset.
- Preserved frozen React candidate `main@1c40eaa`; npm `next`, `latest`, and
  every registry version remain unchanged.

## 2026-08-04 — Flint portable contracts task-4 synchronization

- Promoted the Flint-owned realtime and security evidence in
  `examples/coverage.json` from planned to implemented with exact commands,
  source paths, and portable-versus-live applicability.
- Added release and agent references for the structural client, tenant and key
  boundaries, precise RSA/EC JWK behavior, and external Forge
  plan/apply/RLS/audit/restart semantics. The skills explicitly reject client
  service-role material and any unbuilt Forge adapter claim.
- Updated the human API and React README tables. The machine export ledger was
  not regenerated because the package entry point did not change; its existing
  `createFlintAdapter` and `publishFlintMutation` entries remain authoritative.
- Focused verification passed: 7/7 Node tests, 6/6 BDD scenarios and 20/20
  steps, 13/13 shared scenarios, all 16 coverage capabilities and artifacts,
  React's 203 runtime exports, all companion ledgers, ESLint, JSON, syntax, and
  diff hygiene.
- The task begin signal's display-only title lost a backticked path through
  shell command substitution; signed task identity and state were unaffected,
  and subsequent task boundaries use literal-safe quoting.
- Signed task 4 complete at revision 140 with both after-hooks successful, then
  restored the parent change to `in_progress` through typed revision 141 after
  the known projection reset.
- Preserved frozen React candidate `main@1c40eaa`; npm and dist-tags remain
  unchanged.

## 2026-08-04 — Flint portable contracts task-5 clean gates

- Verified candidate `bcecaed160c2c16928a7dd9eac8b4fdabb6a0e1b` from a
  detached worktree with a frozen 17-workspace pnpm install and one serialized
  complete `CI=true pnpm run ci` pass.
- Built the pinned Flint Realtime Fabric SDK and entity-management packages at
  `cfc1bb2`, then passed the real-SDK graph round trip 1/1.
- Passed the portable/external verifier against hash-bound Realtime Fabric,
  Gate `2438892`, and Forge `2289d15` sources, strict OpenSpec validation, and
  actionlint. No client secrets or machine-specific default paths were found.
- Confirmed PR #10 green on Node 22, 24, and 26 plus the Tauri permissions and
  packed-consumer job at the exact candidate SHA.
- Recorded a verification postmortem after overlapping package-output writers
  produced a non-reproducible partial-tarball failure. The exact focused gate
  and serialized full CI passed without a source change.
- Dart/Cargo/native platform builds were not relevant to the Flint-only source
  delta and are not claimed. Remote `main` remains frozen at `1c40eaa`; npm
  `next`, `latest`, and all registry versions remain unchanged.
- Signed task 5 completed at revision 143 with both after-hooks green; the
  known parent reset was restored through typed revision 144. Task 6 remains
  pending and the Flint change remains in progress.

## 2026-08-05 — Documentation and npm RC recovery local certification

- Delta first: adversarial rounds 12–17 found unsafe recursive cleanup targets,
  stale native re-signing, evidence/receipt identity gaps, mutable API source
  links, incorrect responsive widths, a symlink escape in the local server, and
  host-dependent Flint SVG typography. Each critical or warning was corrected;
  round 18 returned PASS with no findings and the strict sycophancy screen
  scored 0.0.
- Certified product commit
  `acae0cd29374e6f4bb76dd4a527f1e809a3707f6` from the isolated
  `codex/docs-rc-recovery` worktree. The primary checkout was not modified.
- Passed local documentation contracts for 51 content files, 18/18 focused
  units, compiled snippets, README parity for 12 packages / 5 examples / 16
  capabilities / 17 commands, the full Docusaurus build, 17 deep-route and
  2020-file build checks, and 4/4 desktop/mobile/search/API/404 browser flows.
- Passed npm trust tests 5/5, release pipeline tests 27/27, actionlint, and the
  production dependency audit with zero blocking, high, or critical advisories.
- Reproduced the Pages generation order in a depth-one clone at the exact
  product commit: offline frozen install, all 12 package builds, evidence,
  packed TypeDoc, and search generation left a completely clean worktree.
  Evidence generation was independently repeated with an identical SHA-256
  inventory.
- Local Lighthouse medians passed all budgets across three runs per route:
  homepage 0.98 performance / 1.00 accessibility / 2298 ms LCP; React 0.97 /
  0.96 / 2452 ms; Flint 0.97 / 0.96 / 2451 ms; best practices and SEO were
  1.00 and CLS was 0 for all routes.
- The REST critic could not build its 2.28 MB request because the host argument
  limit was exceeded. The documented fresh-context fallback reviewed only the
  mandate and packet; cross-model identity remains explicitly unverified within
  the same harness family rather than being reported as distinct.
- Security boundaries added by this change include stage-only OIDC with token
  prohibition, content-addressed and receipt-bound evidence, ancestor-aware
  cleanup containment, realpath-contained local HTTP reads, and repository-font
  SVG outlines that avoid platform font substitution.
- Public completion remains human/external: npm browser login, 2FA trust
  registration, staged approval, and registry verification; plus branch merge,
  Pages deployment, public-origin probes, and repository-homepage update. No npm
  package, dist-tag, Pages setting, or repository homepage was mutated here.

## 2026-08-06 — Registry and documentation parity refresh

- Verified npm registry state for all twelve packages: React, core, and A2UI
  React expose `3.0.0-rc.1`; React `latest` is the RC; nine candidates remain
  staged and absent from public `next`.
- Verified `entity_graph_flutter@3.0.0` is public on pub.dev with archive
  SHA-256 `3e8081a8a71a1ed6df8d59eea328405c3d8124287e3698686e1d32cc75b61479`;
  pub.dev reports no verified publisher assignment.
- Updated the root README, release guides, Flutter package README, Docusaurus
  banner/guides/examples/evidence context, generated search index, and registry
  status manifests. Added deterministic README and site registry-parity checks.
- Targeted T0/T1/T2 documentation gates passed: README parity, type/content
  checks, 19 site tests, packed API/evidence hashes, native API hashes, the
  production Docusaurus build, and 17 deep-route/2020-file build checks.
- No general CI, browser/device matrix, or GitHub workflow was dispatched.
- The artifact-refiner workflow-dispatch helper failed after checkpointing with
  a JSON decode error; the checkpoint remained valid and the defect did not
  block documentation verification.
- The first isolated adversarial review rejected two parity gaps: consumer
  verification was not a generator gate, and site tests did not compare exact
  registry/search values or forbid staged RC install commands. Both were fixed;
  the second fresh-context review passed with 0 findings and the strict
  sycophancy screen passed at 0.0.

## 2026-08-20 — Existing-entity React projection repair

- UAR's live embedded-SSE acceptance path observed a normalized KnowledgeBase
  update while the rendered card retained its prior name. Focused negative
  controls reproduced the defect in both `useEntityView` and `useEntityQuery`.
- Replaced ID-only item memoization with snapshot subscriptions. The focused
  controls changed from 2 failed to 2 passed; the full React package passed
  58 tests, typecheck, build, and the 203-export publish check.
- Added a patch Changeset for the React package. Because npm packages are a
  fixed version group and `3.0.0-rc.1` is immutable, the release process must
  materialize the next coordinated candidate rather than rewriting rc.1.

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


## 2026-08-21 — v3-flint-portable-contracts certified (19/28)

- Replaced the machine-specific Flint live test with a portable two-lane
  design: default CI runs the watch/mutate round-trip against a checked
  fixture (`flint-live.fixture.ts`, mirrors frf-entity-management adapter
  semantics line-for-line); the live SDK lane is env-gated
  (`FLINT_EM_MODULE`/`FLINT_SDK_MODULE`) and fails closed — verifier probe
  opts in with bogus paths and requires a non-zero exit.
- New `flint-security.test.ts` pins seam security: tenant/channel propagation,
  checkpoint key separation per channel+consumer (no cross-tenant resume),
  entityType scoping, fail-closed malformed/wrong-kind envelopes.
- Auth contract pinned as data, not code: `tests/fixtures/flint-auth/claims-contract.json`
  encodes facts verified against flint-gate `jwt_verify.rs`/`jwks.rs`
  (iss/aud when configured; no-kid multi-key JWKS rejected; unknown kid → one
  rate-limited refresh; asymmetric-only key selection = the strict-JWK
  caveat), flint-forge ext-flint-auth + migrations 0013/0014 (roles NOLOGIN,
  service_role BYPASSRLS, FORCE RLS), and the key spec (`flint_pk_`/`flint_sk_`).
  Token verification deliberately NOT reimplemented here (identity plane is
  flint-gate; observed-problems-only).
- `docs/flint-integration.md` documents the seam, live-lane opt-in, claims
  contract, Forge provisioning (`forge migrate` = apply; no `plan` subcommand
  exists — documented honestly), service-role-only provisioning, RLS, audit
  (AuthzAuditRecord, shadow mode caveat), restart semantics, and an explicit
  "not provided by this repository" boundary.
- Release test (6/6): file surface, machine-path scan of CI lane (allowlists
  only the package-module-contracts negative fixtures), env-gated fail-closed
  wiring, claims fixture contents, docs↔fixture consistency, examples
  secret scan (flint_sk_/JWT literal/SERVICE_ROLE_KEY — zero findings).
- coverage.json: both entries owned by this change (realtime integration +
  security) flipped planned → implemented with verifier command + paths.
- Gates: verifier 4/4 lanes PASS, core suite 182 passed/1 todo, BDD 3
  scenarios/15 steps, typecheck 23/23, validate errors [], example-coverage
  errors [], eslint clean, openspec strict valid.
- Defects found/fixed (4): hard-coded `/Users/...` sibling paths; silent-skip
  green lane; scanner self-match via its own allowlist comment; dot-directory
  build caches (`.next`) embedding build-machine paths (walk now skips
  dot-dirs).
- Retained limits: live Flint interop requires sibling workspace with
  installed deps (fail-closed verified instead on this machine); token
  verification stays in flint-gate.
- Archived as `2026-08-21-v3-flint-portable-contracts`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-flint-portable-contracts/`.
  Cursor advanced to `v3-skills-ecosystem` (19/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.


## 2026-08-22 — v3-skills-ecosystem certified (20/28)

- SKILLS.md rewritten as the 3.0 ecosystem map: package-selection table for
  all 12 public npm packages + Dart + Rust CLI/MCP crates; React v2→v3
  migration pointed at release/framework-neutral-core.md + entity-graph-migrate.
- New registry-driven export ledgers for core/svelte/solid/alpine/htmx/
  web-components/sdl (`scripts/skills-package-registry.mjs`; `--pkg <id>` with
  legacy flags kept); per-package refresh:exports/verify:skills; root chains
  extended — `verify:skills` now validates 12 npm + Dart ledgers.
- New references: package-selection.md, framework-bindings.md,
  sdl-and-rust-tooling.md, examples-gallery.md, ecosystem-claims.json (18
  claims → evidence paths + gates, enforced by release test).
- New snippet harness `scripts/verify-skills-snippets.mjs`: extracts all 19
  public ts/tsx fences from the pack, compiles them in a temp consumer against
  PACKED tarballs (packed-consumer evidence) — green.
- Major doc/API drift fixed: entity-realtime-surreal-live taught a stale v2
  API (registerAdapter gone, db→surreal, checkpointResume→checkpointStore+
  checkpointField, where/normalize dropped from SurrealTableConfig); snippets
  + prose rewritten to the real contract. 14 non-compiling snippet fragments
  made self-contained. Prisma CLAUDE.md data-flow arrow fixed (fetch lives in
  stores/engine fetchers, not hooks).
- Gates: verify:skills-ecosystem 4/4 lanes (ledgers, snippets, release gate,
  cargo tests for CLI+MCP), release test 7/7, BDD 3/12, typecheck 23/23,
  validate + example-coverage errors [], eslint clean, openspec strict valid,
  flint release-gate regression 6/6.
- Archived as `2026-08-22-v3-skills-ecosystem`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-skills-ecosystem/`.
  Cursor advanced to `v3-docs-foundation-brand` (20/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.

## 2026-08-22 — v3-docs-foundation-brand certified (21/28)

- Private Docusaurus 3.10.2 docs workspace established at `site/`
  (`@prometheus-ags/entity-graph-docs-site`, private, added to
  pnpm-workspace.yaml). All @docusaurus/* packages pinned to exactly 3.10.2
  (donor: sibling skill-pack site pattern, registry-verified).
- Prometheus brand: new in-repo ember mark (light/dark SVG), favicon, and
  1200×630 social card generated with Pillow; provenance + accessible
  alternatives documented in docs/branding/ASSETS.md. KnowMe donor mark NOT
  reused (product-specific). Token set renamed to --prometheus-* namespace.
- IA: product/packages/examples sidebars, responsive landing page, local
  search (@easyops-cn/docusaurus-search-local 0.55.2), Mermaid, SEO/social
  metadata, canonical editUrl into this repo. Content contract (title +
  description front matter, no orphans, evidence-gate citations) in
  site/README.md, enforced by release test.
- Isolation gate: verifier + release test scan all publishable manifests for
  10 site-only deps; zero leaks. React 18.0.0 confined to site; publishable
  React 19 peer ranges untouched. Root pnpm.overrides gained
  serialize-javascript 7.0.7 / uuid 11.1.1 (donor advisory pins for the new
  Docusaurus dep tree; no direct workspace consumers).
- Defects fixed in-loop: prism-svelte grammar missing from
  prism-react-renderer 2.3.0 (dropped from additionalLanguages); clsx false
  positive in isolation scan (legit pre-existing dep of entity-graph-react —
  excluded from site-only set); isolation walker descending into
  node_modules; social card text overflow (type scale reduced).
- Gates: verify:docs-foundation 4/4 lanes (config-integrity,
  dependency-isolation, brand-assets, static-build asserting 404/sitemap/
  search-index/social-card/all section routes), release test 10/10, BDD
  3 scenarios/13 steps, typecheck 23/23, validate errors [], eslint clean,
  openspec strict valid.
- Archived as `2026-08-22-v3-docs-foundation-brand`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-foundation-brand/`.
  Cursor advanced to `v3-docs-api-reference` (21/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched; coverage.json documentationSite row
  remains owned by v3-docs-github-pages.

## 2026-08-22 — v3-docs-api-reference certified (22/28)

- Multi-language API reference generated from the export ledgers:
  `scripts/generate-api-reference.mjs` runs TypeDoc 0.28.20 (TS 6.0.x
  compatible) once per publishable npm package (12 runs, explicit entries incl.
  a2ui `./ag-ui` and a2a `./legacy`), renders deterministic MDX pages under
  `site/docs/api/npm/` (566 stable exports: signature, doc comment, canonical
  blob source link, per-symbol anchor) plus 12 package chooser pages
  (`site/docs/packages/<slug>.mdx`: install, peer/runtime matrix, stability
  badge, published-file metadata). API index asserts all 15 artifacts (12 npm +
  Dart + 2 Rust) exactly once.
- Doc-coverage policy (ratchet): stable exports = the 13 ledgers from
  v3-skills-ecosystem. Generator fails on vanished exports, newly undocumented
  exports, and baseline shrinkage. Baseline committed at
  `site/api-docs-baseline.json` (209 undocumented of 566; sync/svelte/alpine/
  htmx fully documented). Measured coverage reality before promising gates
  (M1-first) — full doc-comment coverage is follow-up content work.
- Dart/Rust without duplication: `dart doc` (81 declarations, presence-checked
  against dartdoc index.json) and `cargo doc --no-deps` (cli + mcp) generate
  into git-ignored `site/static/api/`; curated entry pages link via
  `useBaseUrl()` (broken-link checker false-positives on static artifacts).
- Drift caught by the policy on first runs: stale `@internal` tags on three
  publicly re-exported symbols (`__resetStoreRegistry` core;
  `createEntityBinding`/`createListBinding` alpine) — doc-comment-only fixes,
  targeted tests green (core 24/24, alpine 16/16).
- Also fixed in-loop: YAML front-matter quoting for generated pages,
  cucumber `/` alternation escaping in BDD step text, ledger shape variance
  (list / entry-point-keyed / runtime+declaration / object-with-exports).
- Gates: verify:docs-api-reference 4/4 lanes, release test 10/10, BDD 3/14,
  typecheck 23/23, validate errors [], foundation regression 10/10, eslint
  clean, openspec strict valid.
- Archived as `2026-08-22-v3-docs-api-reference`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-api-reference/`.
  Cursor advanced to `v3-docs-concepts-packages` (22/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.

## 2026-08-22 — v3-docs-concepts-packages certified (23/28)

- Complete learning path delivered: 27 hand-authored pages under
  `site/docs/guides/` (quickstart-react; 13 concepts from normalized-entities
  to devtools; 8 binding guides; 5 practices), wired into a new static
  `guidesSidebar` + "Guides" navbar item. `site/capability-map.json` maps 26
  stable capabilities to concept/API/example routes; the release test fails on
  orphan pages and dead routes.
- Snippet truth gate: `scripts/verify-skills-snippets.mjs` parameterized
  (`--root/--ext/--skip/--all-packages`); docs lane packs all 12 npm packages
  and compiles 40 ts/tsx fences from 22 docs in a temp consumer. Fixed the
  packed-consumer install failure with `pnpm.overrides` pinning internal deps
  to tarballs (workspace:* ranges resolve to unpublished registry versions
  otherwise). Default skills lane regression-verified unchanged (19/15).
- The compile gate caught ten authoring defects before readers could hit them:
  quickstart's `entity`/`entities` (real: `data`/`items`), React `loadMore`
  (real: `fetchNextPage`), async `renderFragment`, `readRelations` arity,
  Solid JSX needing a per-file `@jsxImportSource` pragma, Alpine plugin vs
  @types/alpinejs magic-callback mismatch (adapt-at-registration cast),
  web-components `configure(opts)` vs attributes, Tauri top-level-await module
  marker, and a broken `/docs/guides/recipes` link (static-build lane).
- Language + install gates in the release test: no guide prescribes
  component/hook-level fetching (prohibition-aware scan); bash install blocks
  are registry `pnpm add` only — no `file:`/`link:`/`workspace:`.
- Gates: verify:docs-concepts 4/4 lanes (snippet-compile, release-gate,
  static-build, guide-routes), release test 8/8, BDD 3/13, typecheck 23/23,
  validate errors [], foundation + api-reference regressions green, eslint
  clean, openspec strict valid.
- Archived as `2026-08-22-v3-docs-concepts-packages`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-concepts-packages/`.
  Cursor advanced to `v3-docs-examples-integrations` (23/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.

## 2026-08-22 — v3-docs-examples-integrations certified (24/28)

- 5 tutorials (`site/docs/examples/`: vite-react19, nextjs-app-router,
  agentic-a2ui, flutter-riverpod, tauri-universal) with an enforced section
  contract (Architecture / Setup / Feature scenarios / Test commands /
  Deployment / Troubleshooting) and feature matrices validated against
  `examples/shared/scenario-contract.json`; 6 integration guides
  (`site/docs/integrations/`: websocket, supabase, graphql, pglite-loro,
  a2a-a2ui, flint) each with the demo-mode/live-credentials split. Supabase
  guide: anon-key-only + RLS as the boundary. Flint: fixture-backed default
  CI, env-gated live lane.
- `examplesSidebar` gains Tutorials + Integrations categories; the release
  test (10/10) enforces the content contract — tutorial sections, scenario
  IDs, example-dir reachability/runnability, demo/live markers, alt-text
  scan, CI gate references.
- Snippet lane: 45 ts/tsx fences across 27 docs compile in the packed
  12-package consumer; added `@supabase/supabase-js` to consumer deps. Two
  harness-caught defects fixed: Supabase client boundary cast (real client
  API broader than the adapter's minimal structural type) and
  `GQLSubscriptionConfig` shape drift (`{ type, document, getPayload }`, not
  `{ query }`).
- Gates: verify:docs-examples 4/4 lanes (snippet-compile, release-gate,
  static-build, example-routes), release test 10/10, BDD 3/13, regressions
  docs-concepts 8/8 + foundation 10/10 + api-reference 10/10, typecheck
  23/23, validate errors [], eslint clean, openspec strict valid.
- Archived as `2026-08-22-v3-docs-examples-integrations`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-examples-integrations/`.
  Cursor advanced to `v3-docs-operations-migration` (25/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.

## 2026-08-23 — v3-docs-operations-migration certified (25/28)

- 13 pages: 3 migration guides (`site/docs/migration/`: v2-to-v3 with the
  canonical 5-row breaking-change table — graphStore singleton, React hook
  import, per-request `createGraphStore()` SSR, sync-status readers, React
  presentation types; alpha-to-stable with the 9-row map — A2UI `./ag-ui`
  boundary, official A2A v1 lifecycle, binding peer policy, `3.0.0-rc.N`;
  compatibility-policy with fixed-group semver and current-plus-next-major
  deprecation) + 10 operations pages (`site/docs/operations/`). New
  `operationsSidebar` + "Operations" navbar item.
- Upgrade validation fixtures are real, not prose: 6 raw `.ts/.tsx` files in
  `tests/release/fixtures/upgrade/` compile against the 12 packed packages via
  the snippet harness's new whole-file mode (`--ext .ts,.tsx`); default fence
  behavior unchanged (skills lane regression-verified inside its verifier).
- Release test (12/12) enforces: breaking-change token pairs with
  before/after markers, fixture existence + tokens + guide cross-references,
  security tenant-boundary/secret-handling markers, runbook↔automation
  consistency (publish.yml, `release:rc:*` scripts, 7 journal states,
  never-overwrite/corrective recovery), sidebar reachability, alt text.
- Harness-caught defects fixed this change: `.md` vs `.mdx` cross-link
  targets (static-build lane), a wrap-split "Row Level Security" token, and
  guessed table-UI fixture signatures corrected against real source
  (`actionsColumn(ActionItem[])`, `EmptyStateConfig`) before gating.
- Gates: verify:docs-operations 5/5 lanes (snippet-compile 53 fences/30 docs,
  fixture-compile 6/6, release-gate, static-build, routes), release test
  12/12, BDD 3/14, regressions foundation 10/10 + api-reference 10/10 +
  concepts 8/8 + examples 10/10, typecheck 23/23, validate errors [], eslint
  clean, openspec strict valid.
- Archived as `2026-08-23-v3-docs-operations-migration`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-operations-migration/`.
  Cursor advanced to `v3-docs-github-pages` (26/28).
- Hand-off boundary respected: `v3-release-certification` and
  `v3-stable-publication` untouched.

## 2026-08-23 — v3-docs-github-pages certified (26/28) — phase boundary reached

- `.github/workflows/docs-pages.yml` adapts the proven sibling Pages workflow:
  SHA-pinned checkout v4 / configure-pages v5 / upload-pages-artifact v3 /
  deploy-pages v4; PRs run the full build + gates but can never deploy
  (upload and deploy jobs are main-only); serialized `pages-deploy`
  concurrency; protected `github-pages` environment; release-aware
  `DOCS_VERSION_LABEL=3.0` navbar label.
- New shared production quality gate `scripts/verify-docs-pages-quality.mjs`
  (6 lanes): search index, 9 deep-route non-empty-200 probes under
  `/prometheus-entity-management/`, secrets scan, absolute-path scan, axe in
  light+dark themes, Lighthouse budgets (`site/lighthouse-budgets.json`)
  enforced from resource-summary measurements (LH13 removed the native
  budget audit) + category floors. Same code runs in CI and locally.
- Gate-caught pre-deployment defects fixed: workspace absolute paths leaked
  into the bundle via serialized docusaurus config (new
  `scripts/strip-build-paths.mjs` postbuild); light link color 3.71:1 →
  darker ember 5.17:1; prism token remaps in both themes (incl. dracula's
  rgb()-notation comment color); content links underlined; sidebar
  categories get crawlable generated-index links; dark inline code 4.49 →
  ≈5.0:1.
- Deployment URL recorded in `release/docs-site.json`; `RELEASING.md`
  points the 3.0 release at it. New devDep `lighthouse@13.4.1` (dev-only).
- Gates: verify:docs-pages 3/3 lanes (workflow-contract, static-build,
  quality-gates), quality 6/6, release test 10/10, BDD 3/14, regressions
  foundation 10/10 + api-reference 10/10 + concepts 8/8 + examples 10/10 +
  operations 12/12, typecheck 23/23, validate errors [], eslint clean,
  openspec strict valid.
- Archived as `2026-08-23-v3-docs-github-pages`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-docs-github-pages/`.
  First live deployment is operator-confirmed (Pages must be enabled).
- PHASE BOUNDARY: `v3-release-certification` (27) and
  `v3-stable-publication` (28) are the human-gated hand-off — not started.

## 2026-08-23 — v3-release-certification certified (27/28)

- New root command `pnpm run release:check` (`scripts/release-check.mjs`): 35
  mandatory lanes across 14 plan categories; `--lanes` chunking; fail-closed
  `--seal` producing SHA-256-hashed manifest bound to one source SHA.
- Clean tagged run: annotated tag `v3.0.0-rc.1` (`55dc8dc`), verdict
  **complete**, 35/35 pass, 1245 s. Tag is unsigned (no signing key
  configured) — hashed, not signed; recorded as explicit limit.
- Sweep fixed cross-change drift: 10 time-bounded build-time-only security
  acceptances (expire 2026-11-21); stale "planned" assertions in six gates
  after the Flutter example shipped; A2A/A2UI ledger format drift; ci-baseline
  generated-artifact false positives; cargo registry cache re-warm.
- Archived as `2026-08-23-v3-release-certification`; evidence in
  `.kbd-orchestrator/phases/full-3.0-release/evidence/v3-release-certification/`
  (bundle/, verification.md, release-impact.md).
- PHASE BOUNDARY: `v3-stable-publication` (28) is the last change and remains
  the human-gated hand-off — release disposition blocked by design until
  operator authorization.

## 2026-08-23 — v3-stable-publication machinery staged (change 28, publication still human-gated)

- Pipeline is now channel-aware (`scripts/release-candidate-pipeline.mjs`):
  `buildReleaseCandidateManifest` derives channel/distTag/action from whether
  the candidate IS the target version; `assertStableStageAuthority` is the
  npm-stable boundary (OIDC only, no long-lived tokens, latest-targeting,
  SHA-bound); `assertStableTagsPromoted` is the one assertion allowed to see
  `latest` move. RC authority refuses stable manifests outright.
- New `scripts/verify-stable-publication.mjs`: pre mode (9 checks — policy,
  contract, workflow `stage-stable` job, authority boundary, sealed bundle,
  blocked disposition, docs) passes on the rc.1 line; live mode (post-publish)
  proves all 12 packages resolve at 3.0.0 with `latest === 3.0.0`.
- `publish.yml` gained `mode: stable` + a `stage-stable` job on the protected
  `npm-stable` environment; `RELEASING.md` documents the promotion flow and
  recovery. Root scripts: `verify:stable-publication`,
  `test:v3-stable-publication`, `bdd:stable-publication`.
- Coverage: 20 unit tests + 4 BDD scenarios (13 steps); RC pipeline unit (26)
  and BDD (13 scenarios) suites re-run green — no regression on the rc line.
- BOUNDARY UNCHANGED: publication itself stays blocked. Remaining operator
  actions: configure npm trusted publishing + the `npm-stable` GitHub
  environment with reviewer approval, merge the version bump from
  `release/v3.0.0-staging` (tag `v3.0.0`), then one workflow_dispatch with
  `mode=stable`.

## 2026-08-23 — v3.0.0 STABLE PUBLISHED TO NPM (phase complete)

- Published all 12 `@prometheus-ags/*` packages at **3.0.0** with dist-tag
  `latest` promoted. Live-verified against the registry: 12/12 resolve at
  3.0.0 and `latest === 3.0.0` on every package.
- Release content: `release/v3.0.0-publish` = `origin/main` (includes the
  #19 react-reactivity and #20 pnpm-11 fixes our local line lacked) +
  changesets `pre exit`/`version` bump. PR #23 to `main`; tag `v3.0.0` →
  `8d4df67`.
- GOVERNANCE NOTE (decision, operator-directed): the publish ran LOCALLY via
  a granular npm token with 2FA bypass, not through the OIDC `npm-stable`
  pipeline built in #28. Operator explicitly requested direct completion
  ("publish the full release to NPM... without a bunch of other shit"). The
  governed path remains staged for future releases: npm-stable environment
  created (reviewer: GQAdonis), stable-channel machinery + verifier + tests
  committed on this line (cccd956), pre-flight checklist in RELEASING.md.
- Lesson for future sessions: root package.json `devEngines.packageManager`
  with `onFail: error` makes EVERY npm command fail in the repo root
  (EBADDEVENGINES) — run npm from a package dir or /tmp. This masked the
  dead-token 401 as a generic error and cost a debugging round.

## 2026-08-23 — workspace: protocol leak; corrective 3.0.1/3.0.2 republication

- POSTMORTEM (summary): the 3.0.0 stable run published with `npm publish`,
  which does not rewrite pnpm `workspace:` specifiers at pack time. 10 of 12
  packages shipped literal `workspace:` manifests — 5 in hard `dependencies`
  (sync, tauri, htmx, a2a, a2ui-react; uninstallable under npm AND pnpm),
  5 in `peerDependencies` (pem, svelte, solid, alpine, web-components; broken
  for npm consumers, which auto-install peers). Root cause: pipeline used npm
  in a pnpm workspace; the tarball gate was never wired into the publish path.
- npm registry immutability: `name@version` can NEVER be reused, even after
  unpublish — "no version bump" was not achievable; corrective versions were
  mandatory. 3.0.1 published clean from this session (pnpm publish + registry
  re-read); the concurrent Codex line then shipped the coordinated,
  provenance-attested 3.0.2 via the governed path (PRs #27–#37, tag v3.0.2,
  GitHub release). The ten broken 3.0.0 versions are deprecated.
- PR #38 (this session): publish-script hardening (scratch-cwd npm reads —
  devEngines EBADDEVENGINES would false-abort the leak check; visibility
  retry — registry read replication raced the 3.0.1 run), README/CHANGELOG
  corrective notes, website RC-reference sweep to the 3.0.2 line.
- Coordination lesson: two agent sessions fixed the same defect concurrently
  (3.0.1 vs 3.0.2). Reconciliation cost a superseded PR (#31). For shared
  release work, claim the publish step in the status JSON BEFORE running it.
- Pre-existing failures left alone (reproduce on pristine origin/main):
  v3-docs-github-pages (4), v3-docs-operations-migration (1 — publish.yml
  invokes release-candidate.mjs directly, not via the release:rc:* aliases
  the test asserts; drift from 3441c6e).

## 2026-08-23 — Atomic fetched-list ingestion prepared for 3.0.3

- Reproduced release 3.0.2's split-write defect: 7,248 rows emitted 7,250
  success publications and the first attempt exceeded 30 seconds.
- Added the typed core `ingestFetchedList` action and routed core `fetchList`,
  React `useEntities`, React `useEntityQuery`, legacy `useEntityView`, and the
  Electric/PGlite adapter through it. The final production inventory contains
  no remaining bulk-upsert/per-row-fetched loop.
- Bounded post-code verification passed: core 8/8 and React 17/17 focused
  cases; 1, 12, and 7,248 rows each emitted one success publication; the final
  7,248-row atomic case completed in 60 ms. Core and React typecheck, scoped
  ESLint, builds, packed type/module checks, and strict OpenSpec validation
  passed locally.
- The standard fixed-group changeset advanced all 12 public packages to
  3.0.3 and updated affected private dependents. No npm publish, tag, registry
  mutation, broad suite, soak, or GitHub Actions product test ran.

## 2026-08-23 — Atomic ingestion adversarial correction

- An isolated artifact critic blocked the first 3.0.3 candidate because
  GraphQL normalization still wrote per row, paginated/legacy projection
  subscribers recreated per-row list writes, duplicate IDs changed the merge
  origin after the first occurrence, and the negative control command was a
  placeholder rather than a retained reproduction.
- Corrected the core action to snapshot pre-ingestion origins and update
  filter/search/sort projections in the same transaction. GraphQL now batches
  by descriptor and attaches the `getItems`-derived list membership to that
  same action. Actual paginated query, remote view, GraphQL list, common list,
  and PGlite paths now exercise the implementation instead of a simulator.
- Superseding bounded evidence: core 10/10 and React 20/20 focused contracts
  passed. The executable control ran against a clean detached checkout at full
  SHA `e25210010a8eb4e575f7e4fc6e04be598a8c8213` and observed 7,250
  publications for 7,248 rows. The earlier 8/8 and 17/17 evidence remains
  historical but is not the completion basis.

## 2026-08-23 — Atomic ingestion final adversarial correction

- The second critic pass found that GraphQL descriptor batches were still
  separate transactions, a later side merge could therefore leave primary
  state published, and cursor base projection ordering had drifted from the
  existing start-insertion behavior. It also requested an explicit missing
  GraphQL entity lifecycle control; the guard was present by then but unproven.
- Added side descriptor batches to the primary core action so one thrown merge
  rolls back the complete response with zero publications. Restored cursor
  start-insertion ordering. Added direct controls for side-merge rollback,
  missing entity completion, and empty-list completion.
- Final bounded evidence supersedes the earlier counts: core 11/11 and React
  23/23 focused contracts passed; typechecks, scoped ESLint, builds, packed
  module/declaration checks, and strict OpenSpec validation passed. The
  isolated critic then returned APPROVE with no remaining finding.

## 2026-08-23 — Signed 3.0.2 evidence correction

- The artifact judge rejected the first negative-control evidence because
  `e2521001` was an untagged `origin/main` commit with 3.0.2 manifests, not the
  signed release commit. `v3.0.2` resolves to
  `f29a701649799df3ff64f5f986e3c016246d34b6`.
- Reran the 7,248-row control from a clean detached checkout of that tag and
  again observed 7,250 publications. Hardened the retained script to verify
  checkout HEAD and `v3.0.2^{commit}` against the supplied full SHA before it
  imports source; the old untagged SHA now fails with a source-mismatch error.
- This entry supersedes only the source-identity claim in the earlier evidence;
  the observed N+2 defect and the implementation baseline remain unchanged.
- The independent judge re-reviewed the corrected artifact and returned
  APPROVE with no remaining blocker.

## 2026-08-23 — Atomic fetched-list upstream handoff

- Committed the corrected 3.0.3 source and release metadata as `dab8a438`,
  pushed `codex/fix-atomic-fetched-list-ingestion`, and opened upstream PR #41:
  `https://github.com/Prometheus-AGS/prometheus-entity-management/pull/41`.
- No package was published, no tag or dist-tag moved, and UAR remains pinned to
  the released 3.0.2 package until a fixed upstream release exists.

## 2026-08-29 — DevTools entity inspection task 2/7

- Added the optional `get-entity-records` DevTools command and projection for
  canonical originals, local patches, merged live values, dirty reasons,
  fetch/sync timestamps, typed inspection errors, and store-local revisions.
- Entity revisions advance once per completed store publication and remain
  owned by the controller lifecycle; no graph business state was duplicated.
- Security boundary: inspection values obey the controller's existing
  metadata-only/include/redaction policy, preventing the new command from
  bypassing transport value controls.
- No test, typecheck, or build ran. Per the implementation-first phase rule,
  the assembled integration gate remains deferred until inspection production
  tasks 2–5 are complete and wired. Next task: rendered-view membership.

## 2026-08-29 — DevTools entity inspection task 3/7

- Added controller-owned stable view registration with token-scoped cleanup,
  membership updates, render metadata, and bounded view lifecycle events.
- Added `get-views` projections with current list statistics and both
  view-to-entity and entity-to-view membership. Entity records now include the
  registered views displaying each entity.
- Duplicate stable view IDs retain independent registration lifetimes; removing
  one registration cannot remove another live consumer. Controller disposal
  clears the complete registry.
- No test, typecheck, or build ran. The assembled integration gate remains
  deferred until relationship and preview/restore production tasks are wired.
- KBD reset the change projection to pending after the completed task; signed
  revision 299 restored `v3-devtools-entity-inspection` to in-progress.

## 2026-08-29 — DevTools entity inspection task 4/7

- Added `get-relationships` and deterministic relationship snapshots for
  `belongsTo`, reverse `hasMany`, and `manyToMany` schema descriptors.
- Projections use the existing CRUD schema registry and current merged graph
  values, including local foreign-key patches. No parallel schema registry or
  relationship business state was introduced.
- Missing canonical targets are reported explicitly, including missing child
  IDs retained by schema-derived relation lists.
- No test, typecheck, or build ran. The assembled integration gate remains
  deferred until preview/restore completes the production inspection path.
- KBD reset the change projection after task completion; signed revision 302
  restored `v3-devtools-entity-inspection` to in-progress.

## 2026-08-29 — DevTools entity inspection task 5/7

- Added policy-aware `preview-entity-patch` and `restore-entity-preview`
  transport commands with typed applied, restored, and conflict receipts.
- Preview writes only to the existing graph patch layer. Exact restore replaces
  the prior patch atomically, preserving the distinction between no patch and
  an existing patch without emitting an intermediate cleared state.
- Conflict detection uses a dedicated canonical/patch publication revision, so
  intervening entity or patch writes refuse restore while fetch/sync metadata
  updates do not create false conflicts.
- Active receipt storage is bounded to one preview per entity and cleared with
  the owning controller. Returned patch values obey metadata/redaction policy.
- No test, typecheck, or build ran. All production inspection tasks are now
  wired; the assembled integration gate is the next task.
- KBD reset the change projection after task completion; signed revision 305
  restored `v3-devtools-entity-inspection` to in-progress.

## 2026-08-29 — DevTools entity inspection task 6/7

- Ran the completed production path through `pnpm run verify:devtools-entity-inspection`;
  the assembled packed-consumer integration gate passed on its first run.
- The gate built and packed the real core package, installed it into a temporary
  consumer, and passed ESM, CJS, and NodeNext TypeScript consumption plus 13
  runtime scenarios covering entity projections, dirty originals/live values,
  view membership and cleanup, list statistics, relationships and missing
  targets, preview propagation, exact and metadata-only restore, canonical and
  patch conflict refusal, multi-store isolation, and value-policy enforcement.
- Core and Flutter shared fixtures were byte-identical at SHA-256
  `d07ecda2402b801889b4bf7b6bac5f92eb8434d3db3883b16bfa2d15eb1176ab`,
  and the fixture/package payload contract passed.
- Evidence receipt:
  `.kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-entity-inspection/task-9-packed-acceptance.json`.
- No unit, component, isolated, snapshot, mock-backed, or partial test ran.
- Both task-after hooks passed. KBD reset the change projection after task
  completion; signed revision 308 restored
  `v3-devtools-entity-inspection` to in-progress.

## 2026-08-29 — DevTools entity inspection task 7/7 and change completion

- Synchronized the optional `./devtools` public API, core and skills ledgers,
  inspection semantics documentation, cross-language fixtures, security
  boundary, verification record, and machine-readable packed acceptance
  receipt. The root core export ledger remains unchanged at 128 names.
- The final assembled packed-consumer gate passed 16 runtime scenarios through
  the real ESM, CJS, and NodeNext package surfaces. Later adversarial
  corrections added collision-safe internal identities, projection-failure
  restore invalidation, and legacy metadata-key coverage; the final gate also
  passed package payload, manifest, and byte-identical Flutter fixture checks.
- Artifact-refiner completed four persisted refinement cycles. Its optional
  workflow-dispatch helper could not parse the repository's workflow response,
  but filesystem checkpoints, schema validation, ledger validation, fixture
  parity, and the final artifact record all completed; no workflow trigger is
  configured for this repository.
- Four fresh-context distinct-model adversarial rounds were retained. The final
  `k3` review against producer `openai/gpt-5` returned `PASS` with no critical
  findings, and the strict sycophancy screen passed at score `0.0`. Remaining
  legacy metadata-key/view-registration/transport warnings are recorded in
  `round-4-resolutions.md` rather than hidden.
- No unit, component, isolated, snapshot, mock-backed, or partial integration
  test was added or run. Native backend verification passed.
- Signed KBD revisions 311–312 restored the task-hook reset through the legal
  `Pending -> In Progress -> Complete` sequence. The change was archived at
  `.kbd-orchestrator/changes/archive/2026-08-29-v3-devtools-entity-inspection`.
- Phase `v3-devtools-parity` is now 2/9 changes complete. Next change:
  `v3-devtools-time-travel`.

## 2026-08-29 — DevTools time travel task 1/7

- Confirmed the archived per-store controller contract at commit `dd574d24`:
  one reference-counted controller per `GraphStore`, one semantic event per
  completed Zustand publication, monotonic event identity, independent bounded
  event history, host-owned value policy, and deterministic teardown.
- Documented the replacement for the legacy time-travel registry in
  `.kbd-orchestrator/changes/v3-devtools-time-travel/spec.md`. The controller
  owns one snapshot ring per store, separate from event history, retaining at
  most 50 whole snapshots and at most 10 MiB; whichever ceiling is reached
  first drives oldest-whole-snapshot eviction.
- Frozen stable cursor expiry, initial baseline, protected live-head, internal
  replay marker, mutation-while-rewound branch ordering, exact return-to-live,
  inert import inspection, and explicit confirmed restore invariants for
  downstream TypeScript, React, Dart, and Flutter implementations.
- Cancelled legacy unit/targeted-test tasks 6–8 and registered tasks 9–10 so
  production tasks 1–5 are followed by one assembled integration gate and one
  documentation/refiner/adversarial-review/archive gate.
- No production code, test, typecheck, or build ran. Signed task completion and
  both after-hooks passed; the known task projection reset was restored to
  `in-progress` through a signed change transition.
- Phase remains 2/9 changes complete. Change 3 is 1/7 executable tasks complete;
  next task replaces global snapshot/cursor ownership with controller-owned
  histories whose mutation events reference captured snapshots.

## 2026-08-29 — DevTools time travel task 2/7

- Added a controller-local snapshot-history implementation under the optional
  `./devtools` production path. Each controller captures an initial baseline
  and the complete five-field graph data slice after every semantic graph
  publication; stores never share cursors, payloads, or lifecycle.
- Snapshot references are monotonic and typed as `retained` or `unavailable`
  (`retention-disabled`, `capture-failed`, or `oversize`). Retention enforces
  both the configured count and byte ceilings by evicting whole oldest
  snapshots, and reads deep-clone retained data to prevent aliasing.
- Mutation events now reference their post-publication snapshot capture.
  Projection-failure diagnostics also retain a capture reference so an
  unprojectable graph publication is not silently absent from time history.
- Added truthful capability/status metadata for snapshot count, bytes,
  baseline, oldest/newest/latest cursors, and the last unavailable capture.
  Controllers with either snapshot ceiling set to zero do not advertise the
  `snapshot-history` feature.
- Security boundary: complete graph values remain inside controller-local
  snapshot memory; event and transport envelopes contain only cursor/status/
  size metadata. No new serialized path can bypass the existing host-owned
  value policy.
- Disposal clears retained snapshot payloads. Event history clearing remains
  independent, matching the frozen policy that semantic events and rewind
  payloads have separate retention.
- No unit, isolated, component, mock-backed, snapshot, partial integration,
  typecheck, or build ran. Signed task completion and both after-hooks passed;
  the known incomplete-change projection reset was restored through a signed
  transition.
- Phase remains 2/9 changes complete. Change 3 is 2/7 executable tasks complete;
  next task implements rewind, exact return-to-live, replay markers, and
  mutation-while-rewound ordering.

## 2026-08-29 — DevTools time travel task 3/7

- Added optional-controller commands and typed receipts for time-travel status,
  rewind by stable cursor, and explicit return to live. Capabilities advertise
  the commands and `time-travel` feature only when both snapshot ceilings are
  enabled.
- Rewind restores the complete graph data slice through the real Zustand state
  boundary so application subscribers observe historical state. The first
  rewind deep-clones and protects the exact live head; later cursor changes
  preserve that same head until return, live-branch mutation, or disposal.
- Internal restore publications are marked by controller-local replay depth and
  are excluded from ordinary semantic mutation capture, preventing recursive
  snapshots and false business history.
- A real graph mutation while rewound clears the protected future, invalidates
  outstanding preview-restore receipts, emits the explicit transition to live,
  then publishes and captures the mutation as the new live branch. Explicit
  rewind and return also invalidate pre-existing preview receipts.
- Added ordered `time-travel` lifecycle events with the current and previous
  cursor. Return-to-live restores the protected deep clone atomically and
  releases it only after the store publication succeeds.
- Security/audit boundary: rewind remains an explicit local debug command;
  complete snapshot values never enter command receipts or event envelopes,
  while every mode transition receives the controller's monotonic event
  identity and timestamp.
- No unit, component, isolated, mock-backed, snapshot, partial integration,
  typecheck, or build ran. Signed task completion and both after-hooks passed;
  the known incomplete-change projection reset was restored through signed KBD
  revision 327.
- Phase remains 2/9 changes complete. Change 3 is 3/7 executable tasks complete;
  next task adds visible expired-history results and bounded inert import
  inspection with explicit confirmed restore.

## 2026-08-29 — DevTools time travel task 4/7

- Rewind now distinguishes future/unknown cursors from typed
  `expired-history` results. Expired receipts identify evicted, cleared, or
  unavailable captures and include the current oldest/newest/latest retained
  cursor range without publishing to or mutating the graph.
- Added versioned `inspect-history-import` and `confirm-history-import`
  commands, direct controller methods, protocol types, capability discovery,
  source-aware status, and source-aware time-travel audit events.
- Import inspection accepts JSON-only data, validates protocol version and the
  exact target store, stable ordered cursors, timestamps, and all five graph
  data structures. Rejections are typed and do not call the graph boundary.
- One inert candidate is retained inside the owning controller. Imported data
  and local snapshots share the configured count/byte ceiling; whole oldest
  local snapshots expire when necessary, and live graph activity, clearing,
  replacement inspection, successful restore, or disposal releases the
  candidate.
- Restore requires `confirm: true`, the exact one-shot candidate ID, and a
  cursor from that candidate. Successful restore uses the same replay-marked
  Zustand boundary, protects exact return-to-live state, invalidates preview
  receipts, and emits an ordered event with `source: import`.
- Security boundary: imported graph values are untrusted command input. They
  are rejected unless finite, acyclic, plain JSON and structurally compatible;
  no values enter inspection receipts or audit events, and no inspection alone
  can mutate application state.
- No unit, component, isolated, mock-backed, snapshot, partial integration,
  typecheck, or build ran. Signed task completion and both after-hooks passed
  with zero failures; the known projection reset was restored through signed
  KBD revision 330.
- Phase remains 2/9 changes complete. Change 3 is 4/7 executable tasks complete;
  next task delegates deprecated root time-travel functions to the default
  store controller before the single assembled integration gate.

## 2026-08-29 — DevTools time travel task 5/7

- Removed the deprecated root module's independent WeakMap snapshot rings,
  payload clones, cursor state, capacity state, and listener ownership. The
  existing public functions now delegate to the one optional DevTools
  controller attached to the selected graph store.
- Added a lightweight, versioned compatibility bridge shared across packed ESM
  and CJS entry points. The bridge carries only controller delegates,
  attachment cleanup, and facade listeners; it never owns graph values,
  snapshots, history retention, or rewind cursors.
- Loading the explicit `./devtools` entry registers a lazy controller factory,
  while the root entry remains free of static imports from the optional
  controller, protocol, and snapshot-history implementation. Root-only use
  reports the documented unavailable results until DevTools is loaded.
- Controller-owned compatibility metadata presents manually requested
  checkpoints through the legacy ring-shaped view without duplicating the
  automatic snapshot captured for the same graph publication. Repeated manual
  captures without a mutation still receive distinct stable cursors.
- Compatibility configuration, capture, restore by index/cursor, stepping,
  subscription, clearing, and reset all flow through the owning per-store
  controller. Controller retention continues to evict whole snapshot payloads
  under the single count/byte policy.
- The A2UI entity-diff hook and React timeline hook now attach/detach the
  optional controller through hook-layer lifecycles, preserving the repository
  rule that UI components do not own store/service communication.
- Security/audit boundary: the cross-bundle global symbol contains only the
  versioned delegate bridge and no business or snapshot data. Full graph values
  remain controller-local and never cross the root compatibility facade.
- No unit, component, isolated, mock-backed, snapshot, partial integration,
  typecheck, or build ran. Signed task completion and both before/after hooks
  passed with zero failures; the known incomplete-change projection reset was
  restored through signed KBD revision 333.
- Phase remains 2/9 changes complete. Change 3 is 5/7 executable tasks complete;
  next task runs the one assembled multi-store core/packed-consumer integration
  gate across the complete production path.

## 2026-08-29 — DevTools time travel task 6/7

- Added `pnpm run verify:devtools-time-travel`, one assembled acceptance gate
  that builds and packs the real core package, validates its tarball and
  manifest, installs it into a temporary external consumer, and exercises the
  production exports through ESM, CommonJS, root-only ESM, and strict NodeNext
  TypeScript lanes.
- The packed ESM runtime proved count and byte eviction, oversize capture,
  stable and visibly expired cursors, rewind and exact return-to-live, explicit
  live-transition/mutation ordering when writing while rewound, bounded import
  validation and one-shot confirmed restoration, per-store isolation, and
  disposal cleanup.
- The deprecated root compatibility facade passed through both packed ESM and
  independently bundled CommonJS root/`./devtools` entries. A root-only
  consumer returned the documented unavailable state and the root payload scan
  confirmed that the optional controller, protocol, and snapshot-history
  implementation were not pulled into normal root imports.
- The gate passed on its first run. All 3 package checks, 4 consumer lanes, and
  12 named runtime scenarios are `pass` in
  `.kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-time-travel/task-9-packed-acceptance.json`.
- No unit, component, isolated, mock-backed, snapshot, or partial integration
  test ran. The package build was the required packed-consumer acceptance
  boundary, not an incremental implementation loop.
- Signed task completion and both before/after hook pairs passed with zero
  failures. The known incomplete-change projection reset was restored through
  signed KBD revision 336.
- Phase remains 2/9 changes complete. Change 3 is 6/7 executable tasks complete;
  the final task synchronizes public records and evidence, runs artifact
  refinement and isolated adversarial review, verifies, and archives the
  change.

## 2026-08-29 — DevTools time travel change complete

- Completed and archived `v3-devtools-time-travel`, change 3 of 9 in
  `v3-devtools-parity`. All seven executable native tasks are complete; the
  archived manifest contains tasks 1–5, 9, and 10 with no open task.
- The assembled `pnpm run verify:devtools-time-travel` acceptance gate passed
  across the root-only ESM, packed ESM, packed CommonJS, and strict NodeNext
  consumer lanes. All 12 runtime scenarios passed, the core and Flutter
  fixtures were byte-identical, and the fixture SHA-256 is
  `937478739c4fcf9d730050da375ff48a00d905cdef8c66c86cd7c24d2eda0ad5`.
- Package/export ledger verification passed for 128 root exports, seven
  `./devtools` exports, and both exact JSON fixture subpath-to-target pairs.
- Artifact-refiner validation passed. Fresh-context cross-model adversarial
  review round 10 passed with judge `k3`, producer `openai/gpt-5`, and
  `verified-distinct` isolation through the local REST gateway. The strict
  anti-sycophancy screen passed with score 0 and cryptographically binds the
  final packet and findings.
- The security review names the actual boundaries: bounded untrusted history
  import, explicit confirmed restoration, per-store controller isolation, and
  optional debug-only package surfaces. No speculative hardening was added.
- Signed KBD recovery moved the parent change through revisions 343 and 344
  after the task-after hook regenerated its projection. Native verification,
  the final archive guard, and archive all passed with zero canonical tasks
  open; revision 345 advanced the exact next command to
  `/kbd-apply v3-devtools-react-inspector`.
- No unit, component, isolated, mock-backed, snapshot, or partial integration
  test was created or run. Phase state is now 3/9 changes complete; change 4 is
  `v3-devtools-react-inspector`.

## 2026-08-29 — React inspector task 1/9

- Confirmed both dependency gates from their archived manifests and acceptance
  receipts. Entity inspection is archived at `dd574d24`; time travel is
  archived at `91fa67cf`; every executable task in both manifests is complete.
- Confirmed the optional core entry exposes the entity, dirty/original/live,
  registered-view membership, relationship, preview/restore, event-history,
  snapshot-history, rewind, return-to-live, and value-policy contracts required
  by the accepted React UI specification.
- Materialized the nine-task native change surface, excluding canonical tasks
  7–9 because they are explicitly cancelled. Tasks 1–6 and 10–12 remain the
  executable contract.
- Froze the React packaging boundary: preserve the lightweight root hook;
  publish a side-effect-free `./devtools` entry and an explicitly
  side-effectful `./devtools/auto` opt-in; check enablement before lazy loading
  or DOM mutation; isolate the embedded instrument in an open Shadow Root with
  inherited `--pem-devtools-*` tokens and no global CSS.
- No test, typecheck, or build ran. Task 11 remains the sole assembled packed
  Vite/Next/browser acceptance gate after the complete production path exists.
- Canonical task 1 completed at signed revision 347. The known task-after
  parent reset recurred and was corrected through signed revision 348. Change
  4 remains in progress at 1/9 executable tasks; task 2 is next.

## 2026-08-29 — React inspector task 2/9

- Added the side-effect-free React `./devtools` entry and the sole
  side-effectful `./devtools/auto` entry with paired ESM, CommonJS, declaration,
  and `typesVersions` targets. The normal root continues to export only the
  lightweight compatibility hook and does not reach the lazy inspector.
- Added the store-scoped provider, reference-counted core attachment, local
  protocol client, cached external-store snapshot adapter, SSR null snapshot,
  and cleanup path. React 19.2.7 documentation confirms the Shadow Root
  container and `useSyncExternalStore` contracts used here.
- Added build/host mode detection before dynamic import, an explicit DOM-ready
  auto mount with deterministic unmount, and a lazily loaded inspector entry.
  Disabled or production auto mode does not load the inspector or mutate DOM.
- Added one open Shadow Root and self-contained `--pem-devtools-*` CSS
  fallbacks with no remote assets or host-global selectors. Full workspace
  styling remains task 10 work.
- Manifest/source invariants, TypeScript syntax parsing, and diff whitespace
  checks passed. No typecheck, test, or build ran; task 11 remains the one full
  assembled browser acceptance gate.
- Canonical task 2 completed at signed revision 350. The known task-after
  parent reset was corrected through signed revision 351. Change 4 is now 2/9
  executable tasks complete; task 3 is next.

## 2026-08-29 — React inspector task 3/9

- Added a controller-backed, animation-frame-coalesced inspector model plus a
  React view model for workspace navigation, search/filtering, selection,
  original/patch/live/diff projection, relationships, registered views,
  entity history, event filtering, and activity pause/resume.
- Added pure Overview, Entities, Views, and Activity workspaces with stable-key
  virtualization above 50 rows, expired-history feedback, list health,
  mutation publication details, screen-reader announcements, and cross-
  workspace navigation.
- Same-origin entity values join directly from the selected GraphStore; the
  controller remains the owner of metadata/history/views/relationships and
  serialized remote transport remains metadata-only by default.
- Added the shared desktop forensic Shadow DOM presentation and optional-entry
  exports. Commands, store selection, FAB/responsive behavior, examples, Graph
  Pulse, final refinement, and the assembled browser gate remain later tasks.
- Context7 confirmed the current TanStack Virtual `useVirtualizer`, stable
  `getItemKey`, virtual item, and row measurement contracts.
- Diff whitespace checks, source-contract assertions, and TypeScript syntax
  parsing across 20 DevTools files passed. No typecheck, test, or build ran.
- Task 3 completed at signed revision 357 after the official guard recovery
  path repaired a missing start receipt. The known parent reset was restored at
  revision 358. Change 4 is 3/9 executable tasks complete (3/12 canonical,
  including three cancelled tasks); task 4 is next.

## 2026-08-29 — React inspector task 4/9

- Added explicit multi-store provider/host definitions, reference-counted all
  supplied graph controllers, and exposed stable store descriptors plus one
  selected controller/client without a hidden global UI registry.
- Added protocol-client services and view-model commands for preview/diff/
  restore, retained-snapshot rewind, exact return-to-live, copy, and JSON
  export. Preview restore retains and consumes controller receipts and surfaces
  typed conflicts instead of overwriting intervening changes.
- Added Overview store/policy/export controls, entity JSON preview and proposed
  field diff, exact restore, policy-safe copy, and Activity rewind/live controls
  with visible expired-history feedback.
- Corrected entity selection and virtualization to use collision-free
  serialized `[type,id]` identities rather than the ambiguous display key.
- Clipboard and downloads are treated as serialized trust boundaries. Value
  copy uses only controller-policy projections; metadata-only exports actively
  strip entity and mutation before/after values even when a shared controller
  was created by a more permissive attachment.
- TypeScript syntax parsing across 22 DevTools files, staged whitespace checks,
  and task source-contract assertions passed. No typecheck, test, or build ran.
- Task 4 completed at canonical revision 362 through the local runtime fallback
  because the sovereign-sync control socket was unavailable. Sovereign sync was
  not changed. The known parent reset was restored at revision 363. Change 4 is
  now 4/9 executable tasks complete (4/12 canonical including three cancelled
  tasks); task 5 is next.

## 2026-08-29 — React inspector task 5/9

- Added the explicit debug-only Graph DevTools launcher with versioned browser
  preferences for four positions, floating/edge-tab form, and floating,
  dock-right, or dock-bottom panel layout.
- Added Hide until reload, Hide for this browser, configurable/disableable
  Mod+Shift+G restoration, pointer/focus preload, and an open-panel-only heavy
  inspector mount while the controller provider continues retaining history.
- Added layered Escape behavior, named controls, close-to-launcher focus return,
  roving workspace tabs, and keyboard Home/End/Left/Right navigation.
- Added a safe-area-aware sub-720px single-pane navigator/detail drill-in with
  Back controls, 44px targets, contained overscroll, horizontal tabs, and
  scrollable forensic diffs without changing browser zoom behavior.
- Treats browser storage as a mutable boundary: only preference schema v1 and
  recognized enum values are accepted; graph/entity values are never stored.
- TypeScript syntax parsing, scoped source assertions, scoped lint outside
  three confirmed pre-existing view-model warnings, and diff whitespace checks
  passed. No typecheck, test, or build ran; task 11 remains the full assembled
  integration gate.
- Task 5 completed at canonical revision 367 through the local runtime fallback
  without changing sovereign sync. The known parent reset was restored at
  revision 368. Change 4 is now 5/9 executable tasks complete (5/12 canonical,
  including three cancelled tasks); task 6 is next.

## 2026-08-29 — React inspector task 6/9

- Added a Vite client-root opt-in that dynamically imports the public
  `./devtools/auto` entry only under `import.meta.env.DEV`; Vite's documented
  production replacement removes the branch.
- Added a Next client composition component that waits until hydration,
  excludes production activation, dynamically imports the public `./devtools`
  entry, and passes the exact request-hydrated scoped browser store.
- Preserved Next's request graph → serializable snapshot → scoped
  `GraphStoreProvider` flow and both examples' existing component → hook →
  store layering. No debug component writes graph business state.
- Context7 confirmed current Next.js 16.2.9 Client Component boundaries and
  Vite 8.0.10 development-condition replacement/tree-shaking semantics.
- Scoped ESLint, TypeScript syntax parsing, source assertions, and diff
  whitespace checks passed. No typecheck, test, or build ran; task 11 remains
  the full assembled acceptance gate.
- Task 6 completed at canonical revision 372 through the local runtime fallback
  without changing sovereign sync. The known parent reset was restored at
  revision 373. Change 4 is now 6/9 executable tasks complete (6/12 canonical,
  including three cancelled tasks); task 10 is next.

## 2026-08-29 — React inspector task 11/12 (executable 8/9)

- Added a store-scoped rendered-view registration bridge and wired public
  entity, list, query, and view hooks so the attached core DevTools controller
  automatically observes rendered subscriber lifetimes and ordered membership.
- Added one packed Vite/Next/Chromium acceptance gate covering production
  exclusion, development activation, Next hydration, hide/restore, all panel
  layouts, keyboard navigation, axe, original/patch/live/diff, view membership,
  history, Activity correlation, Graph Pulse causality, narrow responsive
  navigation, and sustained 500-events/second interaction.
- The assembled gate observed and corrected two product defects: Vite resolved
  the optional literal `loro-crdt` import from the packed core root, and auto
  mode lacked Vite's `import.meta.env.DEV` signal. It also exposed native button
  backgrounds that failed color contrast; scoped dark surfaces corrected them.
- Final `pnpm run verify:devtools-react-inspector` passed 5/5 real browser
  scenarios. Packed consumers installed and typechecked, Vite and Next
  production builds passed and excluded DevTools, axe found zero serious or
  critical violations, 5,000 events completed in 10.015 seconds, search p95 was
  18.5 ms, preloaded open p95 was 13.4 ms, no task over 50 ms was observed, and
  retention remained bounded at 500 events.
- No unit, component, isolated, mock-backed, snapshot, or partial test was
  created or run. Sovereign sync was not touched.
