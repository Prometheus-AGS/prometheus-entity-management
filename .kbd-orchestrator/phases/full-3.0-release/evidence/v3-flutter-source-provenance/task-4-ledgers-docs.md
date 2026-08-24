# Task 4 release-ledger, public-API, skill, and documentation receipt

## Outcome

The release coverage ledger now records `release.flutter.source-provenance` as implemented and attaches implemented documentation evidence to `platform.flutter-riverpod`. The same capability keeps the `v3-dart-graph-riverpod` platform evidence and `v3-flutter-riverpod-a2ui-example` visual evidence planned. Overall release coverage remains `in-progress`, all five showcases remain planned, and publication remains blocked.

## Public API impact

Impact is explicitly `none`. This change imports non-buildable history and changes no runtime entry point. The React, sync, A2UI, and A2A export ledgers were inspected and intentionally not rewritten. `pnpm run verify:skills` passed with 201 React, 16 sync, 18 A2UI root, 9 A2UI compatibility, 30 A2A root, and 2 A2A legacy runtime exports matching their existing ledgers.

The provenance verifier now rejects `provenance` or `knowme` exposure from any of those four ledgers and from `pnpm-workspace.yaml`.

## Documentation and skill surfaces

Added the canonical maintainer guide at `release/flutter-source-provenance.md` and the shared agent reference at `prometheus-entity-skills/_shared/references/flutter-source-provenance.md`. Updated root release status, release index, operator guide, examples status, canonical Flutter package README, skill catalog, 3.0 skill contract, and architecture rules.

Every surface preserves the same boundary:

- `packages/entity_graph_flutter` is the sole canonical Dart graph package;
- `provenance/imports/knowme-flutter` is non-buildable, non-workspace, and non-public;
- source lineage does not certify Dart/Riverpod behavior, Flutter rendering, Android/iOS, accessibility, pub.dev authority, docs deployment, or stable 3.0.0 promotion.

## Verification

Passed:

```text
pnpm run verify:flutter-source-provenance
pnpm run test:flutter-source-provenance          # 12 tests passed
pnpm run bdd:flutter-source-provenance           # 14 scenarios / 56 steps passed
pnpm run verify:example-coverage                 # 13/13 semantic scenarios; releaseCertified false
pnpm run test:example-coverage                   # 14 tests passed
pnpm run verify:skills                           # all four public export ledgers match
pnpm exec openspec validate v3-flutter-source-provenance --strict
git diff --check
```

Machine-readable receipts:

- `provenance-verification.json`
- `task-4-cucumber.json`
- `task-4-example-coverage-report.json`
