---
type: research-report
title: "Prometheus Entity Management 3.0 execution-readiness research"
query: "Primary-source implementation blueprint for shipping and certifying the Prometheus entity-management 3.0 monorepo in 2026"
date: "2026-08-01"
confidence: 0.88
verification_status: verified
feynman_grade: 0.91
sources_count: 26
contradictions_resolved: 4
job_id: "full-3.0-release-execution-readiness"
tags: [deep-research, release-engineering, npm, a2ui, flutter, tauri, docusaurus, bdd]
links: []
---

# Executive conclusion

Prometheus Entity Management is not ready for a stable 3.0.0 merely because alpha APIs exist. Stable means that every declared artifact has one ownership and version rule, packed consumers can load it through its advertised module surfaces, examples exercise the same normalized graph semantics, experimental protocol integrations are labeled honestly, and the registry operation can be rehearsed and recovered without moving `latest` prematurely.

The existing 28-change KBD plan is directionally sound, but execution must incorporate four corrections from current primary sources:

1. Pin the official A2UI contract to v0.9.1. Treat v1 as a candidate, not the release baseline.
2. Mark Flutter `genui` integration experimental even when it successfully speaks A2UI v0.9; its upstream SDK explicitly describes itself as highly experimental.
3. Use npm trusted publishing only on a compatible GitHub-hosted runner with npm CLI at least 11.5.1 and Node at least 22.14, and verify provenance in the RC rehearsal.
4. Treat Tauri build evidence separately from store publication: the shared Tauri 2 codebase is certifiable locally/CI, while signing, notarization, and app-store credentials remain environment-authority gates.

# Release invariant

The release is a proof graph, not a checklist of screenshots. Each stable claim must trace through:

`spec requirement → Gherkin scenario → executable step → implementation → machine result → visual/packaging artifact → release gate`

No package, example, skill, or documentation page should claim stable support if that chain is broken.

# Findings and implementation decisions

## npm packages and registry

Node's conditional export rules require formats that match their loader: with `type: module`, ESM targets may use `.js`, while CommonJS targets must remain distinguishable, normally with `.cjs`. Type declarations must mirror those branches. A single source build is not evidence that both `import` and `require` consumers work; pack each package and install the tarball into isolated ESM, CJS, and TypeScript fixtures.

npm trusted publishing should replace long-lived registry tokens for the stable workflow. Current npm documentation requires a supported CI provider, a GitHub-hosted runner for GitHub Actions, `id-token: write`, npm CLI 11.5.1 or newer, and Node 22.14 or newer. Public packages published from public repositories receive provenance automatically through trusted publishing. The rehearsal must verify the attestation and `npm audit signatures`, but must publish only an RC or use a disposable registry/tag. Stable publication remains a separately approved action.

Changesets fits the monorepo because it records release intent and handles internal dependency bumps. The project must decide `fixed` versus `linked` deliberately: `fixed` republishes every member together at one bumped version, while `linked` aligns the next version chosen for packages that actually release. For a product marketed as one 3.0 ecosystem, a fixed group is simplest if all public packages truly share support and rollback. If packages have independent maturity, linked or independent versioning is more honest. The authoritative release contract must make this machine-readable before package manifests are changed.

## React 19, Vite 8, and Next.js

Vite 8 moved its toolchain to Rolldown/Oxc and deprecated or changed some esbuild-era configuration. The Vite example must therefore be upgraded by resolving current configuration warnings rather than blindly changing package numbers. React 19's improved hydration diagnostics do not relax the requirement for deterministic server/client input.

In the Next.js App Router, Server Components are the default. Client Components are required at stateful/browser boundaries, client props must be serializable, and context providers belong in client modules placed as deep as practical. Entity graph state must be constructed per request, dehydrated as serializable data, and hydrated into a client-owned graph. Concurrent SSR tests must prove no entity leakage across requests. Async Server Components should be certified with end-to-end tests where component-test tooling cannot model the boundary faithfully.

## A2UI, AG-UI, and A2A

The A2UI site currently identifies v0.9 as stable and v0.9.1 as the current release, with v1 still a candidate. Official React and Flutter renderers share the protocol model but do not remove the application's authorization responsibilities. The package currently named `a2ui-react` must not conflate AG-UI event transport with A2UI declarative surface rendering. Keep transport and rendering as separate packages or explicitly separate exports, and project approved entity actions through an allowlisted bridge.

The deterministic reference agent must not require an external model key. It should emit golden A2UI messages and A2A task transitions, including malformed, denied, cancelled, and streaming paths. A2A production traffic uses HTTPS; authentication belongs at the HTTP transport layer rather than inside task payloads. Agent output can propose a graph mutation, but only an application-owned catalog may authorize and execute it through hooks and stores.

## Flutter and Riverpod

The Dart-native normalized graph should remain canonical. Riverpod 3 belongs above it as provider/controller orchestration, not as an alternate owner of entity data. Riverpod 3 retries failed providers by default and can pause providers that are out of view, so terminal failures and background/realtime ownership require explicit policy and tests.

Upstream Flutter `genui` currently supports A2UI v0.9 but calls itself highly experimental and requires a modern Flutter SDK. It is suitable for a release example only behind an experimental label, a pinned compatibility matrix, golden protocol fixtures, and a safe widget/action catalog. It must not define whether the underlying Dart graph is stable.

