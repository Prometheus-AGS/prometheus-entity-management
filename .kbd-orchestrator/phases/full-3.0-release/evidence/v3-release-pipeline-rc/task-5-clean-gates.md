# Task 5 — Clean multi-ecosystem release gates

## Outcome

The recoverable 3.0 RC implementation passes the applicable repository,
package, Dart/Flutter, Rust/Tauri, OpenSpec, security, documentation-contract,
and visual gates without mutating a registry. This is a release-candidate
pipeline receipt, not stable 3.0 certification: coverage remains
`in-progress`, `releaseCertified` remains `false`, and live registry/GitHub
authority is deliberately unproven.

## Reproducible inputs

- Node 24.16.0 and pnpm 10.33.0.
- `pnpm install --frozen-lockfile --prefer-offline` preserved the lock SHA-256
  `c53a72fc54c9419f2d2ca15b187779d0d2a1c8274fca871a82b11a48a6ce42da`.
- Flutter 3.44.8 stable at revision
  `058e0af2c2b57e369d905a03ac9748b0ebf543c6`, with Dart 3.12.2.
- The enforced Dart workspace lock SHA-256 is
  `b1d5f04a06b6cef20b5b0304835a30cc512bf59cd49382b91e6e384f3c650952`.
- Riverpod code generation caused no drift; `providers.g.dart` remained
  `7a1c417c318d59c6180c415c0f50c6948120f53806c969190c421f593ea717a4`.
- Direct Cargo verification used stable Rust 1.97.1; the Tauri host fixture also
  exercised its repository-pinned Rust 1.88.0 toolchain.

The shared Flutter checkout was dirty and on a 3.47 beta. It was not modified.
An isolated worktree at the exact 3.44.8 revision was used instead. The beta
renderer produced a 0.03% golden mismatch (1,522 pixels); that mismatch was
rejected rather than hidden by updating goldens or weakening tolerance.

## Gate matrix

| Gate | Result |
| --- | --- |
| Full `pnpm run ci` | Pass |
| Full Cucumber suite | 83 scenarios, 393 steps, all pass |
| Production dependency audit | 325 dependencies; 0 blocking advisories |
| `verify:release-pipeline` | 16 declared artifacts, 12 packed npm candidates, pass |
| Packed consumer modes | Node ESM, CommonJS, TS NodeNext, Node16, Bundler all pass |
| Workflow contract | actionlint, OIDC/provenance policy, protected RC staging, pass |
| Registry mutation | None |
| Dart frozen bootstrap/generate/format/analyze | Pass; zero generated drift or analysis findings |
| Flutter tests | 70 pass, including both stable golden comparisons |
| Dart export ledger | 81 declarations match |
| Pub dry run from clean staged candidate | Pass; 84 KB archive, 0 warnings |
| Tauri JS/type gates | 16 tests pass; 26 runtime and 57 declaration exports match |
| Tauri host and packed-host gates | Capability allow/deny, packed Rust host, Android/iOS hash receipts pass |
| Direct `cargo +stable test --locked` | 6 pass; one doc test intentionally ignored |
| Strict OpenSpec validation | Pass, no issues |

The Pub dry run was repeated from a detached, disposable clean candidate
snapshot at `98cebad`. That snapshot contains the exact current root Dart
workspace manifests/lock, root release scripts, and Flutter package. This
avoids treating the active implementation worktree's expected uncommitted-file
warning as package validation. No warnings were suppressed.

## Corrections made by the clean run

1. A generated Tauri host bundle was entering authored-source lint. ESLint now
   excludes that one generated fixture, with a regression test.
2. The outer 20-minute CI watchdog leaked into tests that deliberately require
   a 25 ms timeout. Those tests now clear the override locally and still prove
   the real timeout behavior.
3. An older package BDD assertion expected application-owned
   `tauri.conf.json` inside the npm tarball. The validator and BDD contract now
   fail closed on that file while requiring the actual plugin build script.
4. The release-contract BDD ledger was missing the Tauri and recoverable-RC
   gates added by the two latest changes. Its exact-order expectation now
   includes both.
5. Flutter beta dependency and rendering drift was separated from the declared
   stable release floor; the root lock was regenerated and enforced only with
   Flutter 3.44.8.

These were genuine failures. None were waived, marked flaky, or converted into
release claims.

## Visual inspection

The regenerated release certificate is legible at 1600×1000, retains clear
Prometheus hierarchy/contrast, shows all 16 artifacts and 12 packed npm
consumers, protects `latest`, names the native dispositions, and visibly states
`NO REGISTRY MUTATION`. Its SVG SHA-256 is
`d69bb3c9c73523eeedabfd3cba086b2d2e542dd2b6efe309eaaa23c7e0cc9a4b`.

The stable Flutter initial and optimistic states were also inspected. The list
and detail views remain coherent, and the optimistic state is visibly applied
across both views. Their SHA-256 values are respectively
`cf8cafe9e6ef51f7138f74f73ae732d7286d695b9c3bad1afb46a8730f648e3a`
and `e1e6ea7a4e4f4fe9339111f2a4ec1a1bbe9d81ca3c3a993b60bf58cb8ca8aac3`.
Eight beta failure images are preserved under `task-5-beta-flutter-failures/`
as diagnostic evidence.

## Explicit limits

This receipt does not prove npm trusted-publisher configuration, Pub.dev or
crates.io ownership, GitHub environment reviewers, secrets, live RC staging,
stable tag promotion, or stable publication. It also does not promote the
coverage ledger beyond `in-progress`. Those external and final-certification
boundaries remain owned by downstream changes and task 6 evidence
reconciliation.

