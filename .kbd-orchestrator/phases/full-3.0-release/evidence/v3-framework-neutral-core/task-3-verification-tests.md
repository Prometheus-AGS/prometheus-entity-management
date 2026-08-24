# Task 3 — Framework-neutral core verification tests

## Acceptance coverage

| Acceptance criterion | Executable evidence |
|---|---|
| Packed core dependency graph and declarations contain no React runtime/types | `scripts/verify-framework-neutral-core.mjs` packs core, installs it in a temporary consumer, inspects ESM/CJS and `.d.ts`/`.d.cts`, traverses the pnpm dependency graph, and fails if React, React DOM, or their type packages resolve. |
| Non-React fixtures can create and share one graph | The packed fixture has separate writer/reader modules for ESM and CommonJS, verifies the default singleton and deprecated alias identity, tests selector subscriptions, and proves two factory-created graphs remain isolated. |
| React compatibility tests remain green | `packages/entity-graph-react/src/graph-store.test.tsx` proves React hook updates from core singleton writes, attached StoreApi methods, and sync-status subscriptions. The complete React package suite passes. |

## BDD certification

- Feature: `tests/features/release/v3-framework-neutral-core.feature`
- Steps: `tests/steps/v3-framework-neutral-core.steps.ts`
- Command: `pnpm run bdd:framework-neutral-core`
- Result: 3 scenarios passed, 15 steps passed, 2 hooks passed.

## Fail-closed guard tests

`pnpm run test:framework-neutral-core` passed 4 tests that inject and reject:

- a React manifest dependency;
- a resolved `@types/react` dependency;
- an ESM React runtime import;
- a React declaration import;
- a `React.ComponentType` declaration leak.

## Packed consumer report

Machine-readable evidence: `framework-neutral-core-report.json` in this evidence directory.

`pnpm run verify:framework-neutral-core -- --report <path>` passed and certified:

- packed-tarball-only installation;
- no resolved React packages;
- no runtime React imports;
- no declaration React types;
- ESM shared graph;
- CommonJS shared graph;
- isolated graph factories;
- TypeScript consumption with `types: []`.

## Regression evidence

- Core typecheck passed.
- Core suite: 25 files passed; 172 tests passed, with 1 existing skip and 1 existing todo.
- React typecheck passed.
- React suite: 7 files and 49 tests passed.
- Targeted ESLint passed with zero warnings.
- `git diff --check` passed.

## Visual evidence applicability

This change modifies a headless package boundary and has no rendered UI state. Visual screenshots cannot prove dependency resolution or declaration purity, so executable tarball, consumer, BDD, and React-render-hook evidence are the truthful certification media for this slice. Visual evidence remains mandatory for the later showcase and Docusaurus changes where a rendered surface exists.
