# Deep research report — Dart graph and Riverpod 3

## Executive finding

The library change is ready to archive, not ready to promote the full release.
Both prerequisites are complete and archived; implementation, permanent BDD,
public-ledger synchronization, scoped visual proof, and the clean Flutter
3.44.8 stable candidate now pass. The completed architecture preserves the
tested hand-written Dart graph as the sole state owner, uses Riverpod as a
binding/orchestration layer, removes unused Freezed/JSON generators, and keeps
KnowMe FFI behind an optional transport. Pub.dev authority, the full Flutter
application and devices, immutable release-wide certification, and stable
promotion remain downstream.

Confidence is 0.94. All four material contradictions are resolved; none remains hidden.

## Dependency readiness

`v3-flutter-source-provenance` passed its final archive verification, promoted its strict spec, retained history/attribution evidence, and explicitly prohibited the provenance import from becoming a second buildable or public graph package. `v3-package-module-contracts` passed strict archive verification and twelve-package npm tarball checks; its own receipt says Dart/Melos was not applicable. Therefore task 1 can close, but neither prerequisite can be cited as proof that the Dart package compiles on Riverpod 3.

## Local implementation audit

The canonical `packages/entity_graph_flutter` package already implements normalized entity storage, local patches, ID-only list membership, transport interfaces, SDL behavior, and 54 tests. Its provider layer uses Riverpod 2 `AutoDisposeAsyncNotifier` APIs. Its `pubspec.yaml` says “Riverpod 3” and “Freezed immutable models,” but depends on Riverpod 2-era versions and contains no `@freezed`, `@riverpod`, generated `part`, or generated model source. Those declarations are stale packaging claims, not runtime requirements.

The provenance import contains more current Riverpod family/controller examples and an explicit terminal `_noRetry` policy. It also routes state through KnowMe Rust/FFI. Copying that ownership would violate the plan's Dart-native canonical graph and create a mandatory foreign runtime. The correct reuse verdict remains **adapt**, not adopt.

## Stable dependency matrix correction

Registry metadata observed on 2026-08-02 shows `flutter_riverpod` 3.4.2, `riverpod_annotation` 4.0.6, `riverpod_generator` 4.0.8, `build_runner` 2.16.0, `flutter_lints` 6, and Melos 8.2.2 as current stable candidates. However, `riverpod_generator` 4.0.8 requires analyzer 13 while stable Freezed 3.2.5 requires analyzer below 11. An unconstrained major-upgrade probe proposed Freezed 4.0.0-dev.3, a prerelease.

Because the package does not use Freezed or JSON generation, the honest stable resolution is to delete those unused dependencies and correct the description. A disposable copy with the Riverpod-only stable matrix resolved successfully. Its analyze/tests then failed on the removed Riverpod 2 notifier APIs, exactly the RED behavior task 2 must address. No product file was changed by the probe.

## Riverpod 3 behavioral obligations

The migration is not a mechanical import rename. Riverpod 3 retries failed providers automatically, pauses out-of-view providers, compares updates with `==`, removes specialized Ref subclasses, and changes notifier lifecycle/API behavior. Entity not-found, validation, permission, conflict, and terminal transport failures must stop retrying. Transient failures need an explicit bounded/backoff policy. Provider families may select entities and orchestrate graph writes, but cannot own copied entity records or list data.

## Implementation guardrails for task 2

1. Keep the Dart graph and its ID-only lists canonical.
2. Add Riverpod 3 families/controllers whose values are derived from or committed through that graph.
3. Introduce explicit terminal-versus-transient retry policy before turning existing tests green.
4. Keep transport abstract; place any Rust/FFI bridge behind an optional adapter.
5. Remove unused Freezed/JSON generator dependencies instead of accepting prerelease tooling.
6. Use Melos only as the Dart sub-workspace runner under root pnpm orchestration.
7. Reserve stable-SDK clean certification for task 5; the installed beta is readiness evidence only.

## Limitations

- Firecrawl tools were requested but not callable in this session; the package records the fallback to official primary documentation, live pub registry metadata, local primary source, and disposable resolver evidence.
- The resolver probe proves dependency resolution and an expected migration failure, not successful code generation, analysis, tests, Flutter widgets, platforms, pub.dev publication, or full 3.0 release readiness.
- Exact final lower bounds must be locked by task 2 implementation and task 5 clean stable-SDK certification rather than inferred from the local beta alone.

## Post-implementation declared surface

Tasks 2–4 confirmed the architecture and converted the readiness findings into
generated Riverpod 3 code, permanent tests, a source-derived 81-declaration API
ledger, and synchronized package/release/agent guidance. The automatically
discovered Flutter suite now passes 70 tests, and the tagged BDD contract binds
library behavior, scoped goldens, coverage, docs, and the generated public part.

The coverage update deliberately does not close broader Flutter claims.
Relationship cascade invalidation, realtime batching, offline persistence, the
complete Flutter/A2UI application, Android/iOS, accessibility, pub.dev authority,
immutable release-wide certification, and stable promotion remain open. This preserves
the report's original distinction: a coherent library is necessary for 3.0 but
is not the full release.

## Task 5 stable-floor correction

The clean-room probe changed the dependency conclusion. The earlier disposable
resolution used the installed Flutter 3.47 beta and therefore did not prove the
declared Flutter 3.44 stable floor. The official macOS arm64 Flutter 3.44.8
archive (Dart 3.12.2) reproduced a solver failure: Riverpod 3.4.2/generator
4.0.8 pulls analyzer 13 and a newer `test`/`test_api` line than Flutter 3.44.8
provides; build_runner 2.15.2+ further requires analyzer 13.3+.

Live pub.dev metadata and a stable-SDK resolver probe identify the newest
mutually compatible stable set at the declared floor: flutter_riverpod 3.3.2,
riverpod_annotation 4.0.3, riverpod_generator 4.0.4, and build_runner 2.15.1.
This is a sycophancy correction: “latest versions” is not accepted as a release
success when those versions silently require a beta SDK. Bounded runtime ranges
and exact generator pins document the compatibility boundary until the package
raises its stable Flutter floor.
