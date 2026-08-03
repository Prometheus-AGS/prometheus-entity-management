# Task 5 — clean-state gate evidence

Date: 2026-08-01  
Change: `v3-binding-singleton-contract`

## Outcome

**PASS after one cross-feature gate correction.** The first independent source-only copy passed install, lint, typecheck, build, package tests, and the singleton-specific tests, then the complete BDD suite caught two stale integration assertions: the archived framework-neutral scenario still said singleton certification was unimplemented, and release-contract BDD hard-coded the previous three-gate ledger. Both assertions were corrected without weakening release limits. A second new source-only copy passed the complete CI chain, independent packed singleton and package-contract verifiers, Changesets stable-version calculation, and strict OpenSpec validation.

Machine-readable results are in [`clean-gates.json`](clean-gates.json). The final isolated singleton report is [`clean-binding-singletons-report.json`](clean-binding-singletons-report.json).

## Clean-room protocol

- Created a new source-only copy of the current worktree for each complete CI attempt.
- Excluded `.git`, dependencies, JavaScript/native output, caches, coverage, and tarballs.
- Used Node 26.5.0 and pnpm 10.33.0 on Darwin 25.6.0 arm64.
- Verified lockfile SHA-256 `5f09387a332476c5d055c83f6e68b337c0f1bb3ca809fb98a7032a7d73b38836`.
- Installed 774 packages with `pnpm install --frozen-lockfile --prefer-offline`.
- Ran the complete `pnpm run ci` chain from the second clean copy.
- Reran `verify:binding-singletons` and `verify:package-contracts` independently after CI.
- Created a throwaway local `main` commit only after all clean gates so Changesets could calculate pending releases despite the intentionally excluded repository history.

The original worktree remains intentionally dirty at HEAD `dd5d70c9954381d3af4519ccedeb5cb565d6027e`. This certifies current source content, not an immutable commit, registry artifact, RC, or npm tag.

## Complete JavaScript gate

| Gate | Result |
| --- | --- |
| Frozen pnpm install | Pass; 774 packages |
| Release-contract validation | Pass; zero errors |
| ESLint | Pass with zero warnings |
| Typecheck | Pass; 17/17 tasks |
| Build | Pass; 14/14 tasks, including Vite and Next.js production builds |
| Workspace package tests | Pass; 365 tests, one explicit Flint skip, one benchmark todo |
| Release-contract tests | Pass; 13/13, including singleton ledger drift |
| CI-baseline tests | Pass; 17/17 |
| Package-contract tests | Pass; 8/8 |
| Framework-neutral guards | Pass; 4/4 |
| Binding-singleton guards | Pass; 5/5 |
| Complete BDD | Pass; 24/24 scenarios and 127/127 steps |
| Skills/export ledger | Pass; 201/201 runtime exports |
| Production security | Pass; zero moderate/high/critical and no accepted blocker |

## Independent packed proofs

The singleton verifier rebuilt and packed the candidates after CI, installed an isolated strict-peer consumer, and proved:

- React, Svelte, Solid, Web Components, Alpine, and HTMX omit a production core copy and expose a compatible required peer;
- the application and all six bindings resolve the same physical `core-instance-1`;
- each public binding observes writes through the shared normalized graph;
- a supplied core `4.0.0` fails strict peer installation with package and peer context;
- no workspace protocol, local path, registry mutation, browser/device claim, or transient filesystem path leaks into the report.

The package verifier independently passed all twelve tarballs through Publint 0.3.22, Are The Types Wrong 0.18.5, payload/manifest checks, Node ESM/CommonJS, and TypeScript NodeNext/Node16/Bundler consumers.

Changesets calculated exactly twelve fixed npm candidates from `3.0.0-alpha.0` to stable `3.0.0`; both private examples remained `none` at `0.1.0`. No version file or registry was mutated.

## OpenSpec, docs, security, and platform applicability

- Strict OpenSpec validation passed for the active change and its promoted framework-neutral/package-contract prerequisites.
- Documentation and skills are executable through full BDD, release validation, relative-path assertions, and the 201-export ledger.
- The clean production audit covered 309 dependencies: one low, zero moderate/high/critical, zero blockers, and zero accepted blocking exceptions.
- Dart/Melos is not applicable because no Dart/Flutter source, manifest, generated output, lockfile, or package boundary belongs to this six-JavaScript-binding change.
- Cargo is not applicable because no Rust source, Cargo manifest, capability, or native package boundary belongs to this change. The JavaScript Tauri package is outside the six certified fixtures and remains owned by `v3-tauri-mobile-plugin`.
- A Docusaurus build is not applicable because the planned website does not exist yet.
- Browser/device runners and screenshots are not applicable to this headless topology change. That is not a waiver: later rendered examples and the Docusaurus site must provide real visual, accessibility, browser, desktop, and mobile evidence.

## Known non-blocking output

The clean run retains one explicit external Flint skip and one benchmark todo. It also reports existing Next.js migration messages, a Vite chunk-size warning, Turbo output-declaration warnings, and selected Vitest native-loader warnings. None are used as singleton evidence, and each remains assigned to its existing plan owner.

## Release impact

The six stable JavaScript binding singleton acceptance criterion is clean-room green. Native singleton/platform work, five showcases, visual certification, Docusaurus/Pages, RC/provenance/recovery, immutable-SHA certification, registry authority, and stable publication remain open. Nothing in this task authorizes npm publication or movement of `latest`.
