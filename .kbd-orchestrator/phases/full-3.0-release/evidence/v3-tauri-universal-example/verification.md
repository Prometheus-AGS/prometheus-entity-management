# Verification — `v3-tauri-universal-example`

Date: 2026-08-04
Implementation source through platform certification: `0de1e81`
Verdict: **PASS — IMPLEMENTATION COMPLETE; FINAL REFINER/ISOLATED REVIEW AND ARCHIVE PENDING**

## Acceptance matrix

| Plan or OpenSpec criterion | Authoritative evidence | Result |
| --- | --- | --- |
| One shared React 19/Vite 8 application targets desktop, Android, and iOS | `examples/tauri-universal`, generated Android/Xcode projects, and task-2 implementation receipt | Pass |
| Platform conditionals stay at the adapter boundary | Component import scan, platform service, source verifier, and 11 application tests | Pass |
| Normalized graph and ID-only lists remain canonical | Browser list/detail flow, unit tests, package singleton contract, and task-2 architecture receipt | Pass |
| Native persistence and offline restart/reconnect work | Packaged macOS SQLite/IPC process-restart flow plus browser durable-queue restart/convergence flow | Pass |
| Relationships, realtime coalescing, lifecycle, and deep links are represented | Five browser flows, source verifier, and fail-closed deep-link tests | Pass |
| Desktop build and command E2E pass | Packaged macOS application proves real SQLite, allowed IPC, destructive-clear denial, queued mutation, termination/relaunch restoration, and reconnect | Pass |
| Android build/smoke evidence is recorded | Android 16 API 36 arm64 emulator build, install, native runtime, and exact destructive-clear/removal denials | Pass |
| iOS build/smoke evidence is recorded | Unsigned iPhone 17/iOS 26.5 arm64 simulator archive, install, and runtime | Pass |
| Responsive and accessible desktop/mobile layouts are evidenced | Five Chromium screenshots/traces; 390x844 mobile projection; zero serious or critical axe findings | Pass |
| Public API, coverage, skills, and documentation agree | All five showcases are implemented; Tauri ledger remains 26 runtime/57 declarations; docs and skill references point to the retained receipts | Pass |
| No mandatory lane is silently skipped | Task-5 clean receipt names every executed lane and the explicit Windows/Linux, physical-device, signing, assistive-technology, and publication limits | Pass |
| Actual trust boundaries fail closed | Withheld destructive-clear/removal permissions, persisted queue validation, and scheme/tenant/route/entity deep-link policy reject before graph mutation | Pass |

## Reproducible evidence

- `task-5-platform-evidence.json` is the hash-bound native-platform receipt;
  SHA-256 `afe1f5e69f11d5a209571d67bd1bb6f2f000c914fbba44c4b9539bf9c8f85c7a`.
- `task-5-browser-evidence.json` is the source-workspace browser receipt;
  SHA-256 `032ada9cfaff174bca4d87451fb44f66412193ced5b3d58cb1c60bcb444e2322`.
- `task-5-clean-gates.md` records the complete clean command matrix;
  SHA-256 `532034414899ef89f3612e6a6a1b8838e6eebb633ab2ed96e2a90f945d74764d`.
- `examples/coverage.json` records all five requested showcases as
  `implemented` while keeping aggregate release coverage `in-progress`;
  SHA-256 before this final report
  `3563a35b7ea4d263f65e2cac4c85d2dd58a4f4c5cfd9ce91a75a2a361d337dc1`.
- `prometheus-entity-skills/_shared/references/tauri-library-exports.json`
  remains byte-identical at SHA-256
  `0fafac67edab3a10f678f9d4f172e2d4b39c360411359a7d8f77bae12ad3435d`.

The implementation spans commits `3429d4e` through `0de1e81`, based on
`ee63a96`. The task-5 platform receipt binds the packaged macOS executable,
Android APK, unsigned iOS simulator executable, thirteen native/browser
screenshots, and five Playwright traces to their SHA-256 values.

## Clean gate result

The final implementation gate passed a frozen offline pnpm install across all
17 workspaces; application and package typechecks; 11 application tests; 22
rejection-aware source-contract tests; 16 Tauri package tests; Vite and Tauri package builds;
the 26/57 export ledger; npm pack dry-run; 3 stable-Rust native tests; the
8-check universal-example verifier; 15 coverage tests and 4/27 coverage BDD;
16 release-contract tests and 5/32 release BDD; aggregate skill verification;
Changesets; strict OpenSpec; diff hygiene; and the production security audit.
The audit resolved 334 production dependencies with two low findings and zero
high, critical, or blocking advisories.

