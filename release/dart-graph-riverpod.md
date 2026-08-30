# Dart graph and Riverpod 3 gate

The `v3-dart-graph-riverpod` gate certifies the canonical Dart library layer for
the 3.0 release inventory. It does not promote the full release and does not
turn the filtered KnowMe provenance tree into a second package.

## Certified boundary

`packages/entity_graph_flutter` is versioned as `3.0.0` and remains the only
Dart graph owner. Its public library exports:

- one normalized `EntityGraph` with canonical rows, local patches, sync
  metadata, and ID-only list membership;
- generated Riverpod 3 families for graph/registry injection, entity and list
  selection, realtime change bridging, per-record CRUD, and collection create;
- transport-neutral local, remote, and hybrid views;
- terminal and transient error types with bounded provider-fetch retry;
- a pluggable transport registry plus an optional callback-backed FFI adapter;
- the shared SDL parser and intermediate representation.

Repository source now also contains a separate optional
`package:entity_graph_flutter/devtools.dart` entry. It is not exported from the
ordinary barrel and was added after the published `3.0.1` archive. The entry
provides a reference-counted controller per graph, Riverpod logical-view
instrumentation, bounded inspection/history/preview/time travel, and an
isolate-wide store-explicit VM-service bridge. Its complete assembled gate is
`pnpm run verify:devtools-flutter-controller`; it does not certify the later
Flutter DevTools extension UI or a pub.dev payload.

The primary generated entry points are `entityGraphProvider`,
`entityTransportRegistryProvider`, `entityChangeBridgeProvider<T>`,
`entityListProvider<T>`, `entityProvider<T>`, `entityCrudProvider<T>`, and
`entityMutationsProvider<T>`. The declaration ledger includes their generated
provider/family classes as well as these consumer-facing variables.

Riverpod providers select and orchestrate the graph; they are not independent
entity caches. Transports own external I/O and row normalization. Widgets read
providers and call their controllers. Lists retain IDs, never row copies.

## Stable dependency matrix

| Surface | Declared version |
| --- | --- |
| Flutter | `>=3.44.0` |
| Dart | `>=3.12.0 <4.0.0` |
| `flutter_riverpod` | `>=3.3.2 <3.4.0` |
| `riverpod_annotation` | `>=4.0.3 <4.0.5` |
| `riverpod_generator` | `4.0.4` |
| `build_runner` | `2.15.1` |
| `flutter_lints` | `^6.0.0` |
| Melos | resolved by the root Dart workspace |

Unused Freezed and JSON generator declarations were removed. The current
stable Riverpod generator needs an analyzer generation that does not intersect
the current stable Freezed generator constraint, and this package contains no
Freezed or JSON annotations. Adding either generator back requires a concrete
source-level need and a newly certified compatible matrix. Riverpod 3.4.2 and
generator 4.0.8 require the newer analyzer/test dependency line and do not
resolve with Flutter 3.44.8's SDK pins. Riverpod 3.3.2, annotations 4.0.3,
generator 4.0.4, and build_runner 2.15.1 are the newest mutually compatible
stable set at the declared Flutter floor. Runtime constraints allow compatible
patch releases; generation tools stay exact for reproducible output.

## Current verification doctrine

Run from the repository root:

```bash
pnpm run dart:format
pnpm run dart:analyze
pnpm run verify:dart-graph-riverpod
pnpm run verify:dart-exports
pnpm run verify:devtools-flutter-controller # when certifying the optional controller
```

Implement the complete production path before verification. Formatting,
analysis, `verify:dart-graph-riverpod`, and the dual export-ledger check are
static confirmations, not behavioral test evidence. Do not run or cite the
legacy unit, widget, provider, golden, Node, Cucumber, or partial suites. Only
a complete assembled production flow across the affected real boundaries
counts as behavioral evidence; the optional controller uses the external
Flutter/Riverpod/VM-service acceptance command above.

`dart-library-exports.json` records the ordinary public barrel, including the
generated Riverpod part. `dart-devtools-library-exports.json` separately
records the optional repository-source DevTools barrel. Both are compared
mechanically to source.

Historical Flutter unit/widget/golden receipts remain audit history for the
published `3.0.1` candidate, but they are not current completion or release
evidence under the implementation-first, full-integration-only doctrine.

Before the next pub.dev release, `v3-devtools-release-certification` must add
and pass one ordinary-library assembled Flutter/Riverpod acceptance flow that
exercises the production graph, generated providers, transport, view, CRUD,
realtime, and rendering boundaries without unit/widget/mock substitution. The
DevTools controller gate does not replace that future ordinary-library release
gate.

## Clean stable-SDK candidate

Task 5 certifies the library from a clean, history-preserving candidate at
commit `9c341c22c158e3c685860ab3b60e649d29367f87` using the official Flutter
3.44.8 stable archive and Dart 3.12.2. Frozen pnpm and Dart resolution,
generation drift, format, analyze, 70 Flutter tests, the Pub package payload,
root CI/BDD/build/skills/security gates, and strict OpenSpec validation pass.
The Pub dry run reports zero warnings for an 84 KB archive.

This clean receipt is a library candidate, not the immutable full-release SHA.
Release-wide certification must still join every npm, Dart, Rust, platform,
showcase, documentation, security, and publication lane at one commit.

## Public API ledger

The authoritative Dart ledger is
`prometheus-entity-skills/_shared/references/dart-library-exports.json` for the
ordinary entry and
`prometheus-entity-skills/_shared/references/dart-devtools-library-exports.json`
for the optional DevTools entry.
Whenever the barrel, an exported source, or `providers.g.dart` changes public
declarations, run:

```bash
pnpm run refresh:dart-exports
pnpm run verify:dart-exports
pnpm run verify:skills
```

Generated provider declarations are public Dart declarations even when most
consumers use only the provider variables. Do not hand-edit generated code to
change the ledger; change annotations/source and regenerate it.

## Honest exclusions

This gate does not certify:

- pub.dev ownership, credentials, provenance, or publication;
- the immutable full-release SHA or cross-ecosystem certification bundle—the
  library's clean stable-SDK candidate is complete, but other release lanes are not;
- the complete Flutter + Riverpod + A2UI showcase, Android/iOS runners,
  accessibility, phone/tablet navigation, or physical-device smoke tests;
- offline persistence, peer convergence, realtime coalescing, or relationship
  cascade semantics not implemented by the Dart package;
- npm promotion, the documentation deployment, or full 3.0 certification.

The source-provenance gate proves where reusable Flutter concepts came from.
This gate proves the canonical Dart library behavior and clean package
candidate. The later Flutter showcase proves the application and device
experience. None substitutes for registry authority, immutable release-wide
certification, or stable release approval.
