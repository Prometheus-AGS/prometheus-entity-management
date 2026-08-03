# v3-framework-neutral-core downstream release impact

## Boundary established

The 3.0 package split now has an executable framework boundary:

- `@prometheus-ags/entity-graph-core` constructs stores with `zustand/vanilla`;
- `createGraphStore()` creates isolated graphs for SSR requests, tests, and independent runtimes;
- `graphStore` is the default imperative singleton for shared non-React consumers;
- core sync status has imperative and vanilla-store access;
- React hooks and React renderer/component types live in `@prometheus-ags/entity-graph-react`; and
- a packed core tarball installs and typechecks without React, React DOM, or React type packages.

## Compatibility and migration consequence

React applications retain callable `useGraphStore` and `useGraphSyncStatus` exports from the React package. Core consumers should migrate the deprecated StoreApi alias `useGraphStore` to `graphStore`; request-isolated runtimes should use `createGraphStore()` instead of mutating the process singleton. The compatibility alias is intentionally narrow and does not pretend to be a hook.

This changes public exports and declaration ownership, so the coverage ledger, 201-export React compatibility ledger, skills, package READMEs, release guide, and migration guide were synchronized and are executable in CI.

## Defects removed

| Previous defect | Resolution |
| --- | --- |
| Core runtime imported React-facing Zustand | Core uses `zustand/vanilla` StoreApi construction |
| Core declarations exposed React UI types | React renderer, component, action, empty-state, and gallery types moved to the React package |
| Framework-neutrality relied on source inspection | Packed-tarball dependency, runtime, declaration, singleton, factory, subscription, and TypeScript consumers fail closed |
| React compatibility was assumed | React render-hook tests observe writes through the same core singleton and sync-status store |
| New guard could be bypassed by aggregate CI | Fail-closed mutation tests are included in the root `test` chain |

## Blocker routing

| Remaining finding | Owning downstream work |
| --- | --- |
| One compatible installed core instance across every framework binding | `v3-binding-singleton-contract` |
| Portable Flint authentication/realtime evidence | `v3-flint-portable-contracts` |
| Flutter provenance and framework-neutral Riverpod package | `v3-flutter-source-provenance`, `v3-dart-graph-riverpod` |
| Tauri desktop/mobile runtime and device evidence | `v3-tauri-mobile-plugin`, `v3-tauri-universal-example` |
| Five complete feature showcases and visual evidence | `v3-example-coverage-contract` plus the five dedicated example changes |
| Prometheus Docusaurus product and GitHub Pages deployment | Six docs changes ending with `v3-docs-github-pages` |
| Immutable, cross-platform, packed-ecosystem certification | `v3-release-certification` |
| npm 3.0.0 publication and `latest` promotion | `v3-stable-publication` with explicit manual authority |

## Promotion consequence

The authoritative disposition remains **release blocked**. This change removes the React dependency from the core contract; it does not certify all bindings, examples, native platforms, documentation, provenance, or stable artifacts.

Archive must not publish a package, mutate an npm dist-tag, create a GitHub release, deploy GitHub Pages, sign a native artifact, or represent local dirty-worktree evidence as immutable release certification.

