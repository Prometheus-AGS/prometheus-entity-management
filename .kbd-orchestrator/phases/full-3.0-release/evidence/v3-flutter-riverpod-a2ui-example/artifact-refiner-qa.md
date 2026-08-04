# Artifact-refiner QA — `v3-flutter-riverpod-a2ui-example`

Date: 2026-08-04

Artifact: `v3-flutter-riverpod-a2ui-example-archive-qa`

Refinement ID: `bb5be8db-9709-4fcf-86c9-3f7c59a9ad79`

Prior cycle: `4ffe7ac2-7028-42d2-ab7d-57c5eb71ffc8`
Verdict: **PASS — 8/8 BLOCKING CONSTRAINTS SATISFIED**

## Delta evaluated

Task 4 correctly kept Flutter coverage partial until stable host and platform
evidence existed. Task 5 then passed Flutter 3.44.8 generation, formatting,
analysis, 70 package tests, 25 showcase tests, three stable goldens, Pub dry
run, root CI, and one smoke flow on each of an iOS simulator and Android API 35
emulator. Task 6 promotes only the showcase, CRUD, visual, and platform claims
that evidence supports.

Durable persistence remains partial. Physical-device behavior, native
assistive-technology certification, hosted integrations, registry authority,
universal Tauri, and stable 3.0 remain explicitly outside this change.

## Constraint results

| Constraint | Result |
| --- | --- |
| Every bounded acceptance criterion has direct current evidence | Pass |
| Stable host and both platform smoke receipts remain intact | Pass |
| Three stable golden hashes match and accessibility scope is truthful | Pass |
| One normalized graph and fail-closed A2UI policy boundary remain intact | Pass |
| Coverage, provenance, Dart ledger, skills, docs, Changesets, and OpenSpec agree | Pass |
| Durability, device, GenUI, and hosted-service exclusions remain explicit | Pass |
| Frozen React `3.0.0-rc.1` source remains unchanged on remote `main` | Pass |
| No npm, pub.dev, app-store, physical-device, durable-storage, or GA overclaim | Pass |

## Deterministic validation

- Example coverage: 13/13 semantic scenarios, 16/16 capabilities, 16/16
  stable artifacts, four implemented showcases, one planned showcase,
  `in-progress`, and `releaseCertified: false`.
- Flutter source provenance: pass.
- Focused release regressions: 45/45 pass, including both hosted platform
  workflow working-directory assertions.
- OpenSpec strict validation: pass.
- Diff hygiene: pass.
- Retained hashes: task-5 receipt, three stable goldens, coverage, and
  provenance all match.
- React-first release lane: remote `main` remains
  `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`; no registry state changed.

## Persistent state

The cycle-3 validated state is under
`.refiner/artifacts/v3-flutter-riverpod-a2ui-example-archive-qa/`, checkpoint
`1e52c7ac`, with finalized history at
`.refiner/history/v3-flutter-riverpod-a2ui-example-archive-qa/2026-08-04_01-18-40Z/`.

Cycle 1 was rejected because the branch projection paired 6/6 tasks with a
pending change and the generic packet hid `.github` plus the task-5 A2UI
code/test commit. Cycle 2 corrected the real projection defect and explicitly
bound the omitted tracked/prior-commit evidence. The A2UI package suite passes
26/26.

Cycle 2 then found that the reusable hosted workflow ran the smoke test from
the repository root. Cycle 3 makes Android and iOS execute from the Flutter
showcase package and adds a regression for both lanes. The complete focused
release set now passes 45/45.

The deterministic gate permits fresh isolated adversarial review. It does not
authorize archive by itself.
