# Task 6 — isolated-review remediation

Date: 2026-08-04
Change: `v3-tauri-universal-example`
Disposition: **CORRECTED; NEW ISOLATED REVIEW REQUIRED**

## Delta

The first isolated diff review returned `BLOCK` with three critical findings
and one warning. Two critical findings were valid native credential-boundary
defects; the warning identified stale iOS generator version metadata. The
remaining critical finding compared a stale generated revision-98 projection
to signed revision 122 and is reconciled in `task-6-kbd-control-plane.md`
without editing either authority source.

Running XcodeGen during correction exposed one additional observed defect:
the generator source did not retain the registered deep-link URL scheme.

The second review correctly found that the temporary generated Xcode project
did not update the checked-in pbx artifact. The third review correctly found
that a generic IPC error could masquerade as an authorization denial. Its
other critical recommendation would have duplicated canonical graph entities
inside the platform store: repository architecture instead permits hooks to
read the canonical graph store while requiring platform intents to pass
through the platform store and service.

The fourth review found that initialization parsed the durable queue only after
graph hydration and that the corrected source lacked current Android/iOS proof.
Cycle 5 corrected both. The fifth review then found the same validation-order
defect in manual `restore()`. A linked refiner continuation corrects that path
and binds the current-source receipt to the reviewed source bundle.

The sixth review found two packet-inventory omissions: it inferred that the
Android wrapper JAR and iOS resources were absent because binary and raster
paths were excluded from the review tree. The wrapper JAR, storyboard, and
asset catalog are tracked and hashable. The source-empty iOS `assets/` directory
is created by Tauri before Xcode copies the web bundle. A credential-scrubbed
proof run removed that directory before invocation and still produced the iOS
simulator bundle. The verifier now checks the tracked resources and the
generated-assets project declaration so the contract is machine-visible.

## Corrections

- Android Gradle removes `CARGO_REGISTRY_TOKEN`, `NPM_TOKEN`, and
  `NODE_AUTH_TOKEN` before invoking the Tauri child process.
- The iOS generator source and checked-in Xcode build phase unset the same
  variables before invoking Tauri/Cargo.
- XcodeGen owns `CFBundleShortVersionString` and `CFBundleVersion` at `0.0.1`.
- XcodeGen owns the `prometheus-entity` URL scheme, so plist regeneration
  cannot silently remove it.
- Generated native archives are not enumerated as application resources.
- Capability proof accepts only the exact observed `graph_clear` and
  `graph_remove_entity` command/permission pairs; transport and other-command
  errors fail.
- Architecture evidence and verification distinguish canonical graph-store
  reads in hooks from forbidden hook-to-service calls.
- Both initialization and manual restore validate the persisted queue before
  graph hydration; malformed input leaves entities and lists empty.
- The source verifier cryptographically binds the current receipt to the
  reviewed runtime and mobile generators.
- The source verifier requires the tracked Gradle wrapper JAR, iOS launch
  storyboard and asset catalog, plus the project declaration for Tauri's
  generated iOS web assets directory.

The seventh review exposed a final authorization-evidence omission: the main
capability withholds both destructive clear and destructive removal, but the
runtime proof invoked only clear. The UI/service/native host now invoke and
exactly classify both denied commands, and the current Android receipt retains
both native error strings.

The eighth review found two additional fail-closed defects. Capability denial
classification used substring matching, so a prefixed or suffixed transport
message could masquerade as the exact native authorization result. Persisted
queue validation also accepted well-shaped entries for unknown task IDs before
hydration. The classifiers now require exact equality with the two observed
native messages, and queue parsing requires membership in the known seed-task
set before either initialization or restore can hydrate the graph.

The ninth review found one remaining persisted-queue integrity gap: a known
task could still be restored with a forged mutation ID, noncanonical timestamp,
or duplicate queued entry. Queue parsing now requires
`task-status:<known-task-id>`, an exact ISO timestamp round trip, and one queued
mutation per task before graph hydration.

## Verification

- Universal source verifier: 8/8 pass.
- Release source-contract tests: 22/22 pass.
- Application units: 11/11 pass; TypeScript and scoped ESLint pass.
- Stable-Rust mock host: 3/3 registered-command and exact clear/remove denial
  tests pass offline with registry credentials removed.
- Gradle 8.14.3 compiles the modified Android `buildSrc` task.
- XcodeGen regenerates the checked-in project whose Rust build phase contains
  the credential unset and stable-toolchain command; no `libapp.a` resource is
  added; plist version and URL scheme pass.
- Coverage: 13/13 semantics and 15/15 contract tests.
- Release contract: 16/16 tests.
- Skills/export ledgers: React 203; sync 16; A2UI 18+9; A2A 30+2; Tauri
  26/57; Dart 81.
- Strict active-change OpenSpec and Changesets pass.
- All 18 task-5 and 5 current task-6 retained platform artifacts remain
  hash-identical to their respective receipts (23/23).
- Signed KBD revision 122 records 6/6 tasks and aggregate 31/53.
- Remote `main` remains the frozen React RC SHA; npm `next` remains absent.
- Current source builds the optimized arm64 macOS application and DMG, Android
  API 36 arm64 APK, and iOS 26.5 arm64 simulator app. Android and iOS were
  installed and launched again; Android proves the exact clear and removal
  denial pairs.
  Hashes are recorded in `task-6-current-source-build.md` and
  `task-6-current-mobile-evidence.json`.
- A second iOS T3 proof removed the empty generated `assets/` directory before
  invocation; Tauri recreated it, Xcode copied it, and the simulator bundle
  completed. The tracked wrapper JAR, storyboard, and asset catalog were also
  checked directly.

The task-5 native runtime artifacts retain their exact source and historical
scope. The task-6 receipt separately proves current macOS build output, current
Android emulator runtime/denial, and current iOS simulator runtime. Neither set
is relabeled as physical-device, signing, distribution, or publication proof.
