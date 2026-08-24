# EXECUTION: full-3.0-release

**Project:** prometheus-entity-management 3.0 ecosystem  
**Date:** 2026-08-01  
**Selected backend:** openspec  
**Dispatched to:** SELF through `/kbd-apply`  
**Backend rationale:** All 28 dependency-ordered OpenSpec changes already exist and validate. The OpenSpec backend preserves the accepted specs while `/kbd-apply` supplies the KBD task hooks, progress projection, waypoint refresh, verification, and archive seam that bare `/opsx:apply` lacks.  
**Backend entrypoint:** `/kbd-apply <change-id>`  
**OpenSpec available:** YES  
**Source plan:** `.kbd-orchestrator/phases/full-3.0-release/plan.md`  
**Research gate:** `.research/full-3.0-release-execution-readiness/report.md`  
**BDD policy:** failing/undefined Gherkin first, then implementation, deterministic no-retry pass, with tagged Cucumber/Playwright evidence.  
**Model resolution:** Project `model_policy.registry` is absent, so KBD resolves every class to the active session frontier model. Medium-class items remain medium in the plan for future policy resolution, but execute locally on the session frontier model rather than inventing an unavailable concrete registry identifier.

## Execution scope and dispatch contracts

The progress projection is `.kbd-orchestrator/phases/full-3.0-release/progress.json`. Every self-executed change uses the common handoff protocol below.

### Common SELF/OpenSpec handoff protocol

1. Read `.kbd-orchestrator/current-waypoint.json` and the corresponding `openspec/changes/<change-id>/` artifacts.
2. Start with `/kbd-apply <change-id>`; never use bare `/opsx:apply`.
3. For each pending task, use the typed begin/end transition so KBD fires `task:before`/`task:after` and synchronizes task, change, waypoint, and implementation counters.
4. Add BDD or infrastructure-contract scenarios before implementation and retain the initial failing/undefined result.
5. On implementation completion, run proportional unit, integration, packaging, platform, documentation, accessibility, and visual proof gates.
6. Run artifact-refiner QA, then `kbd-apply verify` and `kbd-apply archive`.
7. A blocker is recorded in the canonical transition log and projected into `progress.json`; no mandatory skipped lane may be reported green.

### 1. `v3-release-contract` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-release-contract`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Cross-ecosystem release ownership, stability, compatibility, and rollback decisions require architectural synthesis.
- **Evidence:** OpenSpec validation, machine-readable artifact/support matrix, BDD contract validation, reconciled KBD state.

### 2. `v3-main-ci-baseline` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-main-ci-baseline`
- **Model class / concrete model:** medium / active session frontier fallback
- **Rationale:** Bounded dependency, lockfile, workspace, and CI remediation.
- **Evidence:** Frozen pnpm install and deterministic root CI commands.

### 3. `v3-package-module-contracts` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-package-module-contracts`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Dual-loader and declaration correctness across twelve packed packages is high-risk release engineering.
- **Evidence:** Isolated ESM/CJS/TypeScript tarball consumers, package lint/type checks.

### 4. `v3-framework-neutral-core` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-framework-neutral-core`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Public API refactor must preserve graph semantics while removing React ownership.
- **Evidence:** Runtime/declaration dependency guards and non-React plus React behavior suites.

### 5. `v3-binding-singleton-contract` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-binding-singleton-contract`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Cross-package peer resolution and singleton identity require packed consumers.
- **Evidence:** One compatible core instance and cross-view update proof for each stable binding.

### 6. `v3-release-pipeline-rc` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-release-pipeline-rc`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** OIDC provenance, coordinated versioning, RC tags, and partial-publish recovery are release-critical.
- **Evidence:** Non-`latest` rehearsal, attestations, recovery exercise, release notes.

### 7. `v3-example-coverage-contract` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-example-coverage-contract`
- **Model class / concrete model:** medium / active session frontier fallback
- **Rationale:** A bounded machine-readable mapping anchors all showcase and documentation evidence.
- **Evidence:** Validator rejects missing/stale public-feature mappings.

### 8. `v3-sync-persistence-path` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-sync-persistence-path`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Offline persistence and convergence cross storage, graph, and network boundaries.
- **Evidence:** Mandatory no-skip two-client convergence, reload, reconnect, and conflict suites.

