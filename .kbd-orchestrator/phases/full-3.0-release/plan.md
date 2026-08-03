# PLAN: full-3.0-release

**Project:** prometheus-entity-management 3.0 ecosystem  
**Date:** 2026-08-01  
**OpenSpec available:** YES  
**Changes to implement:** 28  
**Planning model class:** frontier (project model policy is absent, so KBD defaults this phase to frontier)  
**Source evidence:** `assessment.md`, `analysis.md`, `library-candidates.json`, repository constraints, sibling Prometheus documentation implementations, and current official Docusaurus/GitHub Pages/TypeDoc documentation

## Outcome and release boundary

This is not a version-bump plan. The assessed alpha has three critical distribution blockers, incomplete cross-runtime evidence, stale skills/specs, and no complete documentation product. The phase succeeds only when the declared stable artifacts, five release-certifying examples, consolidated Flutter packages, skills, Prometheus-branded Docusaurus site, and publication pipeline pass one reproducible release gate from a clean checkout.

Stable publication is deliberately the final, manual-authority change. A release candidate may be created earlier, but `npm latest` must not move while any mandatory package, example, documentation, license, security, or provenance gate is unresolved.

### Explicit trade-offs and scope cuts

- Import reusable Flutter libraries with preserved provenance only after an explicit redistribution/license decision. Do not copy KnowMe product applications, product state, or Rust-runtime ownership into this monorepo.
- Treat `hybrid-mobile-architecture-src` as design/template reference because it contains no reusable runtime library to move. Do not import the `gen_ui_flutter` placeholder as a package.
- Keep Forge provisioning as documented integration guidance for 3.0; a new first-class Forge adapter is deferred unless an existing stable claim requires it.
- Keep assistant-ui optional. The official A2UI web packages own protocol rendering; add assistant-ui only if an evidenced UX requirement remains after the protocol example works.
- Maintain one current 3.x documentation line plus a focused 2.x/alpha migration area. Do not snapshot docs for every patch release.
- Other framework bindings receive packed consumer fixtures and complete reference documentation, but the five requested applications are the release showcase portfolio.

## CHANGE LIST (ordered)

### 1. `v3-release-contract`: Establish the authoritative 3.0 artifact and compatibility contract

- **Scope:** spec | release governance | workspace state
- **Depends on:** NONE
- **Recommended agent:** Roo Code (Architect mode)
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Details:** Replace the obsolete v1-only specification with a v3 contract enumerating the twelve npm packages, Dart package(s), Rust CLI/MCP deliverables, stable-versus-experimental status, fixed/linked version policy, supported runtimes/frameworks, module/type contracts, graph singleton rules, security boundaries, and rollback/deprecation policy. Reconcile the stale KBD waypoint/project aliases because release automation currently sees conflicting active phases, then record the exact registry scope for the stable release.
- **Acceptance:** OpenSpec validates; every versioned artifact has an owner, registry decision, support matrix, and release criterion; no document claims fourteen npm packages; the stable/experimental designation is machine-readable.

### 2. `v3-main-ci-baseline`: Restore a clean, current-main installation and CI baseline

- **Scope:** workspace | lockfile | CI | dependency hygiene
- **Depends on:** NONE
- **Recommended agent:** Codex
- **Est. complexity:** M
- **Complexity score:** Medium
- **Model class:** medium
- **Customer value:** HIGH
- **Details:** Reconcile the local checkout with the latest intended `main` changes without discarding user work, repair the root pnpm lockfile, pin the correct Next/Turbopack workspace root, and make clean frozen install/typecheck/test/build commands deterministic. Update direct dependencies to compatible current versions and disposition every critical/high production-path advisory instead of using an unqualified zero-advisory promise.
- **Acceptance:** A clean checkout passes `pnpm install --frozen-lockfile`; current-main CI is green; build timeouts identify the responsible task; dependency and advisory decisions are recorded.

### 3. `v3-package-module-contracts`: Repair all npm package formats, types, and tarball metadata

