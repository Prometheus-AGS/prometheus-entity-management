# Release impact — `v3-flutter-source-provenance`

Date: 2026-08-02

## What this change makes release-ready

- Reusable KnowMe Flutter source now has durable owner authority, MIT attribution, exact source revision, approved paths, exclusions, and publication denial recorded before import.
- The import preserves auditable history through a reachable filtered branch and complete old-to-new commit/metadata maps instead of falsely claiming rewritten hashes remain identical.
- `packages/entity_graph_flutter` remains the only canonical Dart graph package. Imported material is explicitly non-buildable, non-workspace, non-public provenance for downstream adaptation.
- Applications, product models, direct FFI, secrets, generated Dart, lockfiles, build output, dirty-tree content, and the placeholder package are excluded and fail closed under adversarial tests.
- `hybrid-mobile-architecture-src` is correctly retained as an MIT architecture/template reference rather than fabricated into a runtime library.
- Release coverage, documentation, and skill guidance teach the same boundary while runtime export ledgers remain unchanged.
- A deterministic lineage diagram makes the chain of custody and ownership boundary reviewable without pretending to be Flutter rendering evidence.

## Compatibility and dependency effect

This change adds no runtime API or package entry point and therefore has no direct consumer compatibility effect. It creates an auditable source input and explicit canonical owner for the breaking Dart/Riverpod adaptation that follows.

The separate probe confirms the current Dart package remains viable on Flutter 3.47 beta—offline lock resolution, zero analyzer issues, and 54 tests pass—but it is not yet modernized. Riverpod 3, Dart 3.13 formatting, analyzer policy, generator compatibility, and Melos are deliberately deferred to `v3-dart-graph-riverpod`, where behavioral and public API consequences can be tested coherently.

## Downstream impact

This archive satisfies the provenance dependency for:

- `v3-dart-graph-riverpod`, which adapts approved concepts into the canonical Dart package;
- `v3-flutter-riverpod-a2ui-example`, which owns rendered Flutter behavior and visual/accessibility proof;
- Flutter package, migration, integration, and API documentation; and
- final release certification, which consumes this history/license receipt.

The provenance directory must remain historical evidence and must not become a dependency of any downstream build.

## What remains incomplete for full 3.0

The Dart/Riverpod 3 implementation, Flutter showcase and devices, Tauri desktop/mobile work, five complete showcase applications, Flint contracts, full skills ecosystem, complete Prometheus-branded Docusaurus site, GitHub Pages deployment, RC/provenance/recovery automation, immutable-commit certification, registry authority, stable publication, and npm `latest` promotion remain open.

The coverage ledger therefore remains `in-progress` with `releaseCertified: false`. This archive certifies source chain of custody, not the full release.

## Publication authority

Publication remains unauthorized. No registry, release, deployment, dist-tag, pub.dev, or platform-store mutation occurred.