### 9. `v3-a2ui-protocol-bridge` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-a2ui-protocol-bridge`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Current A2UI v0.9.1 rendering must be separated from AG-UI transport and policy enforcement.
- **Evidence:** Golden official protocol fixtures, packed consumers, denied/malformed action scenarios.

### 10. `v3-a2a-conformance-agent` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-a2a-conformance-agent`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Protocol conformance, streaming tasks, authentication, and deterministic agent output are security-sensitive.
- **Evidence:** AgentCard and send/get/cancel/stream conformance plus authorization denial.

### 11. `v3-flutter-source-provenance` → SELF/OpenSpec with authority gate

- **Entry:** `/kbd-apply v3-flutter-source-provenance`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** The technical inventory is autonomous; copying is conditional on discoverable compatible licensing or explicit redistribution authority.
- **Evidence:** Source/license/provenance manifest and history-preserving import for approved paths.

### 12. `v3-dart-graph-riverpod` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-dart-graph-riverpod`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Consolidation spans graph semantics, Riverpod 3 lifecycle, packaging, and optional FFI.
- **Evidence:** Melos analyze/test/format/package gates and normalized cross-view behavior.

### 13. `v3-tauri-mobile-plugin` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-tauri-mobile-plugin`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Rust/JS/mobile bindings and capabilities cross platform and security boundaries.
- **Evidence:** Cargo and JS tests, generated binding reproducibility, permission denial, platform smoke evidence.

### 14. `v3-vite-react19-example` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-vite-react19-example`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** This is the full browser showcase across graph, CRUD, realtime, sync, and diagnostics.
- **Evidence:** Clean build/type/unit plus tagged browser BDD, traces, screenshots, and video bundle.

### 15. `v3-nextjs-app-router-example` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-nextjs-app-router-example`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Per-request graph ownership, RSC serialization, hydration, and client takeover are concurrency-sensitive.
- **Evidence:** Concurrent request isolation, no hydration mismatch/duplicate fetch, packed-package E2E.

### 16. `v3-agentic-a2ui-example` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-agentic-a2ui-example`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** End-to-end agent UI must demonstrate protocol, policy, streaming, cancellation, and normalized mutations safely.
- **Evidence:** Keyless deterministic happy/denied/malformed/cancelled BDD and visual proof.

### 17. `v3-flutter-riverpod-a2ui-example` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-flutter-riverpod-a2ui-example`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Mobile graph, Riverpod, offline behavior, and experimental genui require explicit boundaries.
- **Evidence:** Analyze, widget/golden tests, Android/iOS smoke, action-catalog denial; genui labeled experimental.

### 18. `v3-tauri-universal-example` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-tauri-universal-example`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** One frontend must preserve behavior across desktop and mobile adapters without app-logic forks.
- **Evidence:** Desktop E2E/build, mobile build/smoke, permission and offline-restart scenarios.

### 19. `v3-flint-portable-contracts` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-flint-portable-contracts`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Latest Flint security/data contracts must become portable fixtures rather than local-path skips.
- **Evidence:** Vendored/generated contract provenance and clean-checkout conformance jobs.

### 20. `v3-skills-ecosystem` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-skills-ecosystem`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Public exports and architecture must remain synchronized with every installed skill surface.
- **Evidence:** `verify:skills`, skill validation, example/doc/package link integrity.

### 21. `v3-docs-foundation-brand` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-docs-foundation-brand`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** A complete Prometheus product needs information architecture, tokens, accessible responsive components, and version policy.
- **Evidence:** Docusaurus build, accessibility/keyboard checks, responsive light/dark visual baselines.

### 22. `v3-docs-api-reference` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-docs-api-reference`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Deterministic multi-package TypeScript/Dart/Rust reference generation must match the release inventory.
- **Evidence:** Generator drift checks, package index uniqueness, base-path route probes.

### 23. `v3-docs-concepts-packages` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-docs-concepts-packages`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Architecture and framework guidance must be complete, executable, and consistent with non-negotiable rules.
- **Evidence:** Compiled snippets and capability-to-concept/API/example coverage validation.

### 24. `v3-docs-examples-integrations` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-docs-examples-integrations`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Five full tutorials and integration tracks depend on completed executable examples.
- **Evidence:** CI-exercised commands, source/scenario links, accessible media, deterministic/live-mode separation.

