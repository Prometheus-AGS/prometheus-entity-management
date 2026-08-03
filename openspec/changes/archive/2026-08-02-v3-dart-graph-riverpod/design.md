# Design: v3-dart-graph-riverpod

## Candidate reuse decisions

### cand-006 — Riverpod 3 code-generation stack

- **Verdict:** adopt
- **Decision:** Adopt the newest Riverpod 3 code-generation stack that resolves from a clean Flutter 3.44.8 stable SDK: flutter_riverpod 3.3.2, annotations 4.0.3, generator 4.0.4, and build_runner 2.15.1. Remove the canonical package's unused Freezed/JSON generator declarations. Riverpod 3.4.2/generator 4.0.8 require analyzer 13 plus a newer SDK test matrix; build_runner 2.15.2+ forces analyzer 13.3+. That latest-at-any-cost combination resolves on Flutter 3.47 beta but not at the declared stable floor.
- **Evidence:**
  - Tier 1: Riverpod is the maintained reactive caching/data-binding framework selected by both existing Flutter implementations. (https://github.com/rrousselGit/riverpod)
  - Tier 3: pub.dev package metadata shows flutter_riverpod 3.3.2 binds Riverpod 3.3.2 and supports Dart ^3.7.0/Flutter >=3.0.0. (https://pub.dev/packages/flutter_riverpod/versions/3.3.2)
  - Tier 3: pub.dev package metadata shows riverpod_generator 4.0.4 uses analyzer ^12.0.0 and annotations 4.0.3. (https://pub.dev/packages/riverpod_generator/versions/4.0.4)
  - Tier 3: pub.dev package metadata shows build_runner 2.15.1 accepts analyzer 8 through 13, while 2.15.2+ requires analyzer 13.3 or newer. (https://pub.dev/packages/build_runner/versions)
  - Tier 4: Riverpod 3 automatically retries failed providers by default, so terminal entity/FFI errors must explicitly opt out. (https://riverpod.dev/docs/3.0_migration)

### cand-007 — KnowMe prometheus_entity_management Flutter package

- **Verdict:** adapt
- **Decision:** Import its generic provider/view/CRUD concepts with history, then decouple them from the KnowMe-specific FFI implementation behind an adapter package.
- **Evidence:**
  - Tier 1: The 2,704-line source package contains Riverpod 3 provider families, transport, view, sync, generated models, and CRUD, but no package-local test directory. (file:///Users/gqadonis/Projects/know-me/know-me-system/flutter_packages/prometheus_entity_management)

### cand-008 — Existing entity_graph_flutter alpha

- **Verdict:** adapt
- **Decision:** Preserve its tested hand-written graph/SDL behavior as the sole Dart-native state owner, then expose one Riverpod 3 public Flutter binding whose families/controllers select and orchestrate that graph. Correct the manifest's stale Freezed/generated-model claims; no canonical source currently uses Freezed, JSON, or Riverpod annotations.
- **Evidence:**
  - Tier 1: The 2,211-line package has graph, provider, SDL, transport, and error tests, but its manifest claims Riverpod 3 while depending on Riverpod 2.6.1. (https://github.com/Prometheus-AGS/prometheus-entity-management/tree/main/packages/entity_graph_flutter)

### cand-015 — Melos 8

- **Verdict:** adopt
- **Decision:** Use Melos as a thin Dart sub-workspace runner, called from root pnpm release scripts, rather than forcing Flutter packages into Turbo.
- **Evidence:**
  - Tier 3: Melos 8.2.2 is maintained specifically for multi-package Dart and Flutter repositories. (https://pub.dev/packages/melos)

## Boundary

Reuse or adapt these candidates only within the boundaries recorded in `library-candidates.json`; their protocol/runtime ownership must not be duplicated. Re-run compatibility and maintenance checks at implementation time when a dependency version is temporally unstable.

## Implemented architecture

- `EntityGraph` remains the only owner of canonical entities, local patches,
  sync metadata, and ID-only list membership.
- Generated Riverpod 3 class families select/orchestrate the graph and provide
  list, entity, per-record CRUD, collection mutation, and change-bridge APIs.
- Transport adapters own external I/O and row normalization. The optional FFI
  adapter has no native dependency and cannot replace graph ownership.
- Terminal fetch failures never retry; transient fetches retry at most twice.
  Mutation side effects are never automatically retried.
- The root Dart workspace uses Melos 8 beneath pnpm-fronted scripts. Its lock
  resolves Flutter/Riverpod/codegen/analyzer as one reproducible matrix.

Implementation exposed and corrected two toolchain/lifecycle hazards: initial
graph events could publish an empty async value before first fetch completion,
and a generic functional family without a `T`-carrying argument triggered bad
generator inference. Initialization gating and a generic class-family bridge
resolve those hazards without hand-editing generated source.
