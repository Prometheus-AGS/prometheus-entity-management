# Task 5 — Clean release-candidate gates

## Outcome

The Dart/Riverpod library passed the applicable release gates from a clean,
history-preserving candidate at commit
`9c341c22c158e3c685860ab3b60e649d29367f87`. The input candidate had no
tracked or untracked changes. Gate execution changed ten tracked files only
because repository tests regenerate evidence receipts for earlier changes;
the two task-5 reports were newly generated. A post-run path audit found no
source, package, lockfile, documentation, or contract drift, and
`git diff --check` passed.

## Certified toolchain and dependency correction

The candidate used the official macOS arm64 Flutter 3.44.8 stable archive
(revision `058e0af2c2b57e369d905a03ac9748b0ebf543c6`, Dart 3.12.2). Its downloaded
archive matched SHA-256
`c3d6fe95078f7001d947a31d42527de91d5bfe62e4cf444a1493a2e8f1fb199d`.
Node 24.16.0 and pnpm 10.33.0 matched the repository CI baseline.

The initially proposed newest Riverpod packages were not a valid stable-floor
combination. Flutter 3.44.8 pins analyzer/meta/test constraints that conflict
with `flutter_riverpod` 3.4.2, `riverpod_annotation` 4.0.6,
`riverpod_generator` 4.0.8, and `build_runner` 2.16.0. The resolved contract is:

- `flutter_riverpod >=3.3.2 <3.4.0`
- `riverpod_annotation >=4.0.3 <4.0.5`
- `riverpod_generator 4.0.4`
- `build_runner 2.15.1`

This is the newest tested line that resolves on the declared Flutter 3.44
stable floor. The Dart workspace uses one root `pubspec.lock`; the obsolete
package-local lock is intentionally absent.

## Gate matrix

| Gate | Result |
| --- | --- |
| `pnpm install --frozen-lockfile` | Pass |
| `pnpm run dart:bootstrap:frozen` | Pass on Flutter 3.44.8 stable |
| `pnpm run dart:generate` and tracked-diff check | Pass; deterministic output |
| `pnpm run dart:format` | Pass; no changes |
| `pnpm run dart:analyze` | Pass; no issues |
| `pnpm run dart:ci` | Pass; generation, formatting, analysis, and 70 Flutter tests |
| `pnpm run dart:examples` | Pass; no standalone Dart example packages yet |
| `pnpm run dart:package` | Pass; Pub dry run, zero warnings, 84 KB archive |
| root validate, lint, typecheck, build | Pass |
| root test, skills, production security | Pass; 325 dependencies, zero blocking vulnerabilities |
| `pnpm run bdd` | Pass; 68 scenarios and 335 steps |
| `pnpm run test:dart-graph-riverpod` | Pass; 4 of 4 permanent release tests |
| tagged `@v3-dart-graph-riverpod` Cucumber | Pass; 7 scenarios and 22 steps |
| strict OpenSpec validation | Pass |
| Cargo/native platform gate | Not applicable; no Cargo manifest or native runtime dependency is in this change |

The first repository test pass saw the timing benchmark exceed 50 ms while
other suites were competing for CPU. The same benchmark then passed three
isolated repetitions at 3 ms, its 10,000-entity case passed at 15–16 ms, and
the complete CI test gate passed on rerun. This is recorded as a contention
flake, not hidden as an implementation failure.

## Platform and visual receipt

The Flutter widget harness was visually inspected on the stable SDK. The
stable images differ from the earlier beta-rendered images only at rounded
border anti-aliasing pixels; content, layout, and optimistic cross-view state
are unchanged. The accepted receipts are:

- initial: `cf8cafe9e6ef51f7138f74f73ae732d7286d695b9c3bad1afb46a8730f648e3a`
- optimistic: `e1e6ea7a4e4f4fe9339111f2a4ec1a1bbe9d81ca3c3a993b60bf58cb8ca8aac3`

## Explicit limits

This task certifies the Dart library and host widget harness. It does not
certify an Android or iOS application, physical devices, accessibility, a
complete Flutter/A2UI showcase, Pub.dev account ownership, credentials, or
publication. The live Flint compatibility check also remains skipped when its
external `@prometheusags/frf-sdk` dependency is unavailable. Those boundaries
remain visible for downstream example, platform, certification, and stable
publication changes.

Firecrawl was not available in this environment. Dependency and toolchain
claims were instead checked against the official Flutter archive/install
documentation, Dart pub-workspace documentation, and registry metadata.

## Receipts

- `task-5-clean-dart-report.json` — SHA-256 `4b37d80ae377ebad1b971f1d9c813e0c7c04ef876f75328c5e103289ed3a944e`
- `task-5-cucumber.json` — SHA-256 `1ad2416a86187f7268b1351593d5031603cf66805bd5a1cdce727645e56b3157`
- `task-5-clean-gates.json` — machine-readable gate and environment summary

Task 6 still owns final evidence reconciliation, unresolved-limit/release
impact reporting, and archive readiness. This task does not claim publication
or archive completion.