### 25. `v3-docs-operations-migration` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-docs-operations-migration`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Stable adoption requires tested migration, security, troubleshooting, skills, rollback, and operator guidance.
- **Evidence:** Compiling before/after fixtures and runbook/automation consistency checks.

### 26. `v3-docs-github-pages` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-docs-github-pages`
- **Model class / concrete model:** medium / active session frontier fallback
- **Rationale:** A bounded least-privilege artifact deployment and site quality gate.
- **Evidence:** PR build-only behavior, deep-route probes, link/a11y/Lighthouse checks, protected Pages deployment.

### 27. `v3-release-certification` → SELF/OpenSpec

- **Entry:** `/kbd-apply v3-release-certification`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** One immutable SHA must join npm, web, Dart, Rust, mobile, docs, skills, security, and evidence lanes.
- **Evidence:** Signed/hashed no-skip evidence manifest and root release-check result.

### 28. `v3-stable-publication` → SELF/OpenSpec with external-authority gates

- **Entry:** `/kbd-apply v3-stable-publication`
- **Model class / concrete model:** frontier / active session frontier model
- **Rationale:** Publication is irreversible across registries and must consume the immutable certification bundle.
- **Evidence:** Registry 3.0.0 resolution, provenance, post-publish consumers, GitHub release, live docs, and final dist-tags.

## Approval gates

- Flutter/KnowMe source redistribution must be supported by compatible licenses already in the source repositories or explicit owner authority before copying.
- npm trusted-publisher configuration, protected GitHub Pages environment settings, registry credentials, signing identities, notarization, and app-store publication require the corresponding external account authority.
- `npm latest` moves only after the immutable 3.0.0 certification bundle passes and exact artifact versions are reviewed.

## Fallback conditions

- Remain on OpenSpec when a specialist backend is absent, cannot consume the repository, or would violate the phase contract.
- A stalled external research or automation worker is replaced with a recorded manual primary-source pipeline; never fabricate completion.
- Unsupported platform/signing lanes become explicit authority blockers, not skipped green checks.

## Verification requirements

- Root: frozen pnpm install, formatting/lint, typecheck, unit/integration/BDD, builds, audits, packed consumers, skills verification.
- Web/examples/docs: deterministic Cucumber + Playwright assertions, pinned screenshots, traces, video receipts, accessibility and route probes.
- Dart/Flutter: format, analyze, package and unit/widget/golden tests, plus supported mobile smoke lanes.
- Rust/Tauri: formatting, clippy/check/test, binding generation drift, capability denial, desktop/mobile build/smoke lanes.
- Release: RC install and provenance verification, recovery rehearsal, immutable evidence SHA/manifests, post-publish consumers.

## Progress ledger

- **COMPLETE:** `v3-release-contract` — verified, archived, and promoted
- **COMPLETE:** `v3-main-ci-baseline` — verified, archived, and promoted
- **COMPLETE:** `v3-package-module-contracts` — verified, archived, and promoted
- **COMPLETE:** `v3-framework-neutral-core` — verified, archived, and promoted
- **COMPLETE:** `v3-binding-singleton-contract` — verified, archived, and promoted
- **NEXT:** `v3-example-coverage-contract` — first dependency-ready pending SELF/OpenSpec change
- **PENDING:** remaining 22 changes; `v3-release-pipeline-rc` waits for its Dart/Riverpod and Tauri mobile prerequisites

## Outputs

- 28 verified/archived OpenSpec changes and synchronized KBD projections
- stable npm/Dart/Rust artifacts declared by the release contract
- five full executable examples
- consolidated licensed Flutter packages
- complete 3.0 skills ecosystem
- Prometheus-branded Docusaurus site and protected GitHub Pages deployment
- BDD, visual, security, package, provenance, and release-certification bundles
- stable public 3.0.0 publication after authority gates

## Blockers

- None at dispatch. Potential external-authority gates are scheduled at changes 11, 26, and 28 and do not block earlier autonomous work.

## Reflection handoff

`kbd-reflect` must consume the execution ledger, all OpenSpec verification/archive results, BDD/visual manifests, dependency/license/security dispositions, RC/provenance record, Pages deployment evidence, stable publication results, and deviations from the 28-change support contract.

## EXECUTION READY
