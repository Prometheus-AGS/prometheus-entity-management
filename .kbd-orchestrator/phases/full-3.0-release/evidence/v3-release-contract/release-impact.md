# v3-release-contract downstream release impact

## Contract established

The 3.0 program now has one enforceable inventory and policy boundary:

- 12 fixed-version public npm packages;
- one Dart package and three Rust crates included in source/certification scope;
- npm, GitHub Releases, and GitHub Pages required for stable release;
- native registries and application stores deferred until ownership/signing gates pass;
- explicit stability labels for A2UI, AG-UI, and Flutter genui;
- fixed compatibility ranges and graph-singleton/request-isolation rules;
- immutable-SHA certification, explicit npm `latest` approval, and non-destructive recovery policy.

## Blocker routing

| Finding | Owning downstream work |
| --- | --- |
| Frozen build/typecheck defect and ineffective lint | `v3-main-ci-baseline` |
| npm module and packed-consumer matrices | `v3-package-module-contracts`, `v3-binding-singleton-contract` |
| Missing entity-sync package path | `v3-sync-persistence-path`, Vite and Next.js example changes |
| Flint live integration skip | `v3-flint-portable-contracts` |
| Flutter provenance, formatting, dependencies, stable SDK | `v3-flutter-source-provenance`, `v3-dart-graph-riverpod` |
| Tauri formatting, Clippy, RustSec, mobile execution | `v3-tauri-mobile-plugin`, `v3-tauri-universal-example` |
| Five planned showcase applications and visual proof | Their five dedicated example changes plus `v3-example-coverage-contract` |
| Branded Docusaurus product and Pages deployment | Six documentation changes ending in `v3-docs-github-pages` |
| Security/provenance/platform matrix and immutable evidence | `v3-release-pipeline-rc`, `v3-release-certification` |
| npm stable promotion | `v3-stable-publication`, with explicit manual authority |

## Promotion consequence

The authoritative disposition is **release blocked**. The existing `3.0.0-alpha.0` manifests may continue as development state, but neither `next` nor `latest` should be treated as certified until the downstream gates resolve and one immutable SHA is proven.
