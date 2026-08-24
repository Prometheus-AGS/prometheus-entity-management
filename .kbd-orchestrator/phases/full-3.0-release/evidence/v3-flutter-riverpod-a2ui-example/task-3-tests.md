# Task 3 — Flutter test and platform-smoke surface

Date: 2026-08-03
Change: `v3-flutter-riverpod-a2ui-example`

## Outcome

The example now has 25 passing host tests plus one shared mobile integration
smoke test authored for the Android and iOS device lanes. The host suite covers
the complete task-3 boundary: protocol validation, policy, normalized graph
behavior, Riverpod orchestration, optimistic/offline CRUD, realtime and
relationship invalidation, widget lifecycle states, accessibility semantics,
and phone/tablet visual baselines.

## Test inventory

| Surface | File | Passing checks |
| --- | --- | ---: |
| A2UI protocol, policy, official renderer | `test/a2ui_contract_test.dart` | 8 |
| Graph, controller, CRUD, realtime, FFI | `test/showcase_controller_test.dart` | 10 |
| Phone UI, A2UI E2E, loading/error/empty semantics | `test/showcase_widget_test.dart` | 4 |
| Phone/tablet entity and phone A2UI goldens | `test/showcase_golden_test.dart` | 3 |
| Shared Android/iOS smoke flow | `integration_test/mobile_smoke_test.dart` | Authored; device execution deferred to task 5 |

## Observed defects corrected by the tests

1. The GenUI fixture listed each button label both as the button child and as a
   sibling of the button. Official GenUI rendered duplicate action text. The
   column now owns only the button IDs; each label remains owned by its button.
2. `ShowcaseController` read auto-disposed CRUD and mutation notifiers without
   retaining them. They disposed during the deterministic transport delay and
   every async mutation lost its Riverpod `Ref`. The controller now holds a
   scoped `ref.listen` subscription through each awaited operation and closes
   it afterward.
3. Seeded Project and User rows had no `EntityState`, so
   `invalidateEntity` skipped them and relationship invalidation was a no-op.
   Seed normalization now marks every transport row fetched before the UI
   begins observing it.

## Deterministic verification

Executed from `examples/flutter-riverpod`:

```text
dart analyze --fatal-infos --fatal-warnings
flutter test test
```

Results:

- analyzer: `No issues found!`
- Flutter host suite: `25` tests, `All tests passed!`
- `.github/workflows/flutter-example-platform.yml`: `actionlint` PASS
- golden verification rerun without `--update-goldens`: PASS

Golden SHA-256 receipts:

- `showcase-phone-entity.png`:
  `9798cfca9b31f04ee67c01a921a41a876348e989d28b3dbb397a27dea26e217e`
- `showcase-tablet-entity.png`:
  `81df595bdf2a48cb0bb57d91d54b3157f11b80af1a5e19c32afb6523875cc9db`
- `showcase-phone-a2ui.png`:
  `28d0f72a7406dc62b224e99eb09144ae623e31acb62ae0dd60e3e01c6ff8b1b5`

All three images were inspected at original resolution. They establish
deterministic layout baselines; Flutter's test Ahem font intentionally renders
glyphs as blocks, while textual and semantic content is asserted separately by
the widget suite.

## Platform boundary

The workflow defines Android API 35 emulator and available-iPhone simulator
lanes against Flutter 3.44.8 stable. This task did not execute either native
lane and makes no Android/iOS pass claim. Task 5 owns the device executions,
stable-SDK lock verification, native receipts, and any platform-specific golden
reconciliation.

The active local shell remains Flutter 3.47 beta. Publication authorized:
**no**.
