# C7 — Flutter toolchain and `hooks_riverpod`

**Status** complete (codegen pending confirmation) · **Date** 2026-09-04

## GAP-E — the recorded failure is REFUTED

`pubspec.yaml` carried two comments asserting the target versions could not be
used:

> *"Bounded ranges retain the newest Riverpod generation line that resolves on
> Flutter 3.44 stable. The 3.4/4.0.6 line targets the newer Flutter test
> dependency matrix and cannot resolve against Flutter 3.44.8."*

> *"build_runner 2.15.2+ forces analyzer 13.3+, while Riverpod generator 4.0.4
> uses analyzer 12 and remains compatible with Flutter 3.44.8."*

The plan required reproducing or refuting these before overriding them. **They
were refuted.** The target set resolves:

```
hooks_riverpod 3.4.3 · flutter_hooks 0.21.3+1 · riverpod_annotation 4.0.7
build_runner 2.16.1 · riverpod_generator 4.0.9 · riverpod_lint 3.1.9
→ Changed 27 dependencies. Resolution succeeded.
```

**Toolchain the checks actually ran on: Flutter 3.48.0-0.3.pre (beta).**
Stated plainly because a result whose toolchain is unstated is not evidence.
`environment.flutter` still declares `>=3.44.0` and was **not** raised — this
run does not prove 3.44.8 works, only that the analyzer conflict described in
the comments is not what blocks the upgrade today.

## Two real blockers, neither the one recorded

**1. A workspace member, not an analyzer conflict.**

```
Because prometheus_entity_showcase depends on riverpod_generator 4.0.4 and
entity_graph_flutter depends on riverpod_generator 4.0.9, version solving failed.
```

`examples/flutter-riverpod` is a `resolution: workspace` member, so its pins
must move in lockstep. Aligned to the same set. The assessment did not find this
— it inspected only `packages/entity_graph_flutter`.

**2. `custom_lint 0.8.1` — self-inflicted.**

```
build_runner 2.16.1 depends on analyzer >=13.3.0 <15.0.0
custom_lint 0.8.1 depends on analyzer ^8.0.0
→ version solving failed
```

This *looked* like the recorded analyzer conflict, and it is worth being precise
about why it is not: `custom_lint` was **added by this change**, not present
before. Removing it resolved cleanly. Had the failure been accepted at face
value it would have "confirmed" a constraint that does not exist.

`riverpod_lint 3.1.9` is retained and resolves; it pulls its own compatible
`custom_lint`.

## Changes

| File | Change |
|---|---|
| `packages/entity_graph_flutter/pubspec.yaml` | `flutter_riverpod` → `hooks_riverpod 3.4.3`; added `flutter_hooks 0.21.3+1`; `riverpod_annotation 4.0.7`; `build_runner 2.16.1`; `riverpod_generator 4.0.9`; `riverpod_lint 3.1.9`; stale comments replaced |
| `examples/flutter-riverpod/pubspec.yaml` | same set, lockstep |
| `test/provider-contract_test.dart` | import → `hooks_riverpod` |
| `test/cross-view-widget_test.dart` | import → `hooks_riverpod` |

The two test imports became `depend_on_referenced_packages` warnings once
`flutter_riverpod` stopped being a named dependency. `hooks_riverpod` re-exports
the full `flutter_riverpod` surface, so switching the import is the correct fix,
not adding the dependency back.

## Verification — observed

```
flutter --version → 3.48.0-0.3.pre (beta), framework 87af191112

flutter pub get   → Changed 27 dependencies. Resolution succeeded.
flutter analyze   → 4 issues found, ALL info-level `prefer_initializing_formals`
                    (pre-existing style hints in controller.dart / graph.dart;
                     the 2 new depend_on_referenced_packages warnings were fixed)
flutter test      → All tests passed!  (70 tests)
```

## Parity closed

The library previously pinned *below* what the consuming prior-auth mobile app
uses. Both now sit on the same set:

| | before | after / prior-auth mobile |
|---|---|---|
| riverpod line | `>=3.3.2 <3.4.0` | **3.4.3** |
| `riverpod_annotation` | `>=4.0.3 <4.0.5` | **4.0.7** |
| `riverpod_generator` | 4.0.4 | **4.0.9** |
| `build_runner` | 2.15.1 | **2.16.1** |

## Still unverified

Whether this set resolves on **Flutter 3.44.8 stable**, which
`environment.flutter: ">=3.44.0"` promises. Not testable here. The floor was
deliberately left unchanged rather than raised silently — raising it drops 3.44
users and is a breaking change for the Dart package.