- **Scope:** all npm packages | build | types | packaging
- **Depends on:** `v3-release-contract`, `v3-main-ci-baseline`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-018`
- **Details:** Fix the shared build so ESM, CommonJS, and conditional declarations use Node-valid `.js`/`.cjs` and `.d.ts`/`.d.cts` targets across all twelve packages. Normalize repository/engine/README/changelog/files metadata, make tarball boundaries intentional, and add packed-consumer fixtures for Node ESM/CJS and representative TypeScript module-resolution modes.
- **Acceptance:** Every packed tarball passes import, require, Publint, and Are The Types Wrong checks; core/SDL include user-facing README content; no package publishes unintended source trees or absolute local paths.

### 4. `v3-framework-neutral-core`: Make the core package genuinely framework-neutral

- **Scope:** core | public API | tests | migration
- **Depends on:** `v3-release-contract`, `v3-package-module-contracts`
- **Recommended agent:** Roo Code (Code mode)
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Details:** Move the core store to `zustand/vanilla`, relocate React-only table/view types into the React package, and preserve compatible framework-neutral selectors and mutation APIs. Add runtime dependency guards and migration aliases only where the release contract explicitly permits them.
- **Acceptance:** The packed core dependency graph and declarations contain no React runtime/types; non-React consumer fixtures can create and share one graph; React compatibility tests remain green.

### 5. `v3-binding-singleton-contract`: Enforce one graph singleton across every framework binding

- **Scope:** package manifests | bindings | consumer fixtures
- **Depends on:** `v3-framework-neutral-core`, `v3-package-module-contracts`
- **Recommended agent:** Codex
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Details:** Convert binding relationships to compatible peer plus development dependencies, encode fixed/linked package policy, and build isolated consumers for React, Svelte, Solid, Web Components, Alpine, and HTMX. Each fixture must prove that writes through the binding are visible through the same core instance.
- **Acceptance:** Package-manager resolution installs one compatible core; singleton identity and cross-view reactivity tests pass in every supported binding fixture; peer-range failures are actionable.

### 6. `v3-release-pipeline-rc`: Implement coordinated release-candidate and recovery automation

- **Scope:** Changesets | GitHub Actions | provenance | registry dry run
- **Depends on:** `v3-package-module-contracts`, `v3-binding-singleton-contract`, `v3-main-ci-baseline`, `v3-dart-graph-riverpod`, `v3-tauri-mobile-plugin`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-017`, `cand-018`
- **Details:** Replace the private-root publish workflow with Changesets-driven package versioning and ordered publication, trusted publishing/provenance where supported, RC and `latest` tag policy, Rust/Dart inclusion or explicit exclusion, and partial-publish recovery. Add a disposable-tag or registry-dry-run exercise that proves the workflow without mutating `latest`.
- **Acceptance:** The workflow selects only declared artifacts in dependency order, produces attestations and release notes, prevents a private-root publish, supports safe retry after partial failure, and completes an RC rehearsal.

### 7. `v3-example-coverage-contract`: Define one complete, machine-verifiable example scenario

- **Scope:** examples | fixtures | coverage tooling
- **Depends on:** `v3-release-contract`
- **Recommended agent:** Roo Code (Architect mode)
- **Est. complexity:** M
- **Complexity score:** Medium
- **Model class:** medium
- **Customer value:** HIGH
- **Capability gap:** `build-example-coverage-contract`
- **Details:** Define the shared Project/User/Task/Comment/Activity domain, deterministic transports, scenario IDs, security assumptions, and `examples/coverage.json` mapping every stable feature to one or more executable examples. Include normalized IDs, CRUD/optimistic flows, relationships/invalidation, local/remote/hybrid views, realtime, offline persistence/sync, A2A/A2UI, SSR, and platform boundaries.
- **Acceptance:** A validator rejects missing/stale scenario mappings; every stable public feature has runnable evidence; examples may vary presentation but share semantic fixtures and expected outcomes.

