# Task 1 — dependency readiness

Date: 2026-08-02  
Change: `v3-dart-graph-riverpod`  
Task: Confirm dependencies are complete: `v3-flutter-source-provenance`; `v3-package-module-contracts`.

## Verdict

**Pass for starting implementation.** Both declared OpenSpec dependencies are complete, archived, promoted, and strictly verifiable. This receipt does not claim that the Dart package, Riverpod 3 migration, Flutter platforms, pub.dev artifact, or full Prometheus 3.0 release is complete.

## Dependency evidence

| Dependency | Canonical evidence | Result | Boundary retained |
| --- | --- | --- | --- |
| `v3-flutter-source-provenance` | `final-verification.json`; archive `openspec/changes/archive/2026-08-02-v3-flutter-source-provenance`; promoted `openspec/specs/v3-flutter-source-provenance/spec.md` | Pass-to-archive; promoted spec validates | Provenance import is non-buildable/non-public; `entity_graph_flutter` remains canonical; FFI is not promoted into public core |
| `v3-package-module-contracts` | `clean-gates.json`; archive `openspec/changes/archive/2026-08-01-v3-package-module-contracts`; promoted `openspec/specs/v3-package-module-contracts/spec.md` | Pass; 12/12 npm artifact contracts | Certifies npm package boundaries only; its Dart/Melos gate was explicitly not applicable |

## Research and Feynman gate

The persistent package at `.research/v3-dart-graph-riverpod` records 11 sources, 8 claims, four resolved contradictions, confidence 0.94, and Feynman grade 0.95. The sycophancy review corrected three unsafe assumptions:

1. “latest” does not mean an incoherent all-latest generator set;
2. imported KnowMe code is not automatically the canonical graph owner;
3. completed prerequisites do not certify this implementation.

## Disposable RED readiness probe

The repository was copied to `/tmp/prometheus-dart-readiness.hHZX2V/entity_graph_flutter`; no product source was edited. Current stable registry metadata showed a hard toolchain contradiction: `riverpod_generator` 4.0.8 requires analyzer 13, while stable `freezed` 3.2.5 requires analyzer below 11. The canonical source uses neither Freezed nor JSON generation.

The candidate probe therefore removed unused Freezed/JSON dependencies and resolved:

- Dart `>=3.12.0 <4.0.0`
- Flutter `>=3.44.0`
- `flutter_riverpod` 3.4.2
- `riverpod_annotation` 4.0.6
- `riverpod_generator` 4.0.8
- `build_runner` 2.16.0
- `flutter_lints` 6.0.0

`flutter pub get` passed. Analyze and all four test loading paths then failed at Riverpod 2 `AutoDisposeAsyncNotifier` usage (18 analyzer errors), providing the expected RED boundary for task 2. This is readiness evidence, not a clean implementation gate.

## Task 2 handoff

- Preserve the hand-written normalized graph and ID-only lists as canonical.
- Implement Riverpod 3 families/controllers as graph selectors and orchestrators.
- Define terminal no-retry and bounded transient retry behavior.
- Remove stale unused Freezed/JSON manifest claims rather than accepting a prerelease generator.
- Keep Rust/FFI behind an optional transport adapter.
- Certify the final matrix on the stable Flutter channel during the clean-gate task.

Publication authorized: **no**.
