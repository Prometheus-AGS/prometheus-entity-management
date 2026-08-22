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