### 8. `v3-sync-persistence-path`: Certify PGlite persistence and Loro convergence as the mandatory local-first path

- **Scope:** core adapters | sync package | integration tests
- **Depends on:** `v3-package-module-contracts`, `v3-example-coverage-contract`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-020`
- **Details:** Adapt the existing PGlite and Loro implementations into one deterministic release path with two-client convergence, offline writes, reconnect, conflict behavior, persistence reload, and mandatory dependency installation. Keep sibling `prometheus-entity-sync` integration as an explicit opt-in job rather than a silently skipped stable gate.
- **Acceptance:** No mandatory sync test skips; clean-room tests prove persistence and deterministic convergence; WebSocket/reconnect integration is separately labeled and enforced when enabled.

### 9. `v3-a2ui-protocol-bridge`: Separate AG-UI transport from official A2UI rendering and graph projection

- **Scope:** package boundaries | A2UI | AG-UI | graph adapters
- **Depends on:** `v3-release-contract`, `v3-package-module-contracts`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-003`, `cand-004`
- **Capability gap:** `build-a2ui-graph-bridge`
- **Details:** Correct the current `a2ui-react` naming/contract mismatch, preserve AG-UI event transport under an honest surface, and add a thin official A2UI surface/action-to-entity bridge without reimplementing protocol parsing. Define allowlisted catalogs, validation, approvals, and component-to-hook-to-store layering.
- **Acceptance:** Official A2UI messages render through the official engine; graph actions cross an explicit policy boundary; AG-UI consumers have a migration path; packages pass packed-consumer tests.

### 10. `v3-a2a-conformance-agent`: Conform the A2A package and ship a deterministic reference agent

- **Scope:** A2A server | auth | tasks | streaming | test agent
- **Depends on:** `v3-a2ui-protocol-bridge`, `v3-package-module-contracts`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-019`
- **Capability gap:** `build-a2a-conformance`, `build-reference-agent`
- **Details:** Compare the existing A2A types and endpoints with the pinned upstream protocol, implement the selected conformance/version matrix, authenticated policy boundary, streaming task scenario, and A2UI artifact metadata adapter. Keep an in-process deterministic agent requiring no API key, with an optional external endpoint seam.
- **Acceptance:** Conformance fixtures cover AgentCard discovery and task send/get/cancel/stream; auth failures cannot mutate the graph; deterministic CI produces the expected A2UI artifacts.

### 11. `v3-flutter-source-provenance`: Resolve ownership and import reusable Flutter source history

- **Scope:** repository history | licensing | Dart package boundaries
- **Depends on:** `v3-release-contract`
- **Recommended agent:** Manual
- **Est. complexity:** M
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** MEDIUM
- **Library:** `cand-007`, `cand-009`, `cand-013`, `cand-014`
- **Capability gap:** `build-flutter-source-migration`
- **Details:** Inventory reusable source and commit history from KnowMe, obtain an explicit license/relicensing decision, document attribution, then use a history-preserving filtered import for approved generic code. Record `hybrid-mobile-architecture-src` as reference-only and exclude product-specific apps, product models, secrets, generated build output, and the rejected placeholder package.
- **Acceptance:** License authority is recorded before copying; imported commits retain provenance; a manifest maps source paths to destination/decision; duplicate canonical implementations are removed or deprecated intentionally.

### 12. `v3-dart-graph-riverpod`: Consolidate the Dart graph and Riverpod 3 package family

- **Scope:** Dart core | Flutter adapter | Riverpod | Melos | tests
- **Depends on:** `v3-flutter-source-provenance`, `v3-package-module-contracts`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-006`, `cand-007`, `cand-008`, `cand-015`
- **Capability gap:** `build-flutter-consolidation`
- **Details:** Preserve the tested Dart-native graph as canonical, layer Riverpod 3 provider families/controllers above it, and place Rust/FFI behind an optional transport adapter. Establish one coherent Flutter/Dart/codegen/analyzer matrix and Melos commands for analyze, test, format, package validation, and example orchestration.
- **Acceptance:** Cross-view normalized behavior, optimistic CRUD, views, change invalidation, and pluggable transport tests pass; Riverpod terminal failures do not retry indefinitely; no public core package requires KnowMe FFI.

