# Verification — `v3-flutter-riverpod-a2ui-example`

Date: 2026-08-04
Implementation source through stable platform gates: `99d97c2`
Verdict: **PASS — VERIFIED, SPEC-SYNCED, AND ARCHIVED**

## Acceptance matrix

| Plan or OpenSpec criterion | Authoritative evidence | Result |
| --- | --- | --- |
| Branded Flutter example uses generated Riverpod and one canonical graph | `examples/flutter-riverpod/lib`, generated controller tests, and task-2 implementation receipt | Pass |
| Official GenUI handling remains behind a safe catalog/action boundary | Exact `genui 0.10.1` pin, atomic JSONL preflight, policy tests, hostile fixture, and both platform smoke runs | Pass |
| Optimistic/offline CRUD, relationships, realtime, and invalidation work | Stable controller/widget tests cover confirmation, exact rollback, create/delete, list moves, queued sync, reconnect, and typed changes | Pass |
| Loading, error, empty, responsive, and accessible states are rendered | Stable widget suite and three regenerated phone/tablet goldens pass | Pass |
| Flutter stable host gates pass | Flutter 3.44.8 / Dart 3.12.2 pass generation, formatting, analysis, 70 package tests, and 25 showcase tests | Pass |
| Android and iOS smoke lanes pass | One shared smoke test passes 1/1 on iPhone 17/iOS 26.5 simulator and Android API 35 AOSP ATD arm64 emulator | Pass |
| Coverage, skills, docs, and package ledgers agree | Flutter showcase is `implemented`; platform/CRUD evidence is implemented; in-memory sync remains explicitly partial for durable persistence; Dart ledger remains 81/81 | Pass |
| No mandatory lane is silently skipped | Task-5 receipt records pnpm, Dart/Melos, package, security, OpenSpec, Android, iOS, and the non-applicability of a Flutter-owned Cargo build | Pass |
| Trust boundaries fail closed | Unknown components/actions, client functions, tenant/task mismatch, unapproved archive, delete, and graph-ownership violations are rejected | Pass |

## Reproducible evidence

- `task-5-clean-gates.md` — stable host, package, root CI, security, iOS,
  Android, and applicability receipt; SHA-256
  `d5cf2ada0f76bdaed20cf00e9db7f031d45e6f74668219f39e31021bd63adc1b`.
- `showcase-phone-entity.png` — stable phone graph baseline; SHA-256
  `9d5a7bc3c0b847d9f1e52cfa262c82c5e5e186a479f5d7b20e01d10377922bd5`.
- `showcase-tablet-entity.png` — stable tablet graph baseline; SHA-256
  `6acb25a55610a86e74093e3a27ff900f1e733bd02baeff6104ec185ed017fe8d`.
- `showcase-phone-a2ui.png` — stable phone A2UI baseline; SHA-256
  `7206f21d6672836ae6b2483aa81e508160939d7485e68221c62fc5227c11eac5`.
- `integration_test/mobile_smoke_test.dart` — shared Android/iOS smoke flow.
- `.github/workflows/flutter-example-platform.yml` — repeatable stable-SDK
  platform workflow surface; the file itself is not presented as a hosted-run
  receipt.
- `examples/coverage.json` — implemented Flutter showcase with explicit
  evidence paths; SHA-256 before this final report
  `10d9c651b7751d1c21ae21f053268506233bbb80ead52fa0bdddac86b7d3b777`.

The task-5 clean detached snapshot was
`e70c64b8f6740b4709d80b0ad7fe9cc9f5738d1a`, derived from continuation commit
`3316ea50c99939911cbeddde0c3bd1e168d43138`; its corrections are committed as
`99d97c27feeef12b6839ed1b302e33eb41bd1af6`.

## Closure-ledger correction

Task 4 intentionally left the showcase `partial` until the stable and platform
gates ran. Task 5 satisfied those gates. Task 6 therefore promotes the Flutter
showcase runtime and visual evidence, plus its CRUD and platform capability
evidence, to `implemented`. The Flutter evidence under
`graph.offline-persistence-sync` remains `partial` because the example queue is
in memory and does not claim durable persistence. Overall example coverage
remains `in-progress` because the universal Tauri showcase is planned.

The stable gate also exposed a caller-ownership defect in the publishable A2UI
runtime. Parsed messages are now cloned independently for preflight and
official processor commit, and a regression asserts that later data-model
updates do not mutate the caller fixture. A patch Changeset records that
behavioral correction for a later coordinated prerelease.

## Explicit limits

- Platform smoke uses a simulator and emulator, not physical devices.
- Native assistive-technology certification is not claimed; host semantic
  assertions and stable goldens are the accessibility evidence for this change.
- The deterministic offline queue is in memory; durable persistence is not
  part of this showcase.
- Hosted REST, GraphQL, realtime, and external-agent services are not exercised.
- GenUI remains exact-pinned and experimental rather than a stable public
  Prometheus package surface.
- The optional FFI demonstration is an interface boundary; no Rust runtime or
  `flutter_rust_bridge` dependency is bundled.
- pub.dev, app-store, and npm publication authority are not established by this
  change.
- Universal Tauri, the complete Docusaurus/Pages product, aggregate release
  certification, and stable registry promotion remain downstream.

These are explicit exclusions, not silently skipped acceptance criteria.

## Quality-gate boundary

Artifact-refiner cycle 3 passed all 8/8 blocking constraints under refinement
ID `bb5be8db-9709-4fcf-86c9-3f7c59a9ad79`, checkpoint `1e52c7ac`.

The isolated adversarial review required three cycles. Cycle 1 rejected the
6/6-task/pending-change projection and an incomplete review packet. Cycle 2
then found a real hosted-workflow defect: both mobile smoke commands resolved
the Flutter package but ran `flutter test` from the repository root. The final
workflow changes directory into `examples/flutter-riverpod` for Android and
uses that package as the iOS step's `working-directory`; a focused regression
rejects the old paths. Cycle 3 passed with 0 critical findings and 0 warnings,
and the strict sycophancy screen passed with score 0.0.

After that correction, the complete root CI gate passed 90/90 BDD scenarios,
428/428 steps, and all validation, lint, typecheck, build, package, skill, and
security gates. It resolved 332 production dependencies with zero blocking
advisories and two low advisories. The first root-CI attempt correctly rejected
generated Flutter build/native-asset output left by device verification; a
stable `flutter clean` removed only that generated output, and the clean rerun
passed.

The main specification was synchronized and all 17 promoted OpenSpec
specifications pass strict validation. Because the same-named main spec already
existed, the wrapper's ambiguous shorthand could not distinguish the active
change from the promoted spec. Explicit change validation with `--type change`
passed, and the already-synchronized change archived with `--skip-specs` at
`openspec/changes/archive/2026-08-04-v3-flutter-riverpod-a2ui-example/`.

This closes the bounded Flutter change only. Overall 3.0 implementation,
release certification, and publication remain active.
