# Task 5 — Clean-state gate evidence

Date: 2026-08-01  
Change: `v3-framework-neutral-core`

## Outcome

**PASS after one gate-integration correction.** The first source-only clean room passed every configured gate but exposed that the new fail-closed framework validator was only available as a script, not included in the root `test` chain. The root chain was corrected, then a second independent source-only copy passed the frozen install, complete CI, dedicated packed-core verifier, and strict OpenSpec validation.

Machine-readable results are in [`clean-gates.json`](clean-gates.json). The final artifact report is [`clean-framework-neutral-core-report.json`](clean-framework-neutral-core-report.json).

## Clean-room protocol

- Created a new source-only copy of the current worktree.
- Excluded `.git`, all dependency trees, JavaScript/native build outputs, caches, coverage, and tarballs.
- Used Node 24.16.0 and pnpm 10.33.0 on Darwin 25.6.0 arm64.
- Verified lockfile SHA-256 `ad8d1a9cde243830542eabdc1577d4e76b095d5048f0edee4128de61a6f54af9`.
- Ran `pnpm install --frozen-lockfile` followed by the complete `pnpm run ci` chain.
- Reran `pnpm run verify:framework-neutral-core` after CI inside the same clean room.
- Strictly validated the active OpenSpec change and both promoted dependency specs.

The worktree is intentionally dirty and HEAD is `dd5d70c9954381d3af4519ccedeb5cb565d6027e`. This certifies current source content, not an immutable commit, registry artifact, RC, or npm tag.

## Complete JavaScript gate

| Gate | Result |
|---|---|
| Frozen pnpm install | Pass; 774 packages from the checked-in lockfile |
| Release-contract validation | Pass; zero errors |
| ESLint | Pass with zero warnings |
| Typecheck | Pass; 17/17 tasks |
| Build | Pass; 14/14 tasks, including Vite and Next.js production builds |
| Workspace package tests | Pass; 365 tests, one explicit Flint skip, one benchmark todo |
| Release-contract tests | Pass; 12/12 |
| CI-baseline tests | Pass; 17/17 |
| Package-contract tests | Pass; 8/8 |
| Framework-neutral fail-closed tests | Pass; 4/4 and now mandatory in root CI |
| Complete BDD | Pass; 19/19 scenarios and 102/102 steps |
| Skills/export ledger | Pass; 201/201 runtime exports |
| Production security | Pass; zero moderate/high/critical and no accepted blocker |

The complete BDD run also invoked the twelve-package tarball verifier: all twelve candidates passed strict Publint and Are The Types Wrong, Node ESM/CommonJS, TypeScript NodeNext/Node16/Bundler, payload, and tarball-only candidate-set checks.

## Dedicated framework-neutral proof

The final clean room independently rebuilt and packed core, then proved:

- no React or React DOM manifest/runtime dependency;
- no resolved React or React type package;
- no React import in ESM or CommonJS;
- no React type dependency in `.d.ts` or `.d.cts`;
- shared singleton behavior in separate ESM and CommonJS writer/reader modules;
- isolation between `createGraphStore()` instances;
- selector subscription behavior;
- TypeScript compilation with `types: []`.

## OpenSpec

| Item | Strict result |
|---|---|
| `v3-framework-neutral-core` change | Pass, no issues |
| `v3-release-contract` promoted spec | Pass; two informational long-requirement suggestions, no errors/warnings |
| `v3-package-module-contracts` promoted spec | Pass, no issues |

## Applicable and non-applicable lanes

- Documentation and skills were applicable and are executable through release validation, export-ledger verification, and BDD traceability.
- Security was applicable because the dependency graph is part of the installable boundary; the production audit passed with one visible low advisory and no blocker.
- Dart/Melos is not applicable: no Dart/Flutter source, manifest, generated file, lockfile, or package boundary changed.
- Cargo and device runners are not applicable: no Rust/Tauri source, manifest, capabilities, or platform behavior changed.
- A Docusaurus build is not applicable because this change does not create the planned site; that remains owned by the documentation changes.
- No rendered UI changed, so screenshots would be decorative rather than evidence. The truthful visual-equivalent evidence is the machine-readable dependency graph, packed report, React render-hook test, and BDD behavior. Later showcase/site changes remain subject to screenshot and browser E2E certification.

## Explicit limits

The existing absolute-path Flint integration remains explicitly skipped and cannot be used as release evidence; `v3-flint-portable-contracts` owns that gap. Existing example deprecation messages, Vite chunk warning, Turbo output warnings, and selected Vitest native-loader warnings remain visible and assigned to their existing owners.

This task certifies the framework-neutral core change only. It does not prove one installed core singleton across every binding, authorize stable publication, or move npm `latest`.
