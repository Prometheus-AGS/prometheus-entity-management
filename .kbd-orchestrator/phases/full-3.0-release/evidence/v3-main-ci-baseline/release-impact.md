# v3-main-ci-baseline downstream release impact

## Baseline established

The 3.0 program now has a deterministic JavaScript foundation:

- one root pnpm workspace and one frozen lockfile;
- no external sibling `link:` or `file:` dependency can make examples pass;
- current Node 22, 24, and 26 lanes run named, bounded gates;
- lint executes real repository files;
- typecheck and builds cover every JavaScript workspace and both current examples;
- test-renderer React versions cannot split the React singleton in clean installs;
- production critical/high advisories fail closed against a checked-in policy;
- compatible-current dependency holds have rationale and a downstream revisit owner; and
- CI, BDD, skills, and coverage ledgers describe the same implemented baseline.

## Defects removed

| Previous defect | Resolution |
| --- | --- |
| Nested example locks/workspace roots | Removed; root pnpm lock is authoritative |
| External entity-sync sibling dependencies | Removed from current examples and workspace manifests |
| Ambiguous/hanging aggregate CI | Seven named gates have finite timeouts and actionable failure output |
| Ineffective lint | ESLint 10 scans packages, examples, scripts, and tests with zero-warning policy |
| Vulnerable npm transitive resolutions | Patched overrides and fail-closed production audit policy |
| Next/Vite clean build configuration drift | Next Turbopack root and Vite native config loader are explicit |
| Clean-install React hook failure | React/A2UI workspaces pin one development renderer and retain compatible v3 peers |

## Blocker routing

| Remaining finding | Owning downstream work |
| --- | --- |
| Packed ESM/CommonJS/types metadata and consumer fixtures | `v3-package-module-contracts` |
| Binding-wide core singleton proof | `v3-framework-neutral-core`, `v3-binding-singleton-contract` |
| External Flint integration skip | `v3-flint-portable-contracts` |
| Flutter formatting, provenance, Riverpod/Freezed upgrade, stable SDK | `v3-flutter-source-provenance`, `v3-dart-graph-riverpod` |
| Rust formatting, clippy, audit policy, Tauri mobile runtime | `v3-tauri-mobile-plugin`, `v3-release-pipeline-rc` |
| Five complete examples and visual evidence | `v3-example-coverage-contract` plus the five dedicated example changes |
| Docusaurus content, branding, accessibility, visual proof, Pages deployment | Six docs changes ending with `v3-docs-github-pages` |
| Immutable SHA, cross-platform/browser certification, recovery rehearsal | `v3-release-certification` |
| npm stable promotion | `v3-stable-publication` with explicit manual authority |

## Promotion consequence

The authoritative disposition remains **release blocked**. The current `3.0.0-alpha.0` manifests are development state. A green main CI baseline is a prerequisite for the remaining work, not evidence that `next` or `latest` should be changed.

Archive must not publish any package, create a GitHub release, deploy Pages, sign a native artifact, or mutate a registry tag.
