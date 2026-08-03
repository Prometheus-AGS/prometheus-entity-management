# v3-dart-graph-riverpod Specification

## Purpose
Define the stable 3.0 Dart library boundary: one canonical normalized
`EntityGraph`, generated Riverpod 3 selectors/controllers, transport-neutral
views and mutations, optional native transport integration, a reproducible
Flutter stable-floor toolchain, and evidence that stays distinct from the
complete Flutter application and full-release publication decision.

## Requirements
### Requirement: Consolidated Dart graph and Riverpod 3 packages

The 3.0 release SHALL implement and verify the complete `v3-dart-graph-riverpod` scope and acceptance criteria defined in `.kbd-orchestrator/phases/full-3.0-release/plan.md`.

#### Scenario: The library archive is reproducible

- **WHEN** `pnpm run verify:dart-graph-riverpod`, the permanent Node and tagged
  BDD suites, the clean stable-SDK receipt, and the final verification manifest
  are evaluated
- **THEN** every acceptance criterion in the plan's `v3-dart-graph-riverpod` section has reproducible evidence
- **AND** no mandatory test or platform lane is silently skipped
- **AND** public API, example coverage, skills, and documentation ledgers are synchronized when affected
- **AND** unresolved application, device, registry, documentation-deployment,
  certification, and publication lanes have explicit downstream owners
- **AND** Pub.dev publication remains unauthorized until the stable-publication gate

#### Scenario: Riverpod does not become a second entity store

- **WHEN** list, entity, CRUD, mutation, or realtime provider families produce
  or observe entity data
- **THEN** canonical rows, local patches, sync metadata, and ID-only list
  membership remain owned by `EntityGraph`
- **AND** provider values rejoin graph state rather than retaining independent
  entity or list copies

#### Scenario: Failure and native integration remain bounded

- **WHEN** a provider fetch encounters a terminal or transient failure
- **THEN** terminal errors receive no retry and transient errors receive at most
  two retries after the first attempt
- **AND** create, update, and delete side effects are not automatically retried
- **AND** FFI/native integration remains an optional transport adapter with no
  required Cargo or native runtime dependency in the public Dart package