Source may be imported from KnowMe only after license authority and provenance are recorded. The hybrid-mobile repository is reference-only unless a genuinely reusable, licensed runtime package is found. Product-specific state, generated output, secrets, and a placeholder `gen_ui_flutter` package are exclusions.

## Tauri 2

Tauri 2 supports one frontend and shared Rust entry point across desktop and mobile. Mobile-ready crates expose `staticlib`, `cdylib`, and `rlib`, and use the mobile entry-point attribute. Capabilities and permissions are part of the plugin contract and require denial tests, including event permissions.

The example can certify shared business logic, desktop builds, plugin commands, permission denial, Android/iOS project generation, and supported emulator/device smoke lanes. It cannot claim store readiness without signing identities: most targets require signing, and macOS distribution outside the App Store also requires notarization. Those are documented human/environment gates rather than skipped automated tests.

## Docusaurus and GitHub Pages

Use a dedicated workspace package for Docusaurus and keep all `@docusaurus/*` packages on the same version. The current official installation guide lists Docusaurus 3.10.2. The site should build as a static artifact with strict broken-link checking, generated TypeDoc API content, conceptual guides, complete examples, integration guides, migration/operations material, architecture decision context, and a visible stable-versus-experimental support matrix.

For the project repository, configure the canonical URL as `https://prometheus-ags.github.io/prometheus-entity-management/` unless a custom domain is explicitly provisioned. A custom GitHub Pages workflow should separate build and deploy, upload the static artifact, grant only `contents: read`, `pages: write`, and `id-token: write`, use the `github-pages` environment, and expose the deployment URL. Pull requests build and link-check the site but do not deploy it.

Prometheus branding must be implemented as design tokens and accessible components rather than as a logo pasted onto the default theme. Required visual states include narrow/mobile navigation, code blocks, search/no-search fallback, dark/light modes if both are advertised, focus/keyboard states, and error/404 pages.

## BDD and visual evidence

Feature files are the stable behavioral contract. Each change begins with a failing or undefined scenario, receives the minimum step definitions and implementation, and runs without retries until it is stable. Browser scenarios use role- or label-based locators and deterministic data.

Playwright screenshot comparisons must run in the same pinned browser/OS environment as their baselines because rendering varies by platform. Traces are the preferred diagnostic record for CI failures; review bundles additionally contain an MP4/video receipt, final screenshots, Cucumber JSON/messages, HTML report, console/network summaries, git SHA, and SHA-256 manifest. A visual artifact is supporting evidence, not a substitute for assertions.

# Security and release gates

Mandatory pre-RC gates:

- frozen pnpm install, lint/typecheck/unit/integration/BDD suites, and all declared builds;
- packed-tarball import/require/type validation for every npm package;
- dependency, secret, license, and production-path advisory disposition;
- A2UI/A2A schema validation, authorization denial, malformed input, and cancellation tests;
- Tauri capability denial and Flutter action-catalog denial tests;
- documentation build, link validation, accessibility checks, and example-to-doc link coverage;
- reproducible evidence manifests tied to the candidate git SHA.

Mandatory pre-`latest` gates:

- RC install from a clean external consumer and provenance verification;
- all stable artifacts use the versions and tags declared by the release contract;
- release notes, migration guide, support matrix, rollback procedure, and deprecation policy are complete;
- no unresolved critical/high release-path vulnerability or license ambiguity;
- explicit authority for npm `latest`, GitHub release, GitHub Pages production environment, and any app-store signing operation.

# Rejected shortcuts

- Do not publish the private monorepo root or publish source-path aliases as evidence.
- Do not call AG-UI transport an official A2UI renderer.
- Do not label experimental `genui` APIs stable because the surrounding Dart graph is stable.
- Do not copy KnowMe or hybrid-mobile source without a license/provenance decision.
- Do not disable hydration warnings or serialize one process-global graph across Next.js requests.
- Do not treat a successful Tauri desktop webview as mobile or store certification.
- Do not deploy docs from a mutable local `gh-pages` push when a reviewable Pages artifact workflow is available.
- Do not move `latest` as a test of whether the release workflow works.

# Execution order

Keep the KBD order, with three explicit gates:

1. Contract gate: release contract, clean CI, packaging, framework-neutral core, singleton behavior.
2. Capability gate: coverage manifest, persistence/sync, A2UI/A2A, Flutter/Riverpod, Tauri plugin, five examples.
3. Product gate: skills, full Docusaurus site, cross-platform evidence, RC, certification, then authorized stable publication.

Parallel implementation may occur only after shared contracts are merged; release evidence always runs against one immutable candidate SHA.

# Confidence and remaining uncertainty

Confidence is high for protocol, framework, packaging, documentation, and evidence constraints because they come from current primary sources. Remaining uncertainty is project-specific, not research-specific: the exact npm package inventory, package grouping policy, Flutter redistribution authority, registry settings, Pages environment settings, and signing credentials must be resolved by repository evidence or explicit owner authority during their scheduled changes.

# Source index

The complete source registry and claim mappings are in `sources/registry.json`, `graph.json`, and `citations.json`. No secondary source is used as the decisive authority for a compatibility or security claim.