### 13. `v3-tauri-mobile-plugin`: Complete the Tauri desktop/mobile plugin contract

- **Scope:** Rust plugin | generated bindings | capabilities | Android/iOS
- **Depends on:** `v3-release-contract`, `v3-package-module-contracts`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-012`
- **Capability gap:** `build-tauri-mobile-contract`
- **Details:** Replace checked-in stubs with reproducible generated bindings, minimize the npm/Rust package boundary, declare capabilities/permissions, and implement required desktop, Android, and iOS initialization and command smoke fixtures. Separate host-plugin correctness from any remote sync server availability.
- **Acceptance:** Cargo checks/tests and JS binding tests pass; capability denial is tested; one desktop and one Android/iOS CI or documented device lane invokes real plugin commands.

### 14. `v3-vite-react19-example`: Turn the Vite app into the complete browser feature showcase

- **Scope:** React 19 | Vite 8 | example UI | E2E
- **Depends on:** `v3-framework-neutral-core`, `v3-binding-singleton-contract`, `v3-example-coverage-contract`, `v3-sync-persistence-path`
- **Recommended agent:** Antigravity
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-001`
- **Details:** Upgrade/harden the current Vite app and implement the shared domain across CRUD, normalized cross-view updates, local patches, relationships/cascade invalidation, local/remote/hybrid filtering, realtime batching, GraphQL/REST seams, Suspense/error handling, DevTools, PGlite persistence, and Loro offline convergence. Keep external services optional behind explicit integration modes.
- **Acceptance:** Production build, typecheck, unit tests, and browser E2E pass from a clean checkout; its coverage scenarios all execute; no source-path alias is counted as packed-package evidence.

### 15. `v3-nextjs-app-router-example`: Certify Next.js server/client and hydration behavior

- **Scope:** Next.js | React 19 | SSR/RSC | example UI | E2E
- **Depends on:** `v3-framework-neutral-core`, `v3-binding-singleton-contract`, `v3-example-coverage-contract`, `v3-sync-persistence-path`
- **Recommended agent:** Antigravity
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-002`
- **Details:** Upgrade/harden the App Router example with per-request graph creation, server prefetch/dehydrate/client hydration, route transitions, Suspense/error boundaries, mutations, realtime client takeover, and protection against cross-request entity leakage. Resolve workspace-root and audit issues using the release dependency matrix.
- **Acceptance:** Concurrent SSR tests prove request isolation; hydration produces no mismatch or duplicate fetch; clean production build and browser E2E pass using packed packages.

### 16. `v3-agentic-a2ui-example`: Ship a safe end-to-end agentic A2UI application

- **Scope:** React/Vite | A2UI | A2A | reference agent | approvals
- **Depends on:** `v3-example-coverage-contract`, `v3-a2ui-protocol-bridge`, `v3-a2a-conformance-agent`
- **Recommended agent:** Antigravity
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-003`, `cand-019`
- **Details:** Build a dedicated example where the deterministic A2A agent emits official A2UI surfaces for the shared domain, approved actions call hooks/stores, and resulting mutations update all normalized views. Demonstrate streaming task state, artifact rendering, validation failures, authorization denial, human approval, cancellation, and optional external-agent configuration.
- **Acceptance:** CI needs no model API key; golden protocol fixtures and browser E2E cover happy/denied/malformed/cancelled flows; agent-generated UI cannot bypass the action catalog.

### 17. `v3-flutter-riverpod-a2ui-example`: Ship the complete Flutter/Riverpod mobile example

