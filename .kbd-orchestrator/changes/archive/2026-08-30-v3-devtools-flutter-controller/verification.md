# Verification — v3-devtools-flutter-controller

## Completed production boundary

The production implementation is carried by commits `6923fd83` through
`ad72bcf8`. It adds the optional Dart protocol/controller/VM-service path,
graph/Riverpod instrumentation, bounded projections/history/preview/rewind,
and one external acceptance harness. Commit `4405e43c` records the accepted
assembled receipt.

## Behavioral evidence

The sole behavioral gate is `pnpm run verify:devtools-flutter-controller`.
Task 8 ran it from outside a real Flutter debug application against the
production Riverpod and VM-service boundaries. Its accepted receipt is:

`.kbd-orchestrator/phases/v3-devtools-parity/evidence/v3-devtools-flutter-controller/task-8-assembled-acceptance.json`

The receipt records:

- status `pass`;
- boundary `flutter-riverpod-vm-service-acceptance`;
- tested source commit `ad72bcf8d99d7175cf2bf36d4f8ce4594d200da4`;
- two isolated stores and 28 versioned Extension-stream events;
- fixture, Riverpod view, projection, redaction, transport-bound, preview
  conflict, rewind/live, history, and disposal assertions.

Deterministic receipt validation confirms that the actual sentinel value,
registry-token variable names, host-local path, and raw VM-service URI are
absent. The safe assertion label names the sentinel behavior without retaining
the value.

## Task 9 deterministic checks

- Node syntax passed for `dart-public-api-contract.mjs`,
  `generate-api-reference.mjs`, and `verify-dart-graph-riverpod.mjs`.
- Package-scoped `dart analyze` completed after implementation with no errors
  and four existing style-level `prefer_initializing_formals` infos.
- Package-scoped `dart doc` completed with zero warnings/errors; all 93 root
  and 99 DevTools ledger declarations are present in `index.json`.
- `pnpm run verify:dart-graph-riverpod` passed in static
  `--skip-flutter` mode. It is not test evidence.
- `pnpm run verify:dart-exports` passed with 93 ordinary and 99 optional
  DevTools declarations.
- A temporary custom `--ledger` plus `--devtools-ledger` write/verify round trip
  produced the same 93/99 counts.
- `pnpm run verify:skills` passed every npm ledger and both Dart ledgers.
- JSON/schema, stale-claim, sensitive-receipt, and whitespace checks passed.
- Artifact-refiner iteration 3 passed all six blocking constraints and was
  finalized after the phantom-export correction round.

No unit, widget, provider, component, isolated, mock-backed, snapshot, golden,
Node test, Cucumber, partial integration, or full repository build ran in Task
9. The static commands above are not cited as behavioral evidence.

## Review round 1 resolution

The distinct-model REST judge (`k3`, producer `openai/gpt-5`) returned two
critical findings and five warnings; the strict sycophancy screen passed at
`0.01785714365541935`.

- Restored the base Dart graph contract across agent/package/API guidance as a
  static non-test gate; the root script now forces `--skip-flutter`.
- Removed the misleading DevTools phrase from the version `3.0.1` pubspec
  description.
- Made custom ledger paths verify/write both Dart entries.
- Added an explicit fail-closed missing-ledger diagnostic to API generation.
- Corrected callback-return parsing so the private
  `void Function() _attachVmController(...)` declaration cannot create a
  phantom public `Function` ledger entry.
- Added machine-readable repository-only publication status to the DevTools
  ledger while preserving the source manifest version.
- Staged the new ledger/reference files so the second packet contains them.
- This verification surface carries the already-committed Task 8 receipt facts
  and source commit; the receipt itself remains immutable.
- The API report's combined Dart declaration count is intentional and carries
  per-library counts. `site/api-docs-baseline.json` covers only the 12 npm
  packages, so it has no Dart baseline entry to update.
- The modified legacy Node/Cucumber expectation files are synchronized to the
  source-derived 93/99 shape but intentionally not executed under the
  integration-only doctrine; they are not completion evidence.
- The canonical task title predates the immutable implementation-first rule.
  Its prohibited "targeted tests during work" clause was superseded; the one
  allowed analyzer check ran only after the complete implementation.

The final fresh-context review passed with zero critical findings, three
warnings, and one suggestion. Its strict sycophancy screen passed at `0.0`.
The warnings are resolved or recorded below:

- The next pub.dev release is explicitly blocked on a future ordinary-library
  assembled Flutter/Riverpod gate in `v3-devtools-release-certification`; the
  controller gate does not substitute for it.
- This verification and the refiner persistence record now name iteration 3
  and the completed review.
- The current 93/99 surface has no public nullable/nested callable-return
  declaration and is fully present in dartdoc. The reviewer’s future-parser
  limitation is recorded, but speculative parsing code was not added.
- Publication status now derives from the checked-in pub.dev registry snapshot
  and its explicit included-public-libraries list rather than a hardcoded
  archive version.

## Publication boundary

This verification does not publish a package. The repository controller source
postdates the pub.dev `3.0.1` archive, the separate Flutter DevTools extension
UI remains pending, and immutable release certification belongs to the later
phase.
