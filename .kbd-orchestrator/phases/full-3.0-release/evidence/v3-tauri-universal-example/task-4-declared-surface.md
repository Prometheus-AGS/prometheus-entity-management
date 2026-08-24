# Universal Tauri example task 4 — declared surface evidence

Date: 2026-08-04
Change: `v3-tauri-universal-example`
Task: 4 of 6

## Coverage disposition

- Corrected the showcase path from nonexistent `examples/tauri-app` to
  `examples/tauri-universal`.
- Kept the showcase itself `planned`. Its runtime and visual evidence remain
  planned because clean desktop command E2E, browser visuals, Android/iOS
  application smoke, relationship invalidation, and realtime coalescing have
  not yet produced task-5 receipts.
- Added `partial` capability evidence for the observed browser-runtime durable
  queue/reload/reconnect tests under `graph.offline-persistence-sync`.
- Added `partial` capability evidence for the stable-Rust Tauri MockRuntime
  allowed-command and destructive-clear denial checks under `platform.tauri`.
- Added a fail-closed coverage regression proving the path, planned showcase
  status, and exact partial command ownership cannot silently drift.

This separates tested progress from showcase promotion. Test discovery,
generated mobile shells, and plugin-only device receipts are not treated as
full application evidence.

## Documentation and skill synchronization

- Added the example-local runbook at `examples/tauri-universal/README.md`.
- Added the release disposition at `release/tauri-universal-example.md`.
- Added the agent contract at
  `prometheus-entity-skills/_shared/references/tauri-universal-example.md` and
  linked it from both skill indexes.
- Updated the root and examples documentation maps with the real path, focused
  commands, evidence boundary, and remaining scenarios.
- Updated the sync reference with the observed browser-runtime queue/reload
  evidence while retaining native SQLite and full platform limits.
- Reconciled stale Tauri plugin prose with its existing hash-verified Android
  physical-device and iOS simulator receipts. Those plugin receipts remain
  explicitly separate from universal-application certification.
- Changed the root Rust test script to `cargo +stable` after task 3 observed a
  default-nightly Tokio compiler ICE. The locked application tests pass through
  the documented root command.

## Public API disposition

The example changes no package exports. The Tauri export ledger is byte
unchanged at SHA-256
`0fafac67edab3a10f678f9d4f172e2d4b39c360411359a7d8f77bae12ad3435d`.
Its verifier still reports 26 runtime exports and 57 declaration exports.
The aggregate skill gate also confirms the React, sync, A2UI, A2A, and Dart
ledgers remain current.

## Verification

| Command or check | Result |
| --- | --- |
| `pnpm run verify:example-coverage` | Passed; 13/13 scenarios, 16 capabilities, 16 stable artifacts, five showcases, coverage still in progress and uncertified |
| `pnpm run test:example-coverage` | Passed, 15/15 |
| `pnpm run bdd:example-coverage` | Passed, 4 scenarios / 27 steps / 6 hooks |
| `pnpm run test:release-contract` | Passed, 16/16 |
| `pnpm run bdd:release-contract` | Passed, 5 scenarios / 32 steps / 6 hooks |
| `pnpm run verify:skills` | Passed: React 203; sync 16; A2UI 18 + 9; A2A 30 + 2; Tauri 26 runtime/57 declarations; Dart 81 |
| `pnpm run test:tauri-universal:rust` | Passed, 2/2 under Rust stable |
| `pnpm run verify:tauri-universal` | Passed, 7/7 source checks; no platform-build claim |
| Focused ESLint | Passed with zero warnings |
| `openspec validate v3-tauri-universal-example --type change --strict` | Passed |
| Release-contract Markdown/link checks | Passed through the release BDD gate |
| `git diff --check` | Passed |

## Signed KBD boundary

`kbd-apply` completed task 4 at signed revision 116 and both `task:after`
hooks exited successfully. The runtime then reproduced the documented parent
projection reset; a typed transition restored `v3-tauri-universal-example` to
`in_progress` at revision 117 without changing the four completed task states.
Tasks 5 and 6 remain pending.

## Remaining boundary

- Task 5 owns clean browser execution, retained accessibility/screenshots/
  traces, packaged desktop command E2E, Android/iOS application build/smoke,
  and the still-mapped relationship/realtime application scenarios.
- Task 6 owns final evidence limits, release impact, QA/review, and archive.
- This task does not move remote `main`, publish npm `next`, change `latest`,
  configure app stores, or authorize stable 3.0.0.