- **Scope:** Flutter | Riverpod 3 | A2UI/genui | mobile tests
- **Depends on:** `v3-dart-graph-riverpod`, `v3-a2ui-protocol-bridge`, `v3-example-coverage-contract`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-005`, `cand-009`, `cand-013`
- **Details:** Build one branded Flutter example using generated Riverpod providers, the consolidated graph, official `genui` protocol handling, a safe widget/action catalog, optimistic/offline CRUD, relationships, realtime/change invalidation, and the shared deterministic fixtures. Include accessibility, loading/error/empty states, and an optional Rust transport adapter demonstration that does not own the core graph.
- **Acceptance:** `dart analyze`, Flutter tests, golden/widget tests, and Android/iOS smoke lanes pass; malformed or unapproved A2UI actions fail closed; the example satisfies its coverage manifest entries.

### 18. `v3-tauri-universal-example`: Ship one Tauri application for desktop and mobile

- **Scope:** Tauri | React 19/Vite 8 | desktop | Android/iOS | E2E
- **Depends on:** `v3-tauri-mobile-plugin`, `v3-example-coverage-contract`, `v3-sync-persistence-path`
- **Recommended agent:** Antigravity
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-011`, `cand-012`
- **Details:** Create one shared React/Vite frontend and Tauri configuration targeting macOS/Windows/Linux plus Android/iOS, demonstrating the shared domain, native persistence/plugin commands, offline/reconnect behavior, capabilities, deep links/lifecycle, and responsive mobile/desktop layouts. Keep platform conditionals at the adapter boundary rather than forking application logic.
- **Acceptance:** Desktop build and command E2E pass; Android and iOS build/smoke evidence is recorded on supported runners/devices; denied permissions and offline restart paths are tested.

### 19. `v3-flint-portable-contracts`: Replace local-path skips with portable Flint security and data contracts

- **Scope:** Flint adapter | auth | realtime | provisioning docs/tests
- **Depends on:** `v3-framework-neutral-core`, `v3-example-coverage-contract`
- **Recommended agent:** Roo Code (Code mode)
- **Est. complexity:** M
- **Complexity score:** Medium
- **Model class:** medium
- **Customer value:** HIGH
- **Details:** Replace absolute sibling imports with checked fixtures or an explicit opt-in integration job, verify the current watch/mutate contract, and add issuer/tenant/`kid`/JWKS/role/key-separation tests. Document Forge plan/apply, service-role-only provisioning, RLS, audit, restart semantics, and the strict-JWK compatibility caveat without claiming an unbuilt adapter.
- **Acceptance:** Default CI contains no machine-specific paths or silent Flint success; enabled live integration fails if unavailable; client examples never expose service-role credentials.

### 20. `v3-skills-ecosystem`: Update skills to the complete 3.0 package and framework surface

- **Scope:** AgentSkills | export ledgers | snippet tests | Flint guidance
- **Depends on:** `v3-sync-persistence-path`, `v3-a2ui-protocol-bridge`, `v3-a2a-conformance-agent`, `v3-dart-graph-riverpod`, `v3-tauri-mobile-plugin`, `v3-flint-portable-contracts`, `v3-vite-react19-example`, `v3-nextjs-app-router-example`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Details:** Replace the React-v2-centric skill map with package selection, core, React migration, Svelte/Solid/Alpine/Web Components/HTMX, sync, SDL, A2A, A2UI, Tauri, Flutter, Rust CLI/MCP, Flint security/realtime/provisioning, and example guidance. Correct data-flow language so hooks orchestrate store methods while stores/adapters own I/O.
- **Acceptance:** Package-specific export/type/signature ledgers validate; every public snippet compiles against packed packages; referenced paths exist; at least one consumer fixture or requested example backs each supported binding/integration claim.

### 21. `v3-docs-foundation-brand`: Establish the Prometheus-branded Docusaurus information architecture

