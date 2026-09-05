# C8 — Dart hook helpers

**Status** complete · **Date** 2026-09-04

## What was added

| File | Mirrors |
|---|---|
| `lib/src/hooks/use_entity.dart` | React `useEntity` |
| `lib/src/hooks/use_entity_list.dart` | React list read |
| `lib/src/hooks/use_entity_query.dart` | React `useEntityQuery` |
| `test/hooks_test.dart` | 3 contract tests |

Exported from `lib/entity_graph_flutter.dart`. The providers remain the
canonical API; these are a thinner call shape for widgets already using hooks,
not a second source of truth.

## Filenames follow Dart, not the plan

The plan specified kebab-case (`use-entity.dart`), carried over from the JS
side. The Dart analyzer disagreed:

```
info • The file name 'use-entity-list.dart' isn't a lower_case_with_underscores
       identifier • file_names
```

Renamed to `use_entity.dart`, `use_entity_list.dart`, `use_entity_query.dart`.
Kebab-case is a JS convention; `lower_case_with_underscores` is Dart's, and the
linter enforces it. The package's existing `ffi-transport.dart` is the
inconsistency, not these.

## Signatures were verified, not assumed

The first draft of `use_entity.dart` was written against an assumed API — an
`EntityConfig` argument and an unwrapped `EntitySnapshot` return. Both were
wrong. Reading the real call sites in `test/cross-view-widget_test.dart` showed:

```dart
entityProvider<VisualUser>(type: 'User', id: '1', fromGraph: …)  // named args
```

and that the family is an `$AsyncNotifierProvider`, so the value is
`AsyncValue<EntitySnapshot<T>>`. Corrected before compiling.

The analyzer then caught two more: `ListQuery` lives in `transport.dart`, not
`view.dart`, and `VoidCallback` needs `package:flutter/foundation.dart`.

## `useMemoized` is load-bearing

Each helper memoizes the provider on its arguments. Without it, a `fromGraph`
closure written inline at a call site produces a new family key every render —
subscription churn that is easy to write, invisible in a screenshot, and
expensive at runtime. One of the three tests exists to hold that.

## Cursor semantics in `useEntityQuery`

`setSearch`, `setSort` and `setFilter` **drop** `ListQuery.cursor`; `setLimit`
keeps it. A cursor is a position within one result set — carrying it across a
query change pages into a set that no longer exists. A page-size change does not
invalidate the position. This is asserted in the tests rather than left to a
comment.

## Verification — observed

```
flutter analyze  → 4 issues, ALL pre-existing info-level prefer_initializing_formals
                   (0 errors; the 3 undefined_class errors were fixed)
flutter test test/hooks_test.dart → All tests passed! (3)
flutter test                      → All tests passed! (73 = 70 existing + 3 new)

node scripts/dart-public-api-contract.mjs --write
  → Wrote 97 Dart public declarations
  → Wrote 104 Dart DevTools declarations
node scripts/dart-public-api-contract.mjs
  → OK: 97 root and 104 DevTools declarations match the ledgers. EXIT=0
```

**GAP-F resolved.** The ledger check failed before the refresh, exactly as the
assessment predicted, and passes after.

Toolchain: Flutter 3.48.0-0.3.pre (beta).
