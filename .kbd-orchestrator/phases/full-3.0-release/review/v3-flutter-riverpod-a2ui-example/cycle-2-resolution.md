# Adversarial review cycle 2 — resolution

Date: 2026-08-04

Cycle 2 returned one critical finding: the reusable platform workflow resolved
the example package but invoked both smoke tests from the repository root.

Disposition: **confirmed and corrected**.

- The Android action script now changes into `examples/flutter-riverpod` and
  runs `flutter test integration_test/mobile_smoke_test.dart` from the package
  root.
- The iOS run step now declares
  `working-directory: examples/flutter-riverpod` and uses the same
  package-relative test path.
- `tests/release/v3-dart-graph-riverpod.test.mjs` now fails if either lane
  returns to a root-relative invocation.
- The targeted Dart release test passes 6/6; the complete focused release set
  passes 45/45; workflow syntax validation and diff hygiene pass.

The corrected tracked workflow SHA-256 is
`0f498a8b71ead7600457e4f1a779aebab0409e8a67c309a0eabdd5ae90339ac0`.
The local iOS/Android task-5 receipts remain valid; this correction makes the
repeatable hosted workflow align with the already-certified package-root
commands.