- **Scope:** private docs workspace | design system | navigation | content contract
- **Depends on:** `v3-release-contract`, `v3-example-coverage-contract`
- **Recommended agent:** Antigravity
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-021`
- **Capability gap:** `build-docs-product`
- **Details:** Create a private pnpm workspace for Docusaurus 3.10.2 with all Docusaurus packages pinned to one version, Prometheus logo/brand tokens, accessible light/dark themes, responsive landing page, product/package/example navigation, local search, Mermaid, code tabs, SEO/social metadata, and canonical edit links. Adapt the sibling Prometheus skill-pack site and Flint Gate patterns, but retain this repository's pnpm-only rule and isolate site React dependencies from library runtime packages.
- **Acceptance:** Brand assets have documented provenance and accessible alternatives; mobile/desktop nav, dark mode, 404, search, sitemap, and social card routes build; broken links/anchors fail CI; Docusaurus dependencies cannot leak into publishable packages.

### 22. `v3-docs-api-reference`: Generate complete multi-language API and package reference

- **Scope:** Docusaurus | TypeDoc | Dartdoc | Rustdoc | package metadata
- **Depends on:** `v3-package-module-contracts`, `v3-dart-graph-riverpod`, `v3-tauri-mobile-plugin`, `v3-docs-foundation-brand`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Library:** `cand-022`
- **Details:** Generate stable TypeScript API routes from the twelve package exports with TypeDoc packages mode and source links; integrate curated Dart and Rust package/API entry pages and generated artifacts without duplicating canonical source docs. Add package chooser pages with install commands, peer/runtime matrices, stability badges, bundle/tarball information, and cross-links from symbols to conceptual guides.
- **Acceptance:** The API generator fails on undocumented or vanished stable exports according to policy; routes are deterministic under the GitHub Pages base path; all declared npm/Dart/Rust artifacts appear exactly once in the package index.

### 23. `v3-docs-concepts-packages`: Write the complete conceptual and framework guide set

- **Scope:** Docusaurus content | architecture | package guides | recipes
- **Depends on:** `v3-framework-neutral-core`, `v3-binding-singleton-contract`, `v3-sync-persistence-path`, `v3-docs-foundation-brand`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Capability gap:** `build-docs-product`
- **Details:** Write tested guides for normalized entities, ID-only lists, queries-as-instructions, layers, graph/patch/list behavior, engine/SWR/GC/Suspense, views, CRUD/relations, realtime batching, GraphQL/REST, sync, SDL, DevTools, and each supported UI binding. Provide progressive quickstarts, package-selection decisions, copyable recipes, architecture diagrams, failure modes, and performance/security guidance.
- **Acceptance:** Every stable public capability maps to a concept/guide/API/example link; snippets compile in docs CI; architectural rules match `AGENTS.md` and skills; no guide relies on local source aliases for installation instructions.

### 24. `v3-docs-examples-integrations`: Document and embed all five release examples and integration tracks

- **Scope:** Docusaurus content | examples | interactive media | integration guides
- **Depends on:** `v3-vite-react19-example`, `v3-nextjs-app-router-example`, `v3-agentic-a2ui-example`, `v3-flutter-riverpod-a2ui-example`, `v3-tauri-universal-example`, `v3-flint-portable-contracts`, `v3-docs-foundation-brand`
- **Recommended agent:** Antigravity
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Capability gap:** `build-docs-product`
- **Details:** Give React 19/Vite 8, Next.js, agentic A2UI, Flutter/Riverpod, and universal Tauri dedicated tutorials with architecture, setup, annotated feature scenarios, test commands, deployment/platform notes, and troubleshooting. Add integration guides for Flint, Supabase, WebSocket, GraphQL, PGlite/Loro, A2A/A2UI, plus verified links to runnable source and coverage scenario IDs.
- **Acceptance:** Each requested example has a start-to-finish path and full feature matrix; commands are exercised in CI; screenshots/diagrams have alt text; external-service sections clearly separate deterministic demo mode from live credentials.

### 25. `v3-docs-operations-migration`: Complete migration, security, troubleshooting, skills, and release documentation

- **Scope:** Docusaurus content | migration | operations | governance
- **Depends on:** `v3-release-pipeline-rc`, `v3-skills-ecosystem`, `v3-docs-foundation-brand`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Capability gap:** `build-docs-product`
- **Details:** Publish 2.x-to-3.0 and alpha-to-stable migrations, renamed/moved API tables, codemod/manual recipes, compatibility policy, release notes/changelog, security model, auth/key handling, performance tuning, testing, deployment, troubleshooting, FAQ, contributing, release/operator runbook, and complete skills usage. Add upgrade validation fixtures so migration snippets are not prose-only promises.
- **Acceptance:** Migration fixtures compile and test; every breaking change has before/after guidance; release/rollback/partial-publish procedures match automation; security pages explicitly cover tenant boundaries and secret handling.

### 26. `v3-docs-github-pages`: Deploy a release-aware, quality-gated GitHub Pages site

- **Scope:** GitHub Actions | Pages | Docusaurus quality | accessibility
- **Depends on:** `v3-docs-api-reference`, `v3-docs-concepts-packages`, `v3-docs-examples-integrations`, `v3-docs-operations-migration`
- **Recommended agent:** Codex
- **Est. complexity:** M
- **Complexity score:** Medium
- **Model class:** medium
- **Customer value:** HIGH
- **Library:** `cand-021`
- **Details:** Adapt the proven sibling Pages workflow using SHA-pinned checkout/configure/upload/deploy actions, PR build-only validation, serialized main deployment, environment protection, repository base URL, artifact smoke tests, and release-aware 3.x docs labeling. Gate production on build, links, snippets, search index, route probes, accessibility, Lighthouse budgets, and absence of secrets/internal absolute paths.
- **Acceptance:** PRs cannot deploy; only protected `main` publishes to `github-pages`; representative deep routes return non-empty 200 responses under `/prometheus-entity-management/`; the deployment URL is recorded and the 3.0 release points to it.

### 27. `v3-release-certification`: Prove the entire 3.0 ecosystem from packed artifacts

- **Scope:** pnpm/Turbo | Dart/Melos | Cargo | examples | docs | skills | security
- **Depends on:** `v3-release-pipeline-rc`, `v3-sync-persistence-path`, `v3-a2a-conformance-agent`, `v3-dart-graph-riverpod`, `v3-tauri-mobile-plugin`, `v3-vite-react19-example`, `v3-nextjs-app-router-example`, `v3-agentic-a2ui-example`, `v3-flutter-riverpod-a2ui-example`, `v3-tauri-universal-example`, `v3-skills-ecosystem`, `v3-docs-github-pages`
- **Recommended agent:** Claude Code
- **Est. complexity:** L
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Capability gap:** `build-release-certification`
- **Details:** Add one root release-check command and immutable evidence manifest spanning frozen install, formatting, typecheck, tests, builds, packed consumers, package lint/type checks, audits, skills/snippets, all five examples, Dart/Flutter, Cargo/Tauri, docs, provenance, and registry dry runs. Require non-skipping results for every mandatory lane and explicitly label platform/manual evidence.
- **Acceptance:** A clean tagged commit produces a complete signed/hashed evidence bundle; every coverage scenario and artifact criterion resolves to evidence; any missing mandatory lane blocks certification rather than reporting green.

### 28. `v3-stable-publication`: Publish 3.0.0 and promote verified artifacts to stable channels

- **Scope:** npm | optional pub.dev/crates.io per contract | GitHub release | docs
- **Depends on:** `v3-release-certification`
- **Recommended agent:** Manual
- **Est. complexity:** M
- **Complexity score:** High
- **Model class:** frontier
- **Customer value:** HIGH
- **Details:** Review the immutable certification bundle, verify registry identities/permissions and the exact version set, publish in dependency order, confirm provenance and consumer installation, create the signed GitHub release, deploy/freeze the 3.0 docs line, and only then move npm `latest`. Exercise the documented recovery path on any partial failure and never overwrite an immutable registry version.
- **Acceptance:** Every declared stable artifact resolves from its public registry at 3.0.0 and passes post-publish smoke tests; npm `latest` points to the verified release; release notes/docs/migration URLs are live; publication evidence and any excluded registries are recorded.

## EXECUTION ROUND ORDER

- **Round 1 (parallel):** `v3-release-contract`, `v3-main-ci-baseline`
- **Round 2 (parallel):** `v3-package-module-contracts`, `v3-example-coverage-contract`
- **Round 3 (parallel):** `v3-framework-neutral-core`, `v3-sync-persistence-path`, `v3-a2ui-protocol-bridge`, `v3-flutter-source-provenance` (manual gate), `v3-tauri-mobile-plugin`, `v3-docs-foundation-brand`
- **Round 4 (parallel):** `v3-binding-singleton-contract`, `v3-a2a-conformance-agent`, `v3-dart-graph-riverpod`, `v3-flint-portable-contracts`
- **Round 5 (parallel):** `v3-release-pipeline-rc`, `v3-vite-react19-example`, `v3-nextjs-app-router-example`, `v3-agentic-a2ui-example`, `v3-flutter-riverpod-a2ui-example`, `v3-tauri-universal-example`, `v3-docs-api-reference`, `v3-docs-concepts-packages`
- **Round 6 (parallel):** `v3-skills-ecosystem`, `v3-docs-examples-integrations`
- **Round 7:** `v3-docs-operations-migration`
- **Round 8:** `v3-docs-github-pages`
- **Round 9:** `v3-release-certification`
- **Round 10 (manual authority):** `v3-stable-publication`

Parallel labels indicate dependency-safe work, not permission to merge conflicting edits without coordination. Changes sharing package manifests, lockfiles, coverage manifests, or documentation navigation should use isolated worktrees and merge in the listed order.

## COMMANDS TO RUN

```text
/opsx:new v3-release-contract
/opsx:new v3-main-ci-baseline
/opsx:new v3-package-module-contracts
/opsx:new v3-framework-neutral-core
/opsx:new v3-binding-singleton-contract
/opsx:new v3-release-pipeline-rc
/opsx:new v3-example-coverage-contract
/opsx:new v3-sync-persistence-path
/opsx:new v3-a2ui-protocol-bridge
/opsx:new v3-a2a-conformance-agent
/opsx:new v3-flutter-source-provenance
/opsx:new v3-dart-graph-riverpod
/opsx:new v3-tauri-mobile-plugin
/opsx:new v3-vite-react19-example
/opsx:new v3-nextjs-app-router-example
/opsx:new v3-agentic-a2ui-example
/opsx:new v3-flutter-riverpod-a2ui-example
/opsx:new v3-tauri-universal-example
/opsx:new v3-flint-portable-contracts
/opsx:new v3-skills-ecosystem
/opsx:new v3-docs-foundation-brand
/opsx:new v3-docs-api-reference
/opsx:new v3-docs-concepts-packages
/opsx:new v3-docs-examples-integrations
/opsx:new v3-docs-operations-migration
/opsx:new v3-docs-github-pages
/opsx:new v3-release-certification
/opsx:new v3-stable-publication
```

## Sycophancy self-check

- **S-02:** The plan does not assume the requested stable release is presently feasible; it retains the assessed NO-GO and makes distribution, license, platform, security, and certification evidence prerequisites.
- **S-07:** Docusaurus and GitHub Pages are included because the user explicitly expanded the phase goal. Forge adapter development, product-app import, assistant-ui adoption, per-patch docs snapshots, and extra showcase applications are cut.
- **S-03:** The plan surfaces the Flutter license gate, mobile-runner evidence limits, maintenance cost of documentation versioning, and the irreversible nature of stable registry publication.

## Adversarial review disposition

The isolated review passed with zero critical findings, three warnings, and one suggestion. The plan now makes the RC pipeline depend on the Dart and Tauri artifact work, makes the Next realtime claim and sync documentation depend on the certified sync path, and explains why conflicting KBD phase aliases are a release-automation prerequisite. The original findings remain in `review/plan/findings.json` for auditability.

## PLAN COMPLETE
