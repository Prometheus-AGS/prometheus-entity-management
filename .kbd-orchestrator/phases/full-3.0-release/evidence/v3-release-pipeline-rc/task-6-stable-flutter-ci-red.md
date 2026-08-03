# Task 6 RED receipt — full CI used the unsupported Flutter beta

## Failed gate

The first final `pnpm run ci` inherited `/Users/gqadonis/development/flutter`
from PATH. That checkout is Flutter `3.47.0-0.1.pre` beta with Dart 3.13 beta,
not the repository's certified Flutter 3.44.8/Dart 3.12.2 floor.

The beta resolver changed six root lock entries and the stable widget golden
checks failed. Full Cucumber reported:

```text
6 hooks (6 passed)
87 scenarios (79 passed, 8 failed)
414 steps (388 passed, 18 skipped, 8 failed)
```

Every failed scenario entered through
`verify:dart-graph-riverpod`; the JavaScript, React, package, sync, Tauri, and
release-pipeline checks before that boundary passed.

## Corrective environment

An isolated Flutter worktree was recreated at exact revision
`058e0af2c2b57e369d905a03ac9748b0ebf543c6`:

```text
Flutter 3.44.8
Dart 3.12.2
```

Stable `flutter pub get` restored the certified root lock SHA-256:

```text
b1d5f04a06b6cef20b5b0304835a30cc512bf59cd49382b91e6e384f3c650952
```

The targeted stable verifier then passed before the full CI retry. No golden,
tolerance, package constraint, or test assertion was weakened.
