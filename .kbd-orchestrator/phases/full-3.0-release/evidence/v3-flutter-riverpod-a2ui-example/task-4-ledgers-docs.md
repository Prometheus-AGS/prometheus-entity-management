# Task 4 — Flutter coverage, ledgers, skills, and documentation

Date: 2026-08-03
Change: `v3-flutter-riverpod-a2ui-example`

## Outcome

The declared release surface now distinguishes `partial` Flutter showcase
evidence from both `planned` work and `implemented` platform certification.
This records the 25 passing host tests and three goldens without implying that
Flutter 3.44.8 stable, Android, or iOS has run.

`examples/coverage.schema.json` now admits `partial` showcase status. Both
coverage validators fail closed when a partial showcase has planned evidence
or when fully implemented evidence is mislabeled partial. The Flutter showcase
and its optimistic CRUD, offline/reconnect, and visual evidence entries are
partial with exact commands, paths, applicability, and remaining limits.
Overall coverage stays `in-progress` and `releaseCertified` stays false.

## Documentation and skill surface

Added:

- `release/flutter-riverpod-a2ui-example.md`;
- `prometheus-entity-skills/_shared/references/flutter-riverpod-a2ui-example.md`.

Updated the root release status, release index, examples index, runnable example
README, canonical Dart package README, skill catalog, architecture rules, and
sync evidence wording. All surfaces preserve one graph, generated-provider
orchestration, transport-owned I/O, atomic untrusted A2UI preflight,
application-owned authority, exact GenUI pinning, and the stable-SDK/device
exclusions.

## Public API ledger

The application adds no declaration under `packages/entity_graph_flutter/lib`
and no npm export. The checked-in Dart ledger therefore did not change.

- ledger SHA-256 before/after: `5767746555a24af4d7015eb79d1ed8c16bd773986594fcd6789e2af172243b81`
- `entity_graph_flutter@3.0.0`: 81 declarations match

## Verification

Passed:

- coverage JSON parse;
- `pnpm run verify:example-coverage` — 13/13 scenarios, 16 capabilities,
  16 stable artifacts, five showcases, no errors;
- 35 focused Node/Dart tests, including the permanent 70-test Dart package
  suite invoked by its existing test contract;
- `pnpm run verify:dart-exports` — 81 declarations;
- `pnpm run bdd:example-coverage` — 4 scenarios / 27 steps;
- `pnpm run bdd:flutter-source-provenance` — 14 scenarios / 56 steps;
- `pnpm run bdd:release-contract` — 5 scenarios / 32 steps;
- `pnpm run validate:release-contract` — 3 implemented, 1 partial, 1 planned;
- scoped ESLint for every changed JavaScript/TypeScript file;
- `openspec validate v3-flutter-riverpod-a2ui-example --strict`;
- documentation relative-link check;
- `git diff --check`.

The aggregate `pnpm run verify:skills` passed React (203), sync (16), A2UI
(18 + 9), and A2A (30 + 2) export ledgers, then stopped at the unrelated Tauri
package because `packages/entity-graph-tauri/dist/index.mjs` is absent. No
Tauri build was introduced into this bounded Flutter documentation task. The
directly affected Dart ledger and new Flutter skill links pass independently.

Prettier is not installed in this repository, so `pnpm exec prettier --check`
was unavailable. Project-native ESLint, JSON/schema validation, BDD, link, and
diff-hygiene gates were used instead.

## Release boundary

The React RC branch and remote `main` were not changed. This task authorizes no
registry publication. Flutter remains partial until task 5 proves the stable
SDK and native lanes; Tauri and full 3.0 certification remain downstream.