## Observed corrections

- The public list facade now normalizes omitted pagination metadata to the
  Rust IPC payload's required `null`, `null`, and `false` values. An exact
  invoke-payload regression and `.changeset/fix-tauri-list-ipc.md` retain the
  fix for a later coordinated prerelease.
- Generated mobile build phases now force stable Rust after the machine's
  default nightly reproduced a Tokio compiler internal error.
- The private example uses buildable application version `0.0.1`; Tauri had
  rejected `0.0.0` for Android.
- Browser restart now restores both the durable mutation queue and the
  operator-selected offline mode before reconnect convergence.
- Isolated review found that generated Android and iOS child processes still
  inherited registry credentials. Both now remove `CARGO_REGISTRY_TOKEN`,
  `NPM_TOKEN`, and `NODE_AUTH_TOKEN`; Gradle compiles the Android task and
  XcodeGen emits the sanitized iOS phase.
- The same correction synchronizes XcodeGen version metadata at `0.0.1` and
  preserves the `prometheus-entity` URL scheme. The checked-in Xcode project is
  regenerated with the sanitized script and excludes native archives from
  application resources. The expanded source contract passes 22/22
  rejection-aware tests, including initialization and manual-restore queue-
  before-hydration, current-source bundle binding, and current-mobile-evidence
  rejection cases.
- Capability-denial proof now accepts only exact equality with the observed
  graph-clear and graph-remove command/permission pairs; prefixed, suffixed,
  transport, and other-command failures are rethrown. Persisted queue entries
  must reference a known seed task, use its canonical mutation ID, carry a
  canonical ISO timestamp, and appear only once before graph hydration. The
  11/11 service suite locks those boundaries, and current source builds an optimized
  arm64 macOS application plus DMG.
- Architecture evidence now states the actual two-store contract: hooks read
  the canonical graph store and submit intents through the platform store;
  only the platform store calls the service. Moving entity reads into the
  platform store would duplicate the one graph and is intentionally rejected.

## Explicit limits

- macOS is the executed desktop lane; Windows and Linux bundles were not run.
- Android evidence is an API 36 emulator receipt, not physical-device proof.
- iOS evidence is an unsigned simulator receipt, not physical-device or
  distribution-signing proof.
- Native assistive-technology and app-store certification are not claimed.
- The browser receipt is not native-platform evidence; native claims come only
  from the separately hash-bound platform receipt.
- Registry ownership, npm publication, GitHub Release, app-store publication,
  and movement of npm `latest` remain outside this change.
- The exposed Cargo registry credential described in the redacted postmortem
  must be rotated by its external owner; no credential is retained in these
  evidence artifacts.
- Complete skills, Docusaurus/Pages, aggregate release certification, and
  stable 3.0.0 promotion remain downstream changes.

These are explicit exclusions, not silently skipped acceptance criteria.

## React-first release lane

This continuation does not modify the frozen React `3.0.0-rc.1` source on
remote `main` at `1c40eaa08da210cbe3e20a77c5db211712b5c3a1`. The independently
successful rehearsal remains eligible for npm `next` once npm trusted-publisher
authority is configured and the protected environment is approved. This
continuation's Tauri patch Changeset belongs to a later coordinated
prerelease; it does not rewrite the immutable `rc.1` candidate.

## Remaining closure gates

Artifact-refiner cycle 5 passed all eight blocking constraints after four
isolated review cycles corrected native credentials, the canonical generated
project, denial-proof classification, persisted-queue validation order, and
current-source mobile evidence. The fifth review then found a remaining manual
restore path that hydrated before parsing the queue. Refiner continuation cycle
1 corrects that path, adds a 9th unit and rejection-aware source checks through
the 19th contract test, binds the receipt to the reviewed runtime/generator
sources, and rebuilds/reruns current macOS, Android, and iOS targets. All 23
retained artifacts match their refreshed receipt hashes, and strict
active-change OpenSpec validation passes. The seventh review required proof for
both withheld destructive commands; current Android execution now retains exact
clear and removal denials. The eighth review then found substring denial
classification and acceptance of unknown persisted task IDs; exact equality
plus known-ID validation now fail closed before hydration. The ninth review
then found that a known task could still use a forged mutation ID, malformed
timestamp, or duplicate queue entry. Canonical ID/timestamp and one-entry-per-
task validation now fail closed before hydration, with 11/11 units and 22/22
rejection-aware contracts. Final specification synchronization, isolated
full-diff review, and archive are still required. Blocked reviews remain audit
history and cannot certify archive.
