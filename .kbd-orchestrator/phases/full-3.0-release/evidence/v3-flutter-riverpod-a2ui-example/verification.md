# Verification — `v3-flutter-riverpod-a2ui-example`

Date: 2026-08-21  
Verdict: **PASS TO ARCHIVE — device-runtime receipts, pub.dev publication, and
the wider 3.0 release remain uncertified**

## Acceptance-to-evidence matrix

| Phase-plan requirement | Direct evidence | Result |
| --- | --- | --- |
| `dart analyze` passes | `dart analyze --fatal-infos --fatal-warnings` clean in the example and across the Melos workspace | Pass |
| Flutter tests pass | 29/29 example tests (8 policy unit, 5 protocol, 5 adapter/offline, 7 app widget, 2 golden, harness checks) plus the package's 70/70 via `pnpm run dart:test` | Pass |
| Golden/widget tests pass | Pinned phone (390×844) and tablet (1024×800) goldens with the package's 0.0005-tolerance cross-platform comparator; Linux variants auto-selected on Linux | Pass |
| Android/iOS smoke lanes pass | `flutter build apk --debug` → `app-debug.apk`; `flutter build ios --simulator --no-codesign` → `Runner.app` (Xcode 26.6, Android SDK present) | Pass (compile smoke) |
| Malformed or unapproved A2UI actions fail closed | `A2uiActionPolicy` unit tests (missing name, non-map context/data, unknown action, tenant mismatch, non-allowlisted fields, `task.delete`) plus protocol replay through the rendered surface | Pass |
| Coverage manifest satisfied | `verify:example-coverage` green; showcase + three capability entries implemented | Pass |

## Plan-detail coverage

- **Generated Riverpod providers + consolidated graph**: the task list runs
  `entityListProvider` (hybrid), the header `entityProvider`, tiles/detail the
  `entityCrudProvider`; all reads rejoin the canonical `EntityGraph` and writes
  flow through it. Cross-view propagation is proven by the detail-sheet save
  and realtime-burst widget tests.
- **Official `genui` protocol handling**: `SurfaceController` +
  `BasicCatalogItems.asNoAssetCatalog()` (genui 0.10.1 / a2ui_core 0.1.0, both
  pinned). The app emits deterministic v0.9 messages; the pinned JSON fixture
  `test/goldens/a2ui-surface-messages.json` guards drift.
- **Safe widget/action catalog (cand-009 adapt)**: app-owned fail-closed
  `A2uiActionPolicy` — allowlist `task.update`, approval-gated `task.replace`,
  intentionally unlisted `task.delete`, tenant matching, malformed rejection.
  No second protocol parser exists.
- **Optimistic/offline CRUD**: checkbox toggle confirms through the graph;
  `failNextUpdate` injection proves exact rollback; the offline demo merges
  two clients' disjoint writes with zero conflicts and matching reload.
- **Relationships + realtime invalidation**: `Task → Project` filter joins;
  a three-event burst coalesces to one event per entity before a single flush.
- **Accessibility + states**: semantics labels on the header, tiles, agent
  state, and loading indicator; loading/error/empty lanes all tested (the
  error lane covers the provider's self-healed `snapshot.error` path).
- **Optional Rust transport demo**: the platform page documents the
  `FfiEntityTransportAdapter` seam as not-linked; it never owns graph data.
- **Adapter boundary**: `DemoPersistenceAdapter` allows exactly
  `loadGraph`/`saveGraph`; `deleteAll` throws `AdapterDeniedError`; patches
  never cross the persistence boundary (tested).

## Platform and manual limits (retained, not waived)

- Smoke evidence is **compile-level** (`apk --debug`, `ios --simulator
  --no-codesign`). No booted emulator/simulator/device was driven; on-device
  runtime receipts remain a manual limit for the release-certification change.
- Golden baselines were recorded on macOS (host platform). The golden test
  selects `linux-` prefixed variants automatically on Linux runners, mirroring
  the package precedent.
- Evidence is **source-workspace** scoped:
  `countsAsPackedPackageEvidence: false`. Dart packages are not packed for
  pub.dev in this phase; packed/publication proof belongs to
  `v3-release-certification` and `v3-stable-publication`.

## Receipts

- `verification.json` — verifier report: commands, lane results, version pins,
  scenario IDs, golden/fixture SHA-256 hashes, platform limits.
- Gate commands: `pnpm run verify:flutter-riverpod-a2ui`,
  `pnpm run test:v3-flutter-riverpod-a2ui-example` (8/8),
  `pnpm run bdd:flutter-riverpod-a2ui` (3 scenarios / 17 steps),
  `pnpm run verify:example-coverage`, `pnpm run dart:format`,
  `pnpm run dart:analyze`, `pnpm run dart:test`.

## Notable defects found during implementation (fixed)

1. Provider-family fork: lambda `toGraph` closures created a new family key
   per rebuild, spawning unbounded provider instances (perpetual loading).
   Fixed with canonical static `encode` tear-offs on the demo models.
2. Auto-dispose CRUD controller: `ref.read(...)` between tap and save used a
   disposed ref. Fixed by watching `.notifier` in the tile build (the package
   test's keep-alive pattern).
3. Fake-clock zone trap: constructing the A2UI runtime in `setUp` stranded
   broadcast-stream continuations outside the widget test's fake zone; the
   receipt append landed after test resumption. Fixed by constructing the
   runtime inside the test body and polling receipts.
4. Conflict merge kept client A's value instead of the base on genuine
   conflicts. Fixed to restore the base value (fail-safe).
