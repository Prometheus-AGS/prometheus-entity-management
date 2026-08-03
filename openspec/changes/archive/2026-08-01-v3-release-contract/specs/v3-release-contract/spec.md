# Authoritative 3.0 artifact and compatibility contract

## ADDED Requirements

### Requirement: Exact artifact and registry inventory

The 3.0 release SHALL use `release/v3-release-contract.json` as its machine-readable inventory. It SHALL declare exactly twelve npm packages, one Dart package, and three Rust crates. Every artifact SHALL have one owner, registry decision, version policy, stability status, and support role. npm packages SHALL use one fixed 3.x version group. npm, GitHub Releases, and GitHub Pages SHALL be required stable channels; native registries and application stores SHALL remain deferred until their ownership/signing gates pass.

#### Scenario: Inventory is complete

- **WHEN** the release contract is validated
- **THEN** every versioned workspace artifact appears exactly once
- **AND** the npm package count is twelve, never fourteen
- **AND** no deferred registry is described as publicly installable without post-publish evidence

### Requirement: Stability and protocol maturity are explicit

The contract SHALL distinguish stable, experimental, and internal surfaces. The official A2UI protocol baseline SHALL be v0.9.1. AG-UI event transport SHALL be distinct from official A2UI rendering and graph projection. Flutter `genui` SHALL remain experimental and SHALL NOT own the canonical Dart graph.

#### Scenario: Experimental integration cannot inherit stable status

- **WHEN** a stable package exposes an experimental integration
- **THEN** documentation, generated ledgers, and examples display the integration's experimental status
- **AND** its failure cannot corrupt or replace the stable normalized graph

### Requirement: Compatibility, modules, and singleton behavior are testable

The contract SHALL define supported Node, pnpm, TypeScript, React, Vite, Next.js, Flutter, Dart, Rust, and Tauri ranges. Every npm artifact SHALL provide loader-correct ESM, CommonJS, and TypeScript declarations and SHALL pass packed consumer fixtures. All JavaScript framework bindings SHALL resolve one compatible `@prometheus-ags/entity-graph-core` singleton. Next.js SHALL create a graph per server request and hydrate serializable state into a client-owned graph.

#### Scenario: A source build cannot substitute for consumer evidence

- **WHEN** an npm package is proposed for the release candidate
- **THEN** isolated Node ESM, Node CommonJS, and TypeScript module-resolution consumers install its packed tarball
- **AND** a failure in any advertised loader blocks promotion

### Requirement: Security, promotion, and recovery are bounded

Agent actions SHALL cross a validated allowlist and authorization boundary. Tauri commands SHALL use least-privilege capabilities. Secrets SHALL be excluded from packages, client bundles, logs, screenshots, video, and evidence. Stable promotion SHALL certify one immutable git SHA, verify the RC through clean consumers and provenance, publish migration/rollback guidance, and require explicit authority before moving npm `latest`. Partial publication SHALL never overwrite immutable registry versions.

#### Scenario: Partial publication is recoverable

- **WHEN** only part of the version set reaches a registry
- **THEN** stable tag movement stops
- **AND** the operator inventories immutable published versions
- **AND** unpublished artifacts may be repaired while defective published artifacts require a new patch version
- **AND** mutable tags and documentation may roll back to the last certified release

### Requirement: Explicit exclusions remain excluded

The 3.0 contract SHALL exclude KnowMe product applications and state, unlicensed Flutter source, placeholder hybrid-mobile packages, an unevidenced Forge adapter, unevidenced assistant-ui adoption, per-patch documentation snapshots, and any rehearsal that moves npm `latest`.

#### Scenario: Scope pressure does not weaken the contract

- **WHEN** an excluded integration is requested during implementation
- **THEN** it requires a recorded contract revision and its own evidence plan
- **AND** it cannot be silently added to the stable support matrix

### Requirement: Change is ready to archive

The change SHALL archive only after its complete task surface and every release-contract acceptance criterion have reproducible evidence.

#### Scenario: Change is ready to archive

- **WHEN** every task in `openspec/changes/v3-release-contract/tasks.md` is complete
- **THEN** every acceptance criterion in the plan's `v3-release-contract` section has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected
