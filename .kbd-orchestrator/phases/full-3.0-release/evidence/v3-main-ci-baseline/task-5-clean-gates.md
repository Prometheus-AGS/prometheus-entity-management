# Task 5 — Clean-state gate evidence

Date: 2026-08-01  
Change: `v3-main-ci-baseline`

## Outcome

The JavaScript baseline passes from independent clean source copies on every supported Node line. The package inventory and strict OpenSpec validation also pass. Native smoke checks expose real follow-on work and are recorded below without changing this change's claim: this baseline certifies the current JavaScript CI workflow, not full 3.0 native or publication readiness.

Machine-readable results are in [`clean-gates.json`](clean-gates.json).

## Clean-room protocol

- Each Node lane used a new source-only copy that excluded `.git`, `node_modules`, build output, caches, coverage, native targets, and tarballs.
- Each lane ran on Ubuntu 24.04 ARM64 with glibc 2.39, pnpm 10.33.0, and an exact current Node release.
- The pnpm content-addressed store was shared after the first lane, but every workspace `node_modules` tree and all build/test output were new.
- Every lane ran `pnpm install --frozen-lockfile` followed by the complete named `pnpm run ci` chain.
- The verified lockfile SHA-256 is `630603fe57777ab44f6f25fff6ea8c317dbc2c6173bd5aac00c89377d6bc46aa`.

The first cold install found a genuine React singleton defect: the React package resolved React 19.2.4 while the root test renderer used React 19.2.8, causing all Entity Explorer hook tests to fail. The React and A2UI packages now pin the exact development renderer while preserving the compatible `>=19 <20` peer range. A regression test enforces that policy. Focused warm tests then passed, and all three new clean lanes independently confirmed the fix.

Two discarded harness attempts are not counted as product failures:

- Debian Bookworm ARM64 could not load the selected `better-sqlite3` prebuild because it provides glibc 2.36 and the binary requires 2.38. Ubuntu 24.04 matches the workflow's OS family and provides glibc 2.39.
- The standalone pnpm executable does not bundle `node-gyp`; the final harness installed `node-gyp@11.5.0` globally through pnpm before the frozen workspace install, matching the capability supplied by the workflow's pnpm setup.

## JavaScript matrix

| Lane | Frozen install | Complete CI |
| --- | --- | --- |
| Node 22.23.2 | Pass | Pass |
| Node 24.18.1 | Pass | Pass |
| Node 26.5.1 | Pass | Pass |

Each lane completed:

- 17 typecheck tasks and 14 build tasks;
- 362 passing package tests, with one explicitly skipped external Flint integration and one benchmark todo;
- 10/10 release-contract tests;
- 17/17 CI-baseline tests;
- 10/10 Cucumber scenarios and 57/57 steps;
- 197/197 runtime exports matched to the skill ledger; and
- a 309-production-dependency audit with zero critical/high/moderate findings, one low finding, and no accepted blocking exception.

The skip is not silently treated as stable Flint evidence. `v3-flint-portable-contracts` owns the portable in-repository replacement. Packed-consumer, showcase, native, docs, and immutable-SHA certification remain separately owned.

## Package and specification checks

| Check | Result |
| --- | --- |
| `pnpm --filter './packages/**' pack --recursive --dry-run --json` | Pass; all 12 public npm packages enumerated |
| `openspec validate v3-main-ci-baseline --strict` | Pass |
| `git diff --check` | Pass |
| Changed release JSON parses | Pass |

The dry run proves package selection and manifest file inventory only. Import/require, declaration-resolution, Publint, and Are The Types Wrong certification remain owned by `v3-package-module-contracts`.

## Flutter smoke result

Environment: Flutter 3.47.0-0.1.pre, Dart 3.12.2, macOS ARM64.

| Check | Result |
| --- | --- |
| `flutter pub get` | Pass |
| `dart format --output=none --set-exit-if-changed lib test` | Fail; six files would change |
| `flutter analyze` | Pass; no issues |
| `flutter test` | Pass; 54 tests |
| production `flutter pub outdated` | Debt recorded |

Riverpod, Riverpod annotations, and Freezed annotations are constrained below resolvable current majors; three direct dependencies also have lockfile upgrades, and `build_resolvers` plus `build_runner_core` are discontinued transitives. `v3-flutter-source-provenance` and `v3-dart-graph-riverpod` own the upgrade and generated-source decisions.

## Rust and platform smoke result

Environment: cargo/rustc 1.99.0-nightly, macOS ARM64.

| Crate | Format | Locked tests | Clippy `-D warnings` | RustSec |
| --- | --- | --- | --- | --- |
| CLI | Fail | 24 pass | Pass | Fail: `RUSTSEC-2026-0204`; `RUSTSEC-2026-0190` warning |
| MCP | Pass | 26 pass across lib/bin | Pass | Fail: `RUSTSEC-2026-0190` warning |
| Tauri plugin | Fail | 6 pass | Fail: `new_ret_no_self` | Fail: two high `quick-xml` advisories plus 16 warnings |

The Tauri plugin additionally passes clean `cargo check --locked` compilation for both `aarch64-apple-ios` and `aarch64-linux-android`. These checks prove source-level mobile target compatibility, not simulator/device execution or signed application packaging.

The native findings block full release certification. They do not contradict the current-main JavaScript CI acceptance criterion because native lanes are not in `.github/workflows/ci.yml`; they are carried forward to `v3-package-module-contracts`, `v3-tauri-mobile-plugin`, and `v3-release-pipeline-rc`.

## Release impact and limits

- The current-main JavaScript CI baseline is green and reproducible.
- The local branch is dirty and its HEAD (`dd5d70c9`) differs from `origin/main` (`7f982fcc`), so this is content verification, not immutable-commit certification.
- Full 3.0 release certification remains blocked by the remaining 26 planned changes, including native debt, packed consumers, examples, docs deployment, release-candidate rehearsal, and stable-publication authority.
- Nothing in this evidence authorizes publishing packages or moving npm `latest`.
