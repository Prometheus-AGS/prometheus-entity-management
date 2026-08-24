# Task 5 — clean verification and platform gates

**Recorded:** 2026-08-04T00:33:27Z
**Change:** `v3-flutter-riverpod-a2ui-example`
**Certification snapshot:** clean detached snapshot `e70c64b8f6740b4709d80b0ad7fe9cc9f5738d1a`, derived from continuation commit `3316ea50c99939911cbeddde0c3bd1e168d43138`

## Certified toolchain

- Flutter `3.44.8` stable, framework revision `058e0af2c2b57e369d905a03ac9748b0ebf543c6c`
- Dart `3.12.2`
- Node `26.5.0`
- pnpm `10.33.0`
- Xcode `26.6` (`17F113`)
- Android emulator `36.3.10.0`, API 35 AOSP ATD arm64 image

The Flutter archive checksum matched the official release checksum before use. The
workspace lock was reconciled against this stable SDK, and
`flutter pub get --enforce-lockfile` then passed without lock drift.

## Clean host gates

| Gate | Result | Evidence |
| --- | --- | --- |
| `pnpm install --frozen-lockfile` | PASS | Clean detached candidate installed with the root pnpm lock only. |
| `pnpm run dart:bootstrap:frozen` | PASS | Stable Flutter resolved the committed workspace lock without modification. |
| `pnpm run dart:ci` | PASS | Generation wrote zero outputs on the verification rerun; format and analysis were clean; `entity_graph_flutter` passed 70 tests and the showcase passed 25 tests, including three stable-SDK goldens. |
| `pnpm run dart:package` | PASS | The public `entity_graph_flutter` payload passed `flutter pub publish --dry-run` with zero warnings. The private showcase is intentionally excluded with `--no-private`. |
| `pnpm run ci` | PASS | Release validation, lint, type checking, all builds and tests, 90/90 BDD scenarios (428/428 steps), skills/export ledgers, and security completed successfully. |
| `pnpm run security:audit` (through `pnpm run ci`) | PASS | 332 production dependencies; zero high or critical findings, zero blocking advisories, and two visible low findings. |
| `openspec validate v3-flutter-riverpod-a2ui-example --strict` | PASS | OpenSpec change is valid. |
| `git diff --check` | PASS | No whitespace errors. |

The aggregate gate exposed and verified three observed release-gate corrections:

1. Flutter test and package commands now serialize access to the shared Flutter SDK;
   the package gate excludes the private showcase application.
2. The official A2UI processor no longer mutates caller-owned message objects. Its
   focused 14-test suite, packed bridge verifier, visual manifest, and full root gate
   all pass after cloning messages separately for preflight and commit.
3. Release tests and BDD steps now admit the truthful `partial` Flutter coverage state
   without promoting the overall examples ledger beyond `in-progress`.

The three Flutter golden baselines were regenerated on stable 3.44.8, inspected at
original resolution, and then passed again without `--update-goldens`.

## Platform smoke gates

| Platform | Device | Command | Result |
| --- | --- | --- | --- |
| iOS | iPhone 17 simulator, iOS 26.5 | `flutter test integration_test/mobile_smoke_test.dart -d 7F63354E-3475-4158-BB5E-F75D5E7ECFBA` | PASS, 1/1 |
| Android | clean `prometheus_flutter_api35_task5` AVD, AOSP ATD arm64, SDK 35 | `flutter test integration_test/mobile_smoke_test.dart -d emulator-5554` | PASS, 1/1 |

Both device lanes built and installed the application, rendered the normalized graph,
navigated to the A2UI surface, rejected the hostile unknown-component fixture, and
confirmed that the canonical task status remained unchanged.

## Applicability notes

- The Flutter example has no Cargo manifest. Its optional Rust transport demonstration
  is an interface boundary and does not own a native runtime, so no Flutter-specific
  Cargo gate applies. The aggregate root BDD portfolio still exercised the existing
  Tauri stable/MSRV Cargo verifier successfully.
- The full Docusaurus site remains owned by later documentation changes. This task
  verified only the example/release documentation and coverage assertions currently in
  scope; it does not claim the planned site is built or deployed.
- No registry, npm tag, pub.dev package, app-store artifact, or production deployment
  was mutated.
