# Task 4 — Dart ledgers, coverage, skills, and documentation

## Outcome

The declared Dart surface now matches the implemented library. A mechanical
ledger discovers 81 public declarations from the package barrel and its
generated Riverpod part. Package, release, skill, architecture, changelog, and
coverage guidance now use the Riverpod 3 contract and retain explicit limits.

## Synchronized artifacts

| Surface | Artifact |
| --- | --- |
| Mechanical API ledger | `prometheus-entity-skills/_shared/references/dart-library-exports.json` |
| Ledger verifier | `scripts/dart-public-api-contract.mjs` |
| Package guide | `packages/entity_graph_flutter/README.md` |
| Release boundary | `release/dart-graph-riverpod.md` |
| Agent guidance | `prometheus-entity-skills/_shared/references/dart-graph-riverpod.md` |
| Skill indexes/rules | `prometheus-entity-skills/SKILL.md`, `SKILLS.md`, `_shared/references/architecture-rules.md`, `library-api.md` |
| Operator guidance | `RELEASING.md`, root/release READMEs, changelogs |
| Machine-readable evidence | `examples/coverage.json` |
| Persistent research | `.research/v3-dart-graph-riverpod/declared-surface-observation.md` and updated research graph/report/Feynman artifacts |

## Corrected drift

The package README previously installed `flutter_riverpod ^2.6.1`, described an
obsolete notifier chain, and mentioned Freezed generation despite the 3.0
package using generated Riverpod 3 families with no Freezed/JSON annotations.
The corrected guide covers graph ownership, providers, views, optimistic CRUD,
retry, realtime invalidation, optional FFI, generation, tests, and exclusions.

## Sycophancy correction

Coverage marks only evidenced Dart claims implemented. Normalization, global
patches, optimistic CRUD, local/remote/hybrid views, transport invalidation,
optional FFI, and the scoped widget harness have receipts. Relationship cascade
invalidation, realtime coalescing, offline persistence, the complete
Flutter/A2UI app, Android/iOS, accessibility, registry authority, and stable
promotion remain partial or planned.

## Feynman check

The code is the building, behavioral tests are the inspection, and the public
ledger/docs are the occupancy map. The map now lists every public door and
does not draw unbuilt rooms. This explains why an 81-name source ledger and
truthful coverage exclusions are both part of correctness.

## Verification

| Command | Result |
| --- | --- |
| `pnpm run refresh:dart-exports` | Pass; wrote 81 declarations |
| `pnpm run verify:dart-exports` | Pass; source and ledger match |
| `pnpm run verify:example-coverage` | Pass; 13 scenarios, 16 capabilities, 16 artifacts, release remains in progress |
| `pnpm exec eslint ... --max-warnings 0` | Pass for the Dart verifier and changed release test/steps |
| `pnpm run verify:dart-graph-riverpod -- --skip-flutter` | Pass; structural ledger/docs/coverage contract |
| `pnpm run verify:skills` | Pass; React 201, sync 16, A2UI 18/9, A2A 30/2, and Dart 81 ledgers match |
| `pnpm run verify:dart-graph-riverpod -- --report .../task-4-dart-report.json` | Pass; full Flutter suite and synchronized declared surface |
| `pnpm run test:dart-graph-riverpod` | Pass; 4 Node tests plus permanent Flutter suite, including fail-closed ledger drift |
| tagged Cucumber with `task-4-cucumber.json` | Pass; 7 scenarios, 22 steps |
| `pnpm exec openspec validate v3-dart-graph-riverpod --strict --no-interactive` | Pass; change valid |
| `git diff --check` | Pass |

## Limits retained for later tasks

- Task 5 owns clean stable-SDK, full Dart/Melos, Pub archive, and repository
  gates; this task does not relabel the known dirty-state Pub warning.
- Task 6 owns final evidence reconciliation and archive.
- Pub.dev ownership/publication, the full showcase, devices, accessibility,
  docs deployment, release certification, and promotion remain later changes.
