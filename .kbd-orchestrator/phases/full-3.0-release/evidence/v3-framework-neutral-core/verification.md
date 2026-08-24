# v3-framework-neutral-core verification

Date: 2026-08-01  
Change: `v3-framework-neutral-core`

## Verdict

**OpenSpec change:** strictly verified and archived on 2026-08-01; promoted spec validates.  
**Prometheus Entity Management 3.0 release:** blocked; this change certifies the framework-neutral core boundary and React compatibility only.

Every plan acceptance criterion has direct, reproducible evidence from a source-only clean room and a packed-tarball-only consumer. The authoritative machine reports are [`clean-gates.json`](clean-gates.json) and [`clean-framework-neutral-core-report.json`](clean-framework-neutral-core-report.json).

## Acceptance audit

| Plan requirement | Authoritative evidence | Verdict |
| --- | --- | --- |
| Packed core dependency graph and declarations contain no React runtime or types | The dedicated verifier packs core, installs only its tarball and TypeScript in an isolated consumer, traverses the resolved dependency graph, scans ESM/CommonJS runtime imports, scans `.d.ts`/`.d.cts`, and compiles with `types: []` | Pass |
| Non-React fixtures can create and share one graph | Separate ESM and CommonJS writer/reader modules observe the same default `graphStore`; factory-created stores remain isolated and selector subscriptions fire with vanilla Zustand semantics | Pass |
| React compatibility tests remain green | `graph-store.test.tsx` proves hook updates from core singleton writes, attached StoreApi methods, and vanilla sync-status observation; the complete React package suite passes 49/49 tests | Pass |

## Implementation and invariant audit

| Contract | Result |
| --- | --- |
| Core store construction | `createGraphStore()` uses `createStore` from `zustand/vanilla`; `graphStore` is the default imperative singleton |
| Core compatibility boundary | Deprecated core `useGraphStore` is a StoreApi alias, not a React hook; migration guidance names the replacement |
| React binding ownership | `@prometheus-ags/entity-graph-react` owns callable `useGraphStore` and `useGraphSyncStatus` hooks over the core singleton |
| React-only public types | Action, renderer, empty-state, gallery, and batch-action React types moved to the React package |
| Normalized graph | Canonical entities remain stored once; patches remain separate; lists remain ordered ID arrays rather than entity copies |
| I/O layering | No component, hook, store, adapter, API, or realtime ownership rule changed |
| Package management | Frozen installation and all verification use pnpm |
| Public ledgers | Coverage, React runtime export ledger, package docs, migration docs, release docs, and skills are synchronized at 201 runtime exports |

## Verification matrix

| Surface | Result |
| --- | --- |
| Fresh frozen pnpm install | Pass |
| Complete JavaScript CI | Pass |
| Typecheck/build | 17/17 and 14/14 tasks |
| Workspace package tests | 365 pass; one explicit external Flint skip and one benchmark todo |
| Release/CI/package/framework guard tests | 12/12, 17/17, 8/8, and 4/4 |
| Complete BDD | 19/19 scenarios, 102/102 steps |
| Focused framework-neutral BDD | 4/4 scenarios, 21/21 steps |
| React compatibility suite | 7/7 files, 49/49 tests |
| Skills-to-runtime ledger | 201/201 exports |
| Production npm audit policy | 309 dependencies; one low; zero moderate/high/critical; zero accepted blocker |
| Packed package regression | Publint and ATTW pass for all 12 public packages; tarball-only ESM/CommonJS/types consumers pass |
| OpenSpec prerequisites and active change | Strict validation passes |
| Integrity | Referenced JSON parses and `git diff --check` passes |

## Evidence-driven correction

The first clean source copy passed the configured gates but exposed a governance gap: the new fail-closed framework-neutral mutation suite was callable directly yet absent from the root `test` chain. The root chain was corrected, and a second independent source-only copy passed the frozen install, full `pnpm run ci`, the dedicated packed-core verifier, and strict OpenSpec validation. This preserves the red-to-green integration correction rather than treating an optional script as mandatory CI evidence.

## Unresolved platform and manual limits

- Evidence covers dirty-worktree content at local HEAD `dd5d70c9954381d3af4519ccedeb5cb565d6027e`; it is not immutable-commit, RC, provenance, or registry certification.
- This change proves one core singleton within the packed core package and its React facade. It does not prove that every installed framework binding resolves exactly one compatible core instance; `v3-binding-singleton-contract` owns that next gate.
- The absolute-path Flint live integration remains explicitly skipped and is not release evidence; `v3-flint-portable-contracts` owns portability and deterministic fixtures.
- One benchmark remains todo. Existing Next deprecation output, Vite chunk warning, Turbo output warnings, and selected Vitest native-loader warnings remain visible and assigned to later owners.
- Dart/Melos, Cargo, and device runners are not applicable because this change modifies no Dart/Flutter, Rust/Tauri, capability, generated, or native platform boundary.
- No rendered interface changed. Screenshots cannot establish declaration or dependency purity, so packed consumers, dependency reports, render-hook tests, and BDD are the truthful evidence. Visual evidence remains mandatory for the five showcase and Docusaurus changes.
- No registry, npm dist-tag, publication, GitHub release, Pages deployment, signing, or provenance operation was attempted or authorized.

## Release impact

The core package can now support non-React consumers without resolving React runtime or declaration dependencies, while the React package preserves the established hook names. This removes one high-severity release blocker and supplies the prerequisite for singleton-policy, non-React binding, sync, A2UI/A2A, example, skills, documentation, and release-certification work. The promoted contract is `openspec/specs/v3-framework-neutral-core/spec.md`; it does not make the overall 3.0 release publishable.
