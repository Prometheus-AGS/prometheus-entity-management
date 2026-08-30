# Task 9 — Dart API, skills, security, and archive QA

Date: 2026-08-30

## Delta completed

- Added a source-derived ledger for the optional
  `package:entity_graph_flutter/devtools.dart` entry and refreshed the ordinary
  Dart ledger after graph instrumentation.
- Wired both ledgers into package, skills, Dart graph, and generated API
  contract checks with exact counts of 93 ordinary and 99 DevTools public
  declarations.
- Added the Flutter controller reference to the Prometheus entity skills and
  synchronized package selection, library API, ecosystem claims, root/package
  READMEs, release guidance, API guidance, framework/example pages, and the
  Docusaurus security boundary.
- Separated repository source from the published pub.dev `3.0.1` archive, the
  pending Flutter DevTools extension UI, and later immutable release
  certification.
- Restored the base Dart graph command as an explicitly static/non-test gate;
  the external Flutter/Riverpod/VM-service flow remains the only current
  behavioral evidence for this controller.

## Deterministic evidence

- `pnpm run verify:dart-graph-riverpod` — pass in `--skip-flutter` static mode.
- `pnpm run verify:dart-exports` — pass, 93 root / 99 DevTools declarations.
- `pnpm run verify:skills` — pass across every npm and Dart ledger.
- Custom root/DevTools ledger write and verification — pass, 93 / 99.
- Package-scoped `dart analyze` — completed with no errors and four
  style-level `prefer_initializing_formals` infos.
- Package-scoped `dart doc` — zero warnings/errors; all 93 root and 99
  DevTools ledger declarations are present in the generated index.
- Node syntax, JSON/schema, stale-claim, sensitive-receipt, and diff whitespace
  checks — pass.
- Artifact-refiner — pass after two iterations; iteration 2 resolves the
  verified first-review delta.

These checks are deterministic contract checks, not behavioral test evidence.
No excluded test class or full build ran in Task 9.

## Behavioral receipt retained

Task 8 remains the sole behavior gate. Its sanitized receipt records status
`pass`, boundary `flutter-riverpod-vm-service-acceptance`, source commit
`ad72bcf8d99d7175cf2bf36d4f8ce4594d200da4`, two isolated stores, and 28
versioned events.

## Final isolated gate

The corrected cumulative Task 9 packet passed isolated distinct-model review
with zero critical findings, three warnings, and one suggestion. The strict
sycophancy screen passed at `0.0`. Resolutions and retained limits are recorded
in the change verification; no warning authorizes publication or the pending
extension UI.
